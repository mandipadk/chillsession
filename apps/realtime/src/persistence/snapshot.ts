import Redis from "ioredis";
import type { RoomPublicSnapshot } from "../state/registry";
import { realtimeConfig } from "../config";

const redis = new Redis(realtimeConfig.redisUrl, {
  lazyConnect: true,
  maxRetriesPerRequest: 2,
  enableReadyCheck: false
});

let isConnected = false;

const ensureConnected = async (): Promise<void> => {
  if (isConnected) {
    return;
  }

  await redis.connect();
  isConnected = true;
};

export const getSnapshotKey = (roomId: string): string => `chillspace:room:${roomId}:snapshot`;

export const initializeSnapshotPersistence = async (): Promise<void> => {
  await ensureConnected();
};

export const loadRoomSnapshot = async (roomId: string): Promise<RoomPublicSnapshot | null> => {
  try {
    await ensureConnected();
    const raw = await redis.get(getSnapshotKey(roomId));
    if (!raw) {
      return null;
    }

    return JSON.parse(raw) as RoomPublicSnapshot;
  } catch {
    return null;
  }
};

export const saveRoomSnapshot = async (snapshot: RoomPublicSnapshot): Promise<void> => {
  try {
    await ensureConnected();
    await redis.set(
      getSnapshotKey(snapshot.roomId),
      JSON.stringify(snapshot),
      "EX",
      realtimeConfig.snapshotTtlSeconds
    );
  } catch {
    // best-effort persistence; realtime room still continues.
  }
};
