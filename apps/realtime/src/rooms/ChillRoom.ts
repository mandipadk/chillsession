import { Room, type Client } from "@colyseus/core";
import { nanoid } from "nanoid";
import {
  WORLD_CONFIG,
  type AvatarState,
  type ChatMessage,
  type ClientMessageMap,
  type MoveInput,
  type MusicQueueItem,
  type PlaybackState,
  type Role
} from "@chillspace/protocol";
import { assertControlRole, createMusicProviders, reducePlayback } from "@chillspace/music";
import { createGameTables } from "../game/createTables";
import { activeRoomRegistry } from "../state/registry";
import { realtimeConfig } from "../config";
import { verifySessionToken } from "../utils/auth";
import { cleanText } from "../utils/filter";
import { loadRoomSnapshot, saveRoomSnapshot } from "../persistence/snapshot";

interface AuthContext {
  userId: string;
  userName: string;
  avatarColor: string;
  role: Role;
  roomId: string;
}

interface PlayerRuntime {
  avatar: AvatarState;
  input: MoveInput;
  clientId: string;
  muted: boolean;
  banned: boolean;
}

export class ChillRoom extends Room {
  private roomLabel = "Chill Room";
  private publicRoomId = "";
  private players = new Map<string, PlayerRuntime>();
  private clientToUser = new Map<string, string>();
  private chatLog: ChatMessage[] = [];
  private queue: MusicQueueItem[] = [];
  private playback: PlaybackState = {
    source: "licensed",
    itemId: "https://stream.lofi.radio/default.mp3",
    positionMs: 0,
    isPlaying: false,
    startedAtEpochMs: Date.now(),
    controllerRole: "host"
  };
  private roomLocked = false;
  private bannedUsers = new Set<string>();
  private gameTables = createGameTables();
  private persistTimer: ReturnType<typeof setTimeout> | null = null;
  private providers = createMusicProviders({
    licensedEnabled: true,
    spotifyEnabled: process.env.SPOTIFY_PROVIDER_ENABLED !== "false",
    youtubeEnabled: process.env.YOUTUBE_PROVIDER_ENABLED !== "false"
  });

  async onAuth(client: Client, options: { token?: string }): Promise<AuthContext> {
    const token = options.token;
    if (!token) {
      throw new Error("Missing auth token");
    }

    const claims = verifySessionToken(token, realtimeConfig.sessionJwtSecret);
    if (this.publicRoomId && this.publicRoomId !== claims.roomId) {
      throw new Error("Session room mismatch");
    }

    return {
      userId: claims.sub,
      userName: claims.userName,
      avatarColor: claims.avatarColor,
      role: claims.role,
      roomId: claims.roomId
    };
  }

  async onCreate(options: { roomName?: string; roomId?: string }): Promise<void> {
    if (options.roomName) {
      this.roomLabel = options.roomName;
    }

    this.publicRoomId = options.roomId ?? this.roomId;

    const snapshot = await loadRoomSnapshot(this.publicRoomId);
    if (snapshot) {
      this.roomLabel = snapshot.roomName || this.roomLabel;
      this.chatLog = snapshot.chat.slice(-WORLD_CONFIG.roomChatLimit);
      this.queue = Array.isArray(snapshot.queue)
        ? snapshot.queue.slice(-WORLD_CONFIG.roomQueueLimit)
        : [];
      this.playback = snapshot.playback;
      this.roomLocked = Boolean(snapshot.roomLocked);

      for (const game of snapshot.games) {
        const table = this.gameTables.get(game.tableId);
        table?.hydrate(game.state);
      }
    }

    this.setSimulationInterval(() => {
      this.simulatePlayers();
    }, Math.round(1000 / WORLD_CONFIG.serverSimulationHz));

    this.setPatchRate(Math.round(1000 / WORLD_CONFIG.patchRateHz));

    this.onMessage("input.move", (client, payload: ClientMessageMap["input.move"]) => {
      const userId = this.clientToUser.get(client.sessionId);
      if (!userId) {
        return;
      }

      const runtime = this.players.get(userId);
      if (!runtime || runtime.muted) {
        return;
      }

      runtime.input = {
        up: Boolean(payload.up),
        down: Boolean(payload.down),
        left: Boolean(payload.left),
        right: Boolean(payload.right)
      };
    });

    this.onMessage("chat.send", (client, payload: ClientMessageMap["chat.send"]) => {
      const userId = this.clientToUser.get(client.sessionId);
      if (!userId) {
        return;
      }

      const runtime = this.players.get(userId);
      if (!runtime || runtime.muted) {
        return;
      }

      const body = cleanText(payload.body).slice(0, 500);
      if (!body) {
        return;
      }

      const message: ChatMessage = {
        id: nanoid(12),
        roomId: this.publicRoomId,
        userId,
        userName: runtime.avatar.name,
        body,
        kind: "user",
        createdAtEpochMs: Date.now()
      };

      this.chatLog.push(message);
      if (this.chatLog.length > WORLD_CONFIG.roomChatLimit) {
        this.chatLog.shift();
      }

      this.broadcast("chat.message", message);
    });

    this.onMessage("music.enqueue", (client, payload: ClientMessageMap["music.enqueue"]) => {
      const userId = this.clientToUser.get(client.sessionId);
      if (!userId) {
        return;
      }

      const runtime = this.players.get(userId);
      if (!runtime) {
        return;
      }
      this.enqueueFromActor(userId, runtime.avatar.role, runtime.avatar.name, {
        source: payload.source,
        itemId: payload.itemId,
        title: payload.title
      });
    });

    this.onMessage("music.control", (client, payload: ClientMessageMap["music.control"]) => {
      const userId = this.clientToUser.get(client.sessionId);
      if (!userId) {
        return;
      }

      const runtime = this.players.get(userId);
      if (!runtime) {
        return;
      }
      this.controlFromActor(userId, runtime.avatar.role, {
        action: payload.action,
        seekPositionMs: payload.seekPositionMs
      });
    });

    this.onMessage("music.voteSkip", (_client, _payload: ClientMessageMap["music.voteSkip"]) => {
      this.sendSystemMessage("Vote skip received. Host/DJ can still directly skip.");
    });

    this.onMessage("presence.webcamToggle", (client, payload: ClientMessageMap["presence.webcamToggle"]) => {
      const userId = this.clientToUser.get(client.sessionId);
      if (!userId) {
        return;
      }

      const runtime = this.players.get(userId);
      if (!runtime) {
        return;
      }

      runtime.avatar.webcamOn = Boolean(payload.webcamOn);
      this.broadcast("presence.event", {
        userId,
        webcamOn: runtime.avatar.webcamOn
      });

      this.broadcastStatePatch();
      this.requestPersist();
    });

    this.onMessage("moderation.request", (client, payload: ClientMessageMap["moderation.request"]) => {
      const actorUserId = this.clientToUser.get(client.sessionId);
      if (!actorUserId) {
        return;
      }

      const actor = this.players.get(actorUserId);
      if (!actor) {
        return;
      }
      this.moderateFromActor(actorUserId, actor.avatar.name, actor.avatar.role, payload);
    });

    this.onMessage("game.action", (client, payload: ClientMessageMap["game.action"]) => {
      const userId = this.clientToUser.get(client.sessionId);
      if (!userId) {
        return;
      }

      const table = this.gameTables.get(payload.tableId);
      if (!table) {
        return;
      }

      const result = table.applyAction(userId, payload.action, payload.payload);
      if (!result.changed) {
        if (result.systemMessage) {
          this.sendSystemMessage(result.systemMessage);
        }
        return;
      }

      this.broadcast("game.state", {
        tableId: payload.tableId,
        game: payload.game,
        state: result.state
      });

      if (result.systemMessage) {
        this.sendSystemMessage(result.systemMessage);
      }

      this.requestPersist();
    });

    this.clock.setInterval(() => {
      this.broadcast("music.timelineSync", this.playback);
    }, 1000);

    activeRoomRegistry.register(this.toRoomRef());
  }

  onJoin(client: Client, _options: unknown, auth: AuthContext): void {
    if (this.roomLocked && auth.role !== "host") {
      throw new Error("Room is locked.");
    }

    if (this.bannedUsers.has(auth.userId)) {
      throw new Error("You are banned from this room.");
    }

    const spawnX = 120 + this.players.size * 32;
    const spawnY = 120 + (this.players.size % 5) * 40;

    const avatar: AvatarState = {
      userId: auth.userId,
      name: cleanText(auth.userName),
      color: auth.avatarColor,
      x: spawnX,
      y: spawnY,
      dir: "down",
      webcamOn: false,
      role: auth.role
    };

    this.players.set(auth.userId, {
      avatar,
      input: { up: false, down: false, left: false, right: false },
      clientId: client.sessionId,
      muted: false,
      banned: false
    });

    this.clientToUser.set(client.sessionId, auth.userId);

    this.send(client, "state.patch", { avatars: this.getAvatars() });
    this.send(client, "music.state", {
      queue: this.queue,
      playback: this.playback
    });

    for (const [tableId, table] of this.gameTables.entries()) {
      this.send(client, "game.state", {
        tableId,
        game: table.kind,
        state: table.getState()
      });
    }

    this.sendSystemMessage(`${avatar.name} joined the room.`);
    this.broadcastStatePatch();
    this.requestPersist();
  }

  onLeave(client: Client): void {
    const userId = this.clientToUser.get(client.sessionId);
    if (!userId) {
      return;
    }

    this.clientToUser.delete(client.sessionId);

    const runtime = this.players.get(userId);
    if (!runtime) {
      return;
    }

    const userName = runtime.avatar.name;
    this.players.delete(userId);
    for (const table of this.gameTables.values()) {
      table.leave(userId);
    }

    this.sendSystemMessage(`${userName} left the room.`);
    this.broadcastStatePatch();
    this.requestPersist();

    if (this.players.size === 0) {
      this.lock();
    }
  }

  onDispose(): void {
    this.flushPersistNow();
    activeRoomRegistry.unregister(this.publicRoomId);
  }

  enqueueFromApi(input: {
    userId: string;
    role: Role;
    source: ClientMessageMap["music.enqueue"]["source"];
    itemId: string;
    title: string;
  }): { ok: boolean; queueLength: number } {
    const actor = this.players.get(input.userId);
    const actorName = actor?.avatar.name ?? input.userId;
    this.enqueueFromActor(input.userId, input.role, actorName, input);
    return { ok: true, queueLength: this.queue.length };
  }

  controlFromApi(input: {
    userId: string;
    role: Role;
    action: ClientMessageMap["music.control"]["action"];
    seekPositionMs?: number;
  }): { ok: boolean; playback: PlaybackState } {
    this.controlFromActor(input.userId, input.role, input);
    return { ok: true, playback: this.playback };
  }

  moderateFromApi(input: {
    actorUserId: string;
    actorRole: Role;
    action: ClientMessageMap["moderation.request"]["action"];
    targetUserId?: string;
    details?: string;
  }): { ok: boolean } {
    const actor = this.players.get(input.actorUserId);
    const actorName = actor?.avatar.name ?? input.actorUserId;
    this.moderateFromActor(input.actorUserId, actorName, input.actorRole, {
      action: input.action,
      targetUserId: input.targetUserId,
      details: input.details
    });
    return { ok: true };
  }

  private broadcastStatePatch(): void {
    this.broadcast("state.patch", { avatars: this.getAvatars() });
  }

  private broadcastMusicState(): void {
    this.broadcast("music.state", {
      queue: this.queue,
      playback: this.playback
    });
    this.requestPersist();
  }

  private sendSystemMessage(body: string): void {
    const systemMessage: ChatMessage = {
      id: nanoid(12),
      roomId: this.publicRoomId,
      userId: "system",
      userName: "system",
      body,
      kind: "system",
      createdAtEpochMs: Date.now()
    };

    this.chatLog.push(systemMessage);
    if (this.chatLog.length > WORLD_CONFIG.roomChatLimit) {
      this.chatLog.shift();
    }

    this.broadcast("chat.message", systemMessage);
    this.requestPersist();
  }

  private enqueueFromActor(
    userId: string,
    role: Role,
    actorName: string,
    payload: {
      source: ClientMessageMap["music.enqueue"]["source"];
      itemId: string;
      title: string;
    }
  ): void {
    try {
      assertControlRole(role, "enqueue");
    } catch {
      this.sendSystemMessage("You are not allowed to enqueue music.");
      return;
    }

    const provider = this.providers.find((candidate) => candidate.source === payload.source);
    if (!provider || !provider.isEnabled()) {
      this.sendSystemMessage("Music source unavailable.");
      return;
    }

    const queueItem: MusicQueueItem = {
      id: nanoid(10),
      source: payload.source,
      itemId: payload.itemId,
      title: cleanText(payload.title),
      addedBy: userId,
      addedAtEpochMs: Date.now()
    };

    this.queue.push(queueItem);
    if (this.queue.length > WORLD_CONFIG.roomQueueLimit) {
      this.queue.shift();
    }

    if (!this.playback.isPlaying) {
      this.playback = {
        source: queueItem.source,
        itemId: queueItem.itemId,
        positionMs: 0,
        isPlaying: true,
        startedAtEpochMs: Date.now(),
        controllerRole: role
      };
    }

    this.broadcastMusicState();
    this.sendSystemMessage(`${actorName} queued: ${queueItem.title}`);
  }

  private controlFromActor(
    _userId: string,
    role: Role,
    payload: {
      action: ClientMessageMap["music.control"]["action"];
      seekPositionMs?: number;
    }
  ): void {
    try {
      assertControlRole(role, "control");
    } catch {
      this.sendSystemMessage("Only host/DJ can control playback.");
      return;
    }

    if (payload.action === "skip") {
      const next = this.queue.shift();
      const reduced = reducePlayback(
        this.playback,
        {
          type: "skip",
          nextItemId: next?.itemId,
          nextSource: next?.source
        },
        Date.now()
      );
      this.playback = reduced.playback;
    } else if (payload.action === "play") {
      this.playback = reducePlayback(this.playback, { type: "play" }, Date.now()).playback;
    } else if (payload.action === "pause") {
      this.playback = reducePlayback(this.playback, { type: "pause" }, Date.now()).playback;
    } else if (payload.action === "seek") {
      this.playback = reducePlayback(
        this.playback,
        { type: "seek", positionMs: payload.seekPositionMs ?? 0 },
        Date.now()
      ).playback;
    }

    this.playback.controllerRole = role;
    this.broadcastMusicState();
  }

  private moderateFromActor(
    actorUserId: string,
    actorName: string,
    actorRole: Role,
    payload: {
      action: ClientMessageMap["moderation.request"]["action"];
      targetUserId?: string;
      details?: string;
    }
  ): void {
    if (actorRole !== "host" && actorRole !== "dj") {
      this.sendSystemMessage("Only host or DJ can moderate this room.");
      return;
    }

    if (payload.action === "lock") {
      this.roomLocked = !this.roomLocked;
      this.broadcast("moderation.event", {
        action: "lock",
        actorUserId,
        createdAtEpochMs: Date.now(),
        details: this.roomLocked ? "Room locked" : "Room unlocked"
      });
      this.requestPersist();
      return;
    }

    const targetUserId = payload.targetUserId;
    if (!targetUserId) {
      this.sendSystemMessage("Moderation action requires target user.");
      return;
    }

    const target = this.players.get(targetUserId);
    if (!target) {
      this.sendSystemMessage("Target user is not currently in room.");
      return;
    }

    if (payload.action === "mute") {
      target.muted = !target.muted;
    }

    if (payload.action === "ban") {
      target.banned = true;
      this.bannedUsers.add(targetUserId);
    }

    if (payload.action === "kick" || payload.action === "ban") {
      const targetClient = this.clients.find((candidate) => candidate.sessionId === target.clientId);
      targetClient?.leave(4000, "Removed by moderator");
    }

    if (payload.action === "report") {
      this.sendSystemMessage(`Report submitted by ${actorName}.`);
    }

    this.broadcast("moderation.event", {
      action: payload.action,
      actorUserId,
      targetUserId,
      createdAtEpochMs: Date.now(),
      details: payload.details
    });
    this.requestPersist();
  }

  private requestPersist(): void {
    if (this.persistTimer) {
      return;
    }

    this.persistTimer = setTimeout(() => {
      this.persistTimer = null;
      this.flushPersistNow();
    }, 500);
  }

  private flushPersistNow(): void {
    if (!this.publicRoomId) {
      return;
    }

    const snapshot = activeRoomRegistry.toPublicSnapshot(this.publicRoomId) ?? this.buildSnapshot();
    void saveRoomSnapshot(snapshot);
  }

  private buildSnapshot() {
    return {
      roomId: this.publicRoomId,
      roomName: this.roomLabel,
      avatars: this.getAvatars(),
      chat: this.getChat(),
      queue: [...this.queue],
      playback: this.playback,
      roomLocked: this.roomLocked,
      games: Array.from(this.gameTables.values()).map((game) => {
        const state = game.getState();
        const participants = Array.isArray(state.participants)
          ? (state.participants as string[])
          : [];
        return {
          tableId: game.tableId,
          kind: game.kind,
          inProgress: participants.length > 0,
          participants,
          state
        };
      })
    };
  }

  private simulatePlayers(): void {
    const dt = 1 / WORLD_CONFIG.serverSimulationHz;
    const speed = realtimeConfig.worldSpeedPxPerSecond;
    const worldWidth = WORLD_CONFIG.widthTiles * WORLD_CONFIG.tileSize;
    const worldHeight = WORLD_CONFIG.heightTiles * WORLD_CONFIG.tileSize;

    for (const runtime of this.players.values()) {
      const { input, avatar } = runtime;
      let vx = 0;
      let vy = 0;

      if (input.left) vx -= 1;
      if (input.right) vx += 1;
      if (input.up) vy -= 1;
      if (input.down) vy += 1;

      if (vx === 0 && vy === 0) {
        continue;
      }

      const length = Math.sqrt(vx * vx + vy * vy) || 1;
      const nx = vx / length;
      const ny = vy / length;

      avatar.x = Math.max(12, Math.min(worldWidth - 12, avatar.x + nx * speed * dt));
      avatar.y = Math.max(12, Math.min(worldHeight - 12, avatar.y + ny * speed * dt));

      if (Math.abs(nx) > Math.abs(ny)) {
        avatar.dir = nx > 0 ? "right" : "left";
      } else {
        avatar.dir = ny > 0 ? "down" : "up";
      }
    }

    this.broadcastStatePatch();
  }

  private getAvatars(): AvatarState[] {
    return Array.from(this.players.values()).map((entry) => entry.avatar);
  }

  private getChat(): ChatMessage[] {
    return [...this.chatLog];
  }

  private toRoomRef() {
    return {
      roomId: this.publicRoomId,
      roomName: this.roomLabel,
      getAvatars: () => this.getAvatars(),
      getChat: () => this.getChat(),
      getQueue: () => [...this.queue],
      getPlayback: () => this.playback,
      isRoomLocked: () => this.roomLocked,
      getGames: () => this.gameTables,
      enqueueFromApi: (input: {
        userId: string;
        role: Role;
        source: "licensed" | "spotify" | "youtube";
        itemId: string;
        title: string;
      }) => this.enqueueFromApi(input),
      controlFromApi: (input: {
        userId: string;
        role: Role;
        action: "play" | "pause" | "skip" | "seek";
        seekPositionMs?: number;
      }) => this.controlFromApi(input),
      moderateFromApi: (input: {
        actorUserId: string;
        actorRole: Role;
        action: "kick" | "ban" | "mute" | "lock" | "report";
        targetUserId?: string;
        details?: string;
      }) => this.moderateFromApi(input)
    };
  }
}
