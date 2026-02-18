import "dotenv/config";

export const realtimeConfig = {
  port: Number(process.env.REALTIME_PORT ?? 4002),
  host: process.env.REALTIME_HOST ?? "0.0.0.0",
  corsOrigin: process.env.CORS_ORIGIN ?? "http://localhost:3000",
  redisUrl: process.env.REDIS_URL ?? "redis://localhost:6379",
  snapshotTtlSeconds: Number(process.env.SNAPSHOT_TTL_SECONDS ?? 60 * 60 * 24),
  sessionJwtSecret: process.env.SESSION_JWT_SECRET ?? "dev-session-secret",
  roomType: process.env.COLYSEUS_ROOM_TYPE ?? "chill_room",
  worldSpeedPxPerSecond: Number(process.env.WORLD_SPEED_PX_PER_SECOND ?? 180)
};
