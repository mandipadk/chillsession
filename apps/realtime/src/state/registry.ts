import type {
  AvatarState,
  ChatMessage,
  MusicQueueItem,
  PlaybackState,
  RoomBootstrapPayload
} from "@chillspace/protocol";
import type { GameRuntime } from "../game/types";

export type RoomPublicSnapshot = RoomBootstrapPayload;

export interface RoomRef {
  roomId: string;
  roomName: string;
  getAvatars: () => AvatarState[];
  getChat: () => ChatMessage[];
  getQueue: () => MusicQueueItem[];
  getPlayback: () => PlaybackState;
  isRoomLocked: () => boolean;
  getGames: () => Map<string, GameRuntime>;
  enqueueFromApi: (input: {
    userId: string;
    role: "host" | "dj" | "member";
    source: "licensed" | "spotify" | "youtube";
    itemId: string;
    title: string;
  }) => { ok: boolean; queueLength: number };
  controlFromApi: (input: {
    userId: string;
    role: "host" | "dj" | "member";
    action: "play" | "pause" | "skip" | "seek";
    seekPositionMs?: number;
  }) => { ok: boolean; playback: PlaybackState };
  moderateFromApi: (input: {
    actorUserId: string;
    actorRole: "host" | "dj" | "member";
    action: "kick" | "ban" | "mute" | "lock" | "report";
    targetUserId?: string;
    details?: string;
  }) => { ok: boolean };
}

class ActiveRoomRegistry {
  private rooms = new Map<string, RoomRef>();

  register(room: RoomRef): void {
    this.rooms.set(room.roomId, room);
  }

  unregister(roomId: string): void {
    this.rooms.delete(roomId);
  }

  get(roomId: string): RoomRef | undefined {
    return this.rooms.get(roomId);
  }

  toPublicSnapshot(roomId: string): RoomPublicSnapshot | null {
    const room = this.rooms.get(roomId);
    if (!room) {
      return null;
    }

    const gameStates = Array.from(room.getGames().values()).map((game) => {
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
    });

    return {
      roomId: room.roomId,
      roomName: room.roomName,
      avatars: room.getAvatars(),
      chat: room.getChat(),
      queue: room.getQueue(),
      playback: room.getPlayback(),
      roomLocked: room.isRoomLocked(),
      games: gameStates
    };
  }
}

export const activeRoomRegistry = new ActiveRoomRegistry();
