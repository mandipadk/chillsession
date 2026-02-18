import "dotenv/config";

export const apiConfig = {
  port: Number(process.env.API_PORT ?? 4001),
  host: process.env.API_HOST ?? "0.0.0.0",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  databaseUrl: process.env.DATABASE_URL ?? "postgres://chillspace:chillspace@localhost:5432/chillspace",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  sessionJwtSecret: process.env.SESSION_JWT_SECRET ?? "dev-session-secret",
  sessionJwtTtlSeconds: Number(process.env.SESSION_JWT_TTL_SECONDS ?? 60 * 60 * 12),
  inviteDefaultTtlMinutes: Number(process.env.INVITE_DEFAULT_TTL_MINUTES ?? 120),
  realtimeWsUrl: process.env.REALTIME_WS_URL ?? "ws://localhost:4002",
  realtimeHttpUrl: process.env.REALTIME_HTTP_URL ?? "http://localhost:4002",
  colyseusRoomType: process.env.COLYSEUS_ROOM_TYPE ?? "chill_room",
  livekitUrl: process.env.LIVEKIT_URL ?? "wss://your-livekit-host.livekit.cloud",
  livekitApiKey: process.env.LIVEKIT_API_KEY ?? "devkey",
  livekitApiSecret: process.env.LIVEKIT_API_SECRET ?? "devsecret"
};
