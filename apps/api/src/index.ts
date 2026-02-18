import express from "express";
import cors from "cors";
import { nanoid } from "nanoid";
import {
  createInviteSchema,
  createRoomSchema,
  enqueueMusicSchema,
  joinSessionSchema,
  moderationActionRequestSchema,
  musicControlSchema,
  type Role
} from "@chillspace/protocol";
import { apiConfig } from "./config";
import { buildJoinBootstrap, verifySessionJwt } from "./lib/session";
import { cleanText } from "./lib/filter";
import { initializeStore, store } from "./store";
import {
  controlMusicRealtime,
  enqueueMusicRealtime,
  fetchRealtimeBootstrap,
  moderateRealtime
} from "./lib/realtime";
import { getRoomSnapshot, initializeSnapshotStore } from "./lib/snapshot";

const app = express();
app.use(cors({ origin: apiConfig.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "api" });
});

app.post("/api/rooms", async (req, res) => {
  const parsed = createRoomSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
    return;
  }

  const roomName = cleanText(parsed.data.roomName);
  const hostName = cleanText(parsed.data.hostName);

  try {
    const { room, hostInvite } = await store.createRoom(roomName, hostName);

    res.status(201).json({
      room,
      hostInviteToken: hostInvite.token,
      hostUserId: room.hostUserId,
      joinPath: `/room/${room.id}?invite=${hostInvite.token}`
    });
  } catch (error) {
    res.status(500).json({
      error: "room_create_failed",
      message: error instanceof Error ? error.message : "unknown"
    });
  }
});

app.post("/api/rooms/:roomId/invites", async (req, res) => {
  const roomId = req.params.roomId;

  const parsed = createInviteSchema.safeParse({
    ...req.body,
    roomId
  });

  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
    return;
  }

  const room = await store.getRoomById(roomId);
  if (!room) {
    res.status(404).json({ error: "room_not_found" });
    return;
  }

  try {
    const invite = await store.createInvite(
      roomId,
      parsed.data.createdBy,
      parsed.data.ttlMinutes
    );
    res.status(201).json({ invite });
  } catch (error) {
    res.status(500).json({
      error: "invite_create_failed",
      message: error instanceof Error ? error.message : "unknown"
    });
  }
});

app.post("/api/session/join", async (req, res) => {
  const parsed = joinSessionSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
    return;
  }

  const invite = await store.getInviteByToken(parsed.data.inviteToken);
  if (!invite) {
    res.status(404).json({ error: "invite_not_found" });
    return;
  }

  if (invite.expiresAtEpochMs < Date.now()) {
    res.status(410).json({ error: "invite_expired" });
    return;
  }

  const room = await store.getRoomById(invite.roomId);
  if (!room) {
    res.status(404).json({ error: "room_not_found" });
    return;
  }

  const userId = nanoid(12);
  const role = (invite.roleOverride ?? "member") as Role;

  try {
    await store.markInviteUsed(invite.token, userId);

    const bootstrap = await buildJoinBootstrap({
      roomId: room.id,
      roomName: room.name,
      userId,
      userName: cleanText(parsed.data.userName),
      avatarColor: parsed.data.avatarColor,
      role
    });

    res.status(200).json({
      room,
      user: {
        userId,
        role,
        userName: cleanText(parsed.data.userName),
        avatarColor: parsed.data.avatarColor
      },
      bootstrap
    });
  } catch (error) {
    res.status(500).json({
      error: "session_bootstrap_failed",
      message: error instanceof Error ? error.message : "unknown"
    });
  }
});

app.get("/api/rooms/:roomId/bootstrap", async (req, res) => {
  const roomId = req.params.roomId;
  const room = await store.getRoomById(roomId);
  if (!room) {
    res.status(404).json({ error: "room_not_found" });
    return;
  }

  const liveSnapshot = await fetchRealtimeBootstrap(roomId);
  if (liveSnapshot) {
    res.status(200).json(liveSnapshot);
    return;
  }

  const persistedSnapshot = await getRoomSnapshot(roomId);
  if (persistedSnapshot) {
    res.status(200).json({
      ...persistedSnapshot,
      roomName: room.name
    });
    return;
  }

  res.status(200).json({
    roomId,
    roomName: room.name,
    avatars: [],
    chat: [],
    queue: [],
    playback: {
      source: "licensed",
      itemId: "https://stream.lofi.radio/default.mp3",
      positionMs: 0,
      isPlaying: false,
      startedAtEpochMs: Date.now(),
      controllerRole: "host"
    },
    roomLocked: room.isLocked,
    games: []
  });
});

const requireSession = (authorizationHeader?: string): {
  userId: string;
  roomId: string;
  role: Role;
} => {
  if (!authorizationHeader || !authorizationHeader.startsWith("Bearer ")) {
    throw new Error("missing_bearer_token");
  }

  const token = authorizationHeader.slice("Bearer ".length);
  const payload = verifySessionJwt(token);
  return {
    userId: payload.sub,
    roomId: payload.roomId,
    role: payload.role
  };
};

app.post("/api/music/queue", async (req, res) => {
  const parsed = enqueueMusicSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
    return;
  }

  try {
    const session = requireSession(req.headers.authorization);
    if (session.roomId !== parsed.data.roomId) {
      res.status(403).json({ error: "room_scope_mismatch" });
      return;
    }

    const result = await enqueueMusicRealtime({
      roomId: parsed.data.roomId,
      userId: session.userId,
      role: session.role,
      source: parsed.data.source,
      itemId: parsed.data.itemId,
      title: cleanText(parsed.data.title)
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(403).json({
      error: "queue_denied",
      message: error instanceof Error ? error.message : "unknown"
    });
  }
});

app.post("/api/music/control", async (req, res) => {
  const parsed = musicControlSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
    return;
  }

  try {
    const session = requireSession(req.headers.authorization);
    if (session.roomId !== parsed.data.roomId) {
      res.status(403).json({ error: "room_scope_mismatch" });
      return;
    }

    const result = await controlMusicRealtime({
      roomId: parsed.data.roomId,
      userId: session.userId,
      role: session.role,
      action: parsed.data.action,
      ...(parsed.data.seekPositionMs !== undefined
        ? { seekPositionMs: parsed.data.seekPositionMs }
        : {})
    });

    res.status(200).json(result);
  } catch (error) {
    res.status(403).json({
      error: "control_denied",
      message: error instanceof Error ? error.message : "unknown"
    });
  }
});

app.post("/api/moderation/action", async (req, res) => {
  const parsed = moderationActionRequestSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "invalid_payload", details: parsed.error.flatten() });
    return;
  }

  try {
    const session = requireSession(req.headers.authorization);
    if (session.roomId !== parsed.data.roomId) {
      res.status(403).json({ error: "room_scope_mismatch" });
      return;
    }

    const audit = await store.appendAudit({
      roomId: parsed.data.roomId,
      actorUserId: session.userId,
      action: parsed.data.action,
      ...(parsed.data.targetUserId ? { targetUserId: parsed.data.targetUserId } : {}),
      ...(parsed.data.details ? { details: parsed.data.details } : {})
    });

    const result = await moderateRealtime({
      roomId: parsed.data.roomId,
      action: parsed.data.action,
      actorUserId: session.userId,
      actorRole: session.role,
      ...(parsed.data.targetUserId ? { targetUserId: parsed.data.targetUserId } : {}),
      ...(parsed.data.details ? { details: parsed.data.details } : {})
    });

    res.status(200).json({ result, audit });
  } catch (error) {
    res.status(403).json({
      error: "moderation_denied",
      message: error instanceof Error ? error.message : "unknown"
    });
  }
});

const bootstrap = async (): Promise<void> => {
  await initializeStore();
  await initializeSnapshotStore();

  app.listen(apiConfig.port, apiConfig.host, () => {
    // eslint-disable-next-line no-console
    console.log(`API service running on http://${apiConfig.host}:${apiConfig.port}`);
  });
};

void bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start API service", error);
  process.exit(1);
});
