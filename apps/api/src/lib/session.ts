import jwt from "jsonwebtoken";
import { AccessToken } from "livekit-server-sdk";
import type { JoinBootstrap, Role } from "@chillspace/protocol";
import { apiConfig } from "../config";

interface BuildJoinBootstrapInput {
  roomId: string;
  roomName: string;
  userId: string;
  userName: string;
  avatarColor: string;
  role: Role;
}

const buildSessionJwt = (input: BuildJoinBootstrapInput): string =>
  jwt.sign(
    {
      sub: input.userId,
      roomId: input.roomId,
      roomName: input.roomName,
      userName: input.userName,
      avatarColor: input.avatarColor,
      role: input.role
    },
    apiConfig.sessionJwtSecret,
    {
      expiresIn: apiConfig.sessionJwtTtlSeconds
    }
  );

const buildLiveKitToken = async (
  roomId: string,
  userId: string,
  userName: string
): Promise<string> => {
  const token = new AccessToken(apiConfig.livekitApiKey, apiConfig.livekitApiSecret, {
    identity: userId,
    name: userName,
    ttl: `${apiConfig.sessionJwtTtlSeconds}s`
  });

  token.addGrant({
    roomJoin: true,
    room: roomId,
    canPublish: true,
    canPublishData: true,
    canSubscribe: true
  });

  return token.toJwt();
};

export const buildJoinBootstrap = async (
  input: BuildJoinBootstrapInput
): Promise<JoinBootstrap> => {
  const sessionJwt = buildSessionJwt(input);
  const livekitToken = await buildLiveKitToken(
    input.roomId,
    input.userId,
    input.userName
  );

  return {
    sessionJwt,
    colyseus: {
      wsUrl: apiConfig.realtimeWsUrl,
      roomId: input.roomId,
      seat: `seat_${input.userId}`
    },
    livekit: {
      url: apiConfig.livekitUrl,
      token: livekitToken,
      room: input.roomId
    }
  };
};

export const verifySessionJwt = (token: string): {
  sub: string;
  roomId: string;
  role: Role;
} => {
  const decoded = jwt.verify(token, apiConfig.sessionJwtSecret);
  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid session token.");
  }

  const payload = decoded as Partial<{ sub: string; roomId: string; role: Role }>;
  if (!payload.sub || !payload.roomId || !payload.role) {
    throw new Error("Session token is missing required claims.");
  }

  return payload as { sub: string; roomId: string; role: Role };
};
