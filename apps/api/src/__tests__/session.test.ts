import { describe, it, expect } from "vitest";
import { buildJoinBootstrap, verifySessionJwt } from "../lib/session";

describe("buildJoinBootstrap", () => {
  it("returns a valid bootstrap object", async () => {
    const result = await buildJoinBootstrap({
      roomId: "room1",
      roomName: "Study Room",
      userId: "user1",
      userName: "Alice",
      avatarColor: "#ff0000",
      role: "host",
    });

    expect(result.sessionJwt).toBeTruthy();
    expect(typeof result.sessionJwt).toBe("string");
    expect(result.colyseus.wsUrl).toBeTruthy();
    expect(result.colyseus.roomId).toBe("room1");
    expect(result.colyseus.seat).toBe("seat_user1");
    expect(result.livekit.url).toBeTruthy();
    expect(result.livekit.token).toBeTruthy();
    expect(result.livekit.room).toBe("room1");
  });

  it("creates verifiable session JWT", async () => {
    const result = await buildJoinBootstrap({
      roomId: "room42",
      roomName: "Test Room",
      userId: "uid99",
      userName: "Bob",
      avatarColor: "#00ff00",
      role: "dj",
    });

    const verified = verifySessionJwt(result.sessionJwt);
    expect(verified.sub).toBe("uid99");
    expect(verified.roomId).toBe("room42");
    expect(verified.role).toBe("dj");
  });
});

describe("verifySessionJwt", () => {
  it("throws on invalid token", () => {
    expect(() => verifySessionJwt("invalid.token.here")).toThrow();
  });

  it("throws on empty string", () => {
    expect(() => verifySessionJwt("")).toThrow();
  });

  it("roundtrips through buildJoinBootstrap", async () => {
    const bootstrap = await buildJoinBootstrap({
      roomId: "r1",
      roomName: "Room",
      userId: "u1",
      userName: "Test",
      avatarColor: "#0000ff",
      role: "member",
    });

    const payload = verifySessionJwt(bootstrap.sessionJwt);
    expect(payload.sub).toBe("u1");
    expect(payload.roomId).toBe("r1");
    expect(payload.role).toBe("member");
  });
});
