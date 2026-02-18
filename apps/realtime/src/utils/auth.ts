import jwt from "jsonwebtoken";

export interface SessionClaims {
  sub: string;
  roomId: string;
  userName: string;
  avatarColor: string;
  role: "host" | "dj" | "member";
  exp: number;
}

export const verifySessionToken = (
  token: string,
  secret: string
): SessionClaims => {
  const decoded = jwt.verify(token, secret);

  if (typeof decoded !== "object" || decoded === null) {
    throw new Error("Invalid session token payload");
  }

  const claims = decoded as Partial<SessionClaims>;
  if (!claims.sub || !claims.roomId || !claims.userName || !claims.avatarColor || !claims.role) {
    throw new Error("Session token missing required claims");
  }

  return claims as SessionClaims;
};
