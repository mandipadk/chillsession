import { describe, it, expect } from "vitest";
import { apiConfig } from "../config";

describe("apiConfig", () => {
  it("has valid port number", () => {
    expect(typeof apiConfig.port).toBe("number");
    expect(apiConfig.port).toBeGreaterThan(0);
  });

  it("has valid host", () => {
    expect(typeof apiConfig.host).toBe("string");
    expect(apiConfig.host.length).toBeGreaterThan(0);
  });

  it("has valid CORS origin", () => {
    expect(typeof apiConfig.corsOrigin).toBe("string");
    expect(apiConfig.corsOrigin).toContain("http");
  });

  it("has valid database URL", () => {
    expect(typeof apiConfig.databaseUrl).toBe("string");
    expect(apiConfig.databaseUrl).toContain("postgres");
  });

  it("has valid redis URL", () => {
    expect(typeof apiConfig.redisUrl).toBe("string");
    expect(apiConfig.redisUrl).toContain("redis");
  });

  it("has JWT secret", () => {
    expect(typeof apiConfig.sessionJwtSecret).toBe("string");
    expect(apiConfig.sessionJwtSecret.length).toBeGreaterThan(0);
  });

  it("has valid JWT TTL", () => {
    expect(typeof apiConfig.sessionJwtTtlSeconds).toBe("number");
    expect(apiConfig.sessionJwtTtlSeconds).toBeGreaterThan(0);
  });

  it("has valid invite TTL", () => {
    expect(typeof apiConfig.inviteDefaultTtlMinutes).toBe("number");
    expect(apiConfig.inviteDefaultTtlMinutes).toBeGreaterThan(0);
  });

  it("has realtime URLs", () => {
    expect(apiConfig.realtimeWsUrl).toContain("ws");
    expect(apiConfig.realtimeHttpUrl).toContain("http");
  });

  it("has Colyseus room type", () => {
    expect(typeof apiConfig.colyseusRoomType).toBe("string");
    expect(apiConfig.colyseusRoomType.length).toBeGreaterThan(0);
  });

  it("has LiveKit config", () => {
    expect(typeof apiConfig.livekitUrl).toBe("string");
    expect(typeof apiConfig.livekitApiKey).toBe("string");
    expect(typeof apiConfig.livekitApiSecret).toBe("string");
  });
});
