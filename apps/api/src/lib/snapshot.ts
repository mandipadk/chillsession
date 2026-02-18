import Redis from "ioredis";
import type { RoomBootstrapPayload } from "@chillspace/protocol";
import { apiConfig } from "../config";

const redis = new Redis(apiConfig.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  enableReadyCheck: false
});

let isConnected = false;

const ensureRedisConnection = async (): Promise<void> => {
  if (isConnected) {
    return;
  }

  await redis.connect();
  isConnected = true;
};

export const initializeSnapshotStore = async (): Promise<void> => {
  await ensureRedisConnection();
};

export const getSnapshotKey = (roomId: string): string => `chillspace:room:${roomId}:snapshot`;

export const getRoomSnapshot = async (roomId: string): Promise<RoomBootstrapPayload | null> => {
  try {
    await ensureRedisConnection();
    const raw = await redis.get(getSnapshotKey(roomId));

    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as RoomBootstrapPayload;
  } catch {
    return null;
  }
};
