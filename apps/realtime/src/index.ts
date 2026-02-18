import http from "node:http";
import express from "express";
import cors from "cors";
import { Server } from "@colyseus/core";
import { WebSocketTransport } from "@colyseus/ws-transport";
import { ChillRoom } from "./rooms/ChillRoom";
import { activeRoomRegistry } from "./state/registry";
import { realtimeConfig } from "./config";
import { initializeSnapshotPersistence } from "./persistence/snapshot";

const app = express();
app.use(cors({ origin: realtimeConfig.corsOrigin }));
app.use(express.json());

app.get("/health", (_req, res) => {
  res.json({ ok: true, service: "realtime" });
});

app.get("/bootstrap/:roomId", (req, res) => {
  const roomId = req.params.roomId;
  const snapshot = activeRoomRegistry.toPublicSnapshot(roomId);

  if (!snapshot) {
    res.status(404).json({ error: "room_not_active" });
    return;
  }

  res.json(snapshot);
});

app.post("/admin/music/queue", (req, res) => {
  const body = req.body as Partial<{
    roomId: string;
    userId: string;
    role: "host" | "dj" | "member";
    source: "licensed" | "spotify" | "youtube";
    itemId: string;
    title: string;
  }>;

  if (
    !body.roomId ||
    !body.userId ||
    !body.role ||
    !body.source ||
    !body.itemId ||
    !body.title
  ) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }

  const roomRef = activeRoomRegistry.get(body.roomId);
  if (!roomRef) {
    res.status(404).json({ error: "room_not_active" });
    return;
  }

  const result = roomRef.enqueueFromApi({
    userId: body.userId,
    role: body.role,
    source: body.source,
    itemId: body.itemId,
    title: body.title
  });

  res.json(result);
});

app.post("/admin/music/control", (req, res) => {
  const body = req.body as Partial<{
    roomId: string;
    userId: string;
    role: "host" | "dj" | "member";
    action: "play" | "pause" | "skip" | "seek";
    seekPositionMs?: number;
  }>;

  if (!body.roomId || !body.userId || !body.role || !body.action) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }

  const roomRef = activeRoomRegistry.get(body.roomId);
  if (!roomRef) {
    res.status(404).json({ error: "room_not_active" });
    return;
  }

  const result = roomRef.controlFromApi({
    userId: body.userId,
    role: body.role,
    action: body.action,
    seekPositionMs: body.seekPositionMs
  });

  res.json(result);
});

app.post("/admin/moderation/action", (req, res) => {
  const body = req.body as Partial<{
    roomId: string;
    actorUserId: string;
    actorRole: "host" | "dj" | "member";
    action: "kick" | "ban" | "mute" | "lock" | "report";
    targetUserId?: string;
    details?: string;
  }>;

  if (!body.roomId || !body.actorUserId || !body.actorRole || !body.action) {
    res.status(400).json({ error: "invalid_payload" });
    return;
  }

  const roomRef = activeRoomRegistry.get(body.roomId);
  if (!roomRef) {
    res.status(404).json({ error: "room_not_active" });
    return;
  }

  const result = roomRef.moderateFromApi({
    actorUserId: body.actorUserId,
    actorRole: body.actorRole,
    action: body.action,
    targetUserId: body.targetUserId,
    details: body.details
  });

  res.json(result);
});

const bootstrap = async (): Promise<void> => {
  await initializeSnapshotPersistence();

  const server = http.createServer(app);

  const gameServer = new Server({
    transport: new WebSocketTransport({ server })
  });

  gameServer.define(realtimeConfig.roomType, ChillRoom);

  server.listen(realtimeConfig.port, realtimeConfig.host, () => {
    // eslint-disable-next-line no-console
    console.log(`Realtime service running on http://${realtimeConfig.host}:${realtimeConfig.port}`);
  });
};

void bootstrap().catch((error) => {
  // eslint-disable-next-line no-console
  console.error("Failed to start realtime service", error);
  process.exit(1);
});
