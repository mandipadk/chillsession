import { apiConfig } from "../config";

const postToRealtime = async (path: string, body: Record<string, unknown>) => {
  const response = await fetch(`${apiConfig.realtimeHttpUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(body)
  });

  if (!response.ok) {
    const data = await response.json().catch(() => ({}));
    throw new Error(data.error ?? "realtime_request_failed");
  }

  return response.json();
};

export const fetchRealtimeBootstrap = async (roomId: string) => {
  const response = await fetch(`${apiConfig.realtimeHttpUrl}/bootstrap/${roomId}`);
  if (!response.ok) {
    return null;
  }

  return response.json();
};

export const enqueueMusicRealtime = async (payload: {
  roomId: string;
  userId: string;
  role: string;
  source: string;
  itemId: string;
  title: string;
}) => postToRealtime("/admin/music/queue", payload);

export const controlMusicRealtime = async (payload: {
  roomId: string;
  userId: string;
  role: string;
  action: string;
  seekPositionMs?: number;
}) => postToRealtime("/admin/music/control", payload);

export const moderateRealtime = async (payload: {
  roomId: string;
  action: string;
  actorUserId: string;
  actorRole: string;
  targetUserId?: string;
  details?: string;
}) => postToRealtime("/admin/moderation/action", payload);
