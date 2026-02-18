import type {
  EnqueueMusicInput,
  ModerationInput,
  MusicControlInput,
  RoomBootstrapPayload
} from "@chillspace/protocol";
import type { SessionJoinResponse } from "./types";

const API_URL = process.env.NEXT_PUBLIC_API_URL ?? "http://localhost:4001";

async function handleResponse<T>(response: Response): Promise<T> {
  if (!response.ok) {
    const body = await response.json().catch(() => ({}));
    throw new Error(body.error ?? "request_failed");
  }

  return response.json() as Promise<T>;
}

export const joinSession = async (input: {
  inviteToken: string;
  userName: string;
  avatarColor: string;
}): Promise<SessionJoinResponse> => {
  const response = await fetch(`${API_URL}/api/session/join`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json"
    },
    body: JSON.stringify(input)
  });

  return handleResponse<SessionJoinResponse>(response);
};

export const fetchRoomBootstrap = async (roomId: string): Promise<RoomBootstrapPayload> => {
  const response = await fetch(`${API_URL}/api/rooms/${roomId}/bootstrap`);
  return handleResponse<RoomBootstrapPayload>(response);
};

export const queueMusic = async (
  token: string,
  roomId: string,
  userId: string,
  input: EnqueueMusicInput
): Promise<unknown> => {
  const response = await fetch(`${API_URL}/api/music/queue`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      roomId,
      requesterUserId: userId,
      ...input
    })
  });

  return handleResponse<unknown>(response);
};

export const controlMusic = async (
  token: string,
  roomId: string,
  userId: string,
  input: MusicControlInput
): Promise<unknown> => {
  const response = await fetch(`${API_URL}/api/music/control`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      roomId,
      requesterUserId: userId,
      action: input.action,
      seekPositionMs: input.seekPositionMs
    })
  });

  return handleResponse<unknown>(response);
};

export const moderate = async (
  token: string,
  roomId: string,
  input: ModerationInput
): Promise<unknown> => {
  const response = await fetch(`${API_URL}/api/moderation/action`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Authorization: `Bearer ${token}`
    },
    body: JSON.stringify({
      roomId,
      action: input.action,
      actorUserId: "self",
      targetUserId: input.targetUserId,
      details: input.details
    })
  });

  return handleResponse<unknown>(response);
};
