import { describe, it, expect } from "vitest";
import {
  directionSchema,
  roleSchema,
  musicSourceSchema,
  gameKindSchema,
  moderationActionSchema,
  createRoomSchema,
  createInviteSchema,
  joinSessionSchema,
  enqueueMusicSchema,
  musicControlSchema,
  moderationActionRequestSchema,
  moveInputSchema,
  chatSendSchema,
  websocketAuthSchema,
} from "../schemas";
import { WORLD_CONFIG, GAME_TABLES } from "../constants";

// ---------------------------------------------------------------------------
// Enum schemas
// ---------------------------------------------------------------------------

describe("directionSchema", () => {
  it.each(["up", "down", "left", "right"])("accepts '%s'", (v) => {
    expect(directionSchema.parse(v)).toBe(v);
  });

  it("rejects invalid direction", () => {
    expect(() => directionSchema.parse("north")).toThrow();
  });

  it("rejects empty string", () => {
    expect(() => directionSchema.parse("")).toThrow();
  });

  it("rejects non-string types", () => {
    expect(() => directionSchema.parse(1)).toThrow();
    expect(() => directionSchema.parse(null)).toThrow();
    expect(() => directionSchema.parse(undefined)).toThrow();
  });
});

describe("roleSchema", () => {
  it.each(["host", "dj", "member"])("accepts '%s'", (v) => {
    expect(roleSchema.parse(v)).toBe(v);
  });

  it("rejects invalid role", () => {
    expect(() => roleSchema.parse("admin")).toThrow();
  });
});

describe("musicSourceSchema", () => {
  it.each(["licensed", "spotify", "youtube"])("accepts '%s'", (v) => {
    expect(musicSourceSchema.parse(v)).toBe(v);
  });

  it("rejects invalid source", () => {
    expect(() => musicSourceSchema.parse("soundcloud")).toThrow();
  });
});

describe("gameKindSchema", () => {
  it.each(["chess", "ttt", "pictionary"])("accepts '%s'", (v) => {
    expect(gameKindSchema.parse(v)).toBe(v);
  });

  it("rejects invalid kind", () => {
    expect(() => gameKindSchema.parse("checkers")).toThrow();
  });
});

describe("moderationActionSchema", () => {
  it.each(["kick", "ban", "mute", "lock", "report"])("accepts '%s'", (v) => {
    expect(moderationActionSchema.parse(v)).toBe(v);
  });

  it("rejects invalid action", () => {
    expect(() => moderationActionSchema.parse("warn")).toThrow();
  });
});

// ---------------------------------------------------------------------------
// createRoomSchema
// ---------------------------------------------------------------------------

describe("createRoomSchema", () => {
  const valid = { roomName: "Study Lounge", hostName: "Alice" };

  it("accepts valid input", () => {
    expect(createRoomSchema.parse(valid)).toEqual(valid);
  });

  it("accepts roomName at min length (3)", () => {
    expect(createRoomSchema.parse({ roomName: "abc", hostName: "Al" })).toEqual({
      roomName: "abc",
      hostName: "Al",
    });
  });

  it("accepts roomName at max length (60)", () => {
    const name60 = "a".repeat(60);
    expect(createRoomSchema.parse({ roomName: name60, hostName: "Al" }).roomName).toBe(name60);
  });

  it("rejects roomName shorter than 3", () => {
    expect(() => createRoomSchema.parse({ roomName: "ab", hostName: "Alice" })).toThrow();
  });

  it("rejects roomName longer than 60", () => {
    expect(() =>
      createRoomSchema.parse({ roomName: "a".repeat(61), hostName: "Alice" })
    ).toThrow();
  });

  it("rejects empty roomName", () => {
    expect(() => createRoomSchema.parse({ roomName: "", hostName: "Alice" })).toThrow();
  });

  it("accepts hostName at min length (2)", () => {
    expect(createRoomSchema.parse({ roomName: "Room", hostName: "Ab" }).hostName).toBe("Ab");
  });

  it("accepts hostName at max length (32)", () => {
    const name32 = "b".repeat(32);
    expect(createRoomSchema.parse({ roomName: "Room", hostName: name32 }).hostName).toBe(name32);
  });

  it("rejects hostName shorter than 2", () => {
    expect(() => createRoomSchema.parse({ roomName: "Room", hostName: "A" })).toThrow();
  });

  it("rejects hostName longer than 32", () => {
    expect(() =>
      createRoomSchema.parse({ roomName: "Room", hostName: "b".repeat(33) })
    ).toThrow();
  });

  it("rejects missing fields", () => {
    expect(() => createRoomSchema.parse({})).toThrow();
    expect(() => createRoomSchema.parse({ roomName: "Room" })).toThrow();
    expect(() => createRoomSchema.parse({ hostName: "Alice" })).toThrow();
  });

  it("rejects non-string roomName", () => {
    expect(() => createRoomSchema.parse({ roomName: 123, hostName: "Alice" })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// createInviteSchema
// ---------------------------------------------------------------------------

describe("createInviteSchema", () => {
  const valid = { roomId: "room-1", createdBy: "user-1", ttlMinutes: 60 };

  it("accepts valid input", () => {
    expect(createInviteSchema.parse(valid)).toEqual(valid);
  });

  it("applies default ttlMinutes of 120 when omitted", () => {
    const result = createInviteSchema.parse({ roomId: "room-1", createdBy: "user-1" });
    expect(result.ttlMinutes).toBe(120);
  });

  it("accepts ttlMinutes at minimum (5)", () => {
    expect(
      createInviteSchema.parse({ roomId: "r", createdBy: "u", ttlMinutes: 5 }).ttlMinutes
    ).toBe(5);
  });

  it("accepts ttlMinutes at maximum (1440)", () => {
    expect(
      createInviteSchema.parse({ roomId: "r", createdBy: "u", ttlMinutes: 1440 }).ttlMinutes
    ).toBe(1440);
  });

  it("rejects ttlMinutes below 5", () => {
    expect(() =>
      createInviteSchema.parse({ roomId: "r", createdBy: "u", ttlMinutes: 4 })
    ).toThrow();
  });

  it("rejects ttlMinutes above 1440", () => {
    expect(() =>
      createInviteSchema.parse({ roomId: "r", createdBy: "u", ttlMinutes: 1441 })
    ).toThrow();
  });

  it("rejects non-integer ttlMinutes", () => {
    expect(() =>
      createInviteSchema.parse({ roomId: "r", createdBy: "u", ttlMinutes: 10.5 })
    ).toThrow();
  });

  it("rejects empty roomId", () => {
    expect(() =>
      createInviteSchema.parse({ roomId: "", createdBy: "u", ttlMinutes: 60 })
    ).toThrow();
  });

  it("rejects empty createdBy", () => {
    expect(() =>
      createInviteSchema.parse({ roomId: "r", createdBy: "", ttlMinutes: 60 })
    ).toThrow();
  });
});

// ---------------------------------------------------------------------------
// joinSessionSchema
// ---------------------------------------------------------------------------

describe("joinSessionSchema", () => {
  const valid = { inviteToken: "abcdefgh", userName: "Bob" };

  it("accepts valid input and applies default avatarColor", () => {
    const result = joinSessionSchema.parse(valid);
    expect(result).toEqual({ ...valid, avatarColor: "#3B82F6" });
  });

  it("accepts custom avatarColor (6-digit hex)", () => {
    const result = joinSessionSchema.parse({ ...valid, avatarColor: "#FF00AA" });
    expect(result.avatarColor).toBe("#FF00AA");
  });

  it("accepts 3-digit hex avatarColor", () => {
    const result = joinSessionSchema.parse({ ...valid, avatarColor: "#abc" });
    expect(result.avatarColor).toBe("#abc");
  });

  it("accepts lowercase hex avatarColor", () => {
    const result = joinSessionSchema.parse({ ...valid, avatarColor: "#ff00aa" });
    expect(result.avatarColor).toBe("#ff00aa");
  });

  it("accepts mixed-case hex avatarColor", () => {
    const result = joinSessionSchema.parse({ ...valid, avatarColor: "#aAbBcC" });
    expect(result.avatarColor).toBe("#aAbBcC");
  });

  it("rejects avatarColor without leading #", () => {
    expect(() => joinSessionSchema.parse({ ...valid, avatarColor: "FF00AA" })).toThrow();
  });

  it("rejects avatarColor with invalid hex chars", () => {
    expect(() => joinSessionSchema.parse({ ...valid, avatarColor: "#GGGGGG" })).toThrow();
  });

  it("rejects avatarColor with wrong length (4 hex digits)", () => {
    expect(() => joinSessionSchema.parse({ ...valid, avatarColor: "#abcd" })).toThrow();
  });

  it("rejects avatarColor with 5 hex digits", () => {
    expect(() => joinSessionSchema.parse({ ...valid, avatarColor: "#abcde" })).toThrow();
  });

  it("rejects avatarColor with 7 hex digits", () => {
    expect(() => joinSessionSchema.parse({ ...valid, avatarColor: "#abcdef0" })).toThrow();
  });

  it("rejects inviteToken shorter than 8", () => {
    expect(() => joinSessionSchema.parse({ inviteToken: "abcdefg", userName: "Bob" })).toThrow();
  });

  it("accepts inviteToken at exactly 8 chars", () => {
    expect(joinSessionSchema.parse({ inviteToken: "12345678", userName: "Bo" })).toBeDefined();
  });

  it("rejects userName shorter than 2", () => {
    expect(() => joinSessionSchema.parse({ inviteToken: "abcdefgh", userName: "B" })).toThrow();
  });

  it("rejects userName longer than 32", () => {
    expect(() =>
      joinSessionSchema.parse({ inviteToken: "abcdefgh", userName: "x".repeat(33) })
    ).toThrow();
  });

  it("accepts userName at max length (32)", () => {
    const result = joinSessionSchema.parse({
      inviteToken: "abcdefgh",
      userName: "x".repeat(32),
    });
    expect(result.userName).toHaveLength(32);
  });
});

// ---------------------------------------------------------------------------
// enqueueMusicSchema
// ---------------------------------------------------------------------------

describe("enqueueMusicSchema", () => {
  const valid = {
    roomId: "room-1",
    source: "spotify" as const,
    itemId: "track-1",
    title: "Chill Beats",
    requesterUserId: "user-1",
  };

  it("accepts valid input", () => {
    expect(enqueueMusicSchema.parse(valid)).toEqual(valid);
  });

  it.each(["licensed", "spotify", "youtube"] as const)(
    "accepts source '%s'",
    (source) => {
      expect(enqueueMusicSchema.parse({ ...valid, source }).source).toBe(source);
    }
  );

  it("rejects invalid source", () => {
    expect(() => enqueueMusicSchema.parse({ ...valid, source: "apple" })).toThrow();
  });

  it("rejects empty roomId", () => {
    expect(() => enqueueMusicSchema.parse({ ...valid, roomId: "" })).toThrow();
  });

  it("rejects empty itemId", () => {
    expect(() => enqueueMusicSchema.parse({ ...valid, itemId: "" })).toThrow();
  });

  it("rejects empty title", () => {
    expect(() => enqueueMusicSchema.parse({ ...valid, title: "" })).toThrow();
  });

  it("accepts title at max length (120)", () => {
    expect(
      enqueueMusicSchema.parse({ ...valid, title: "t".repeat(120) }).title
    ).toHaveLength(120);
  });

  it("rejects title longer than 120", () => {
    expect(() =>
      enqueueMusicSchema.parse({ ...valid, title: "t".repeat(121) })
    ).toThrow();
  });

  it("rejects empty requesterUserId", () => {
    expect(() => enqueueMusicSchema.parse({ ...valid, requesterUserId: "" })).toThrow();
  });

  it("rejects missing fields", () => {
    expect(() => enqueueMusicSchema.parse({ roomId: "r" })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// musicControlSchema
// ---------------------------------------------------------------------------

describe("musicControlSchema", () => {
  const valid = { roomId: "room-1", requesterUserId: "user-1", action: "play" as const };

  it("accepts valid input without seekPositionMs", () => {
    expect(musicControlSchema.parse(valid)).toEqual(valid);
  });

  it.each(["play", "pause", "skip", "seek"] as const)("accepts action '%s'", (action) => {
    expect(musicControlSchema.parse({ ...valid, action }).action).toBe(action);
  });

  it("rejects invalid action", () => {
    expect(() => musicControlSchema.parse({ ...valid, action: "rewind" })).toThrow();
  });

  it("accepts seekPositionMs when provided", () => {
    const result = musicControlSchema.parse({ ...valid, action: "seek", seekPositionMs: 5000 });
    expect(result.seekPositionMs).toBe(5000);
  });

  it("accepts seekPositionMs of 0", () => {
    const result = musicControlSchema.parse({ ...valid, seekPositionMs: 0 });
    expect(result.seekPositionMs).toBe(0);
  });

  it("rejects negative seekPositionMs", () => {
    expect(() => musicControlSchema.parse({ ...valid, seekPositionMs: -1 })).toThrow();
  });

  it("rejects non-integer seekPositionMs", () => {
    expect(() => musicControlSchema.parse({ ...valid, seekPositionMs: 1.5 })).toThrow();
  });

  it("rejects empty roomId", () => {
    expect(() => musicControlSchema.parse({ ...valid, roomId: "" })).toThrow();
  });

  it("rejects empty requesterUserId", () => {
    expect(() => musicControlSchema.parse({ ...valid, requesterUserId: "" })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// moderationActionRequestSchema
// ---------------------------------------------------------------------------

describe("moderationActionRequestSchema", () => {
  const valid = {
    roomId: "room-1",
    action: "kick" as const,
    actorUserId: "mod-1",
  };

  it("accepts valid input without optional fields", () => {
    expect(moderationActionRequestSchema.parse(valid)).toEqual(valid);
  });

  it("accepts valid input with all optional fields", () => {
    const full = { ...valid, targetUserId: "user-2", details: "spamming" };
    expect(moderationActionRequestSchema.parse(full)).toEqual(full);
  });

  it.each(["kick", "ban", "mute", "lock", "report"] as const)(
    "accepts action '%s'",
    (action) => {
      expect(moderationActionRequestSchema.parse({ ...valid, action }).action).toBe(action);
    }
  );

  it("rejects invalid action", () => {
    expect(() =>
      moderationActionRequestSchema.parse({ ...valid, action: "warn" })
    ).toThrow();
  });

  it("rejects empty roomId", () => {
    expect(() =>
      moderationActionRequestSchema.parse({ ...valid, roomId: "" })
    ).toThrow();
  });

  it("rejects empty actorUserId", () => {
    expect(() =>
      moderationActionRequestSchema.parse({ ...valid, actorUserId: "" })
    ).toThrow();
  });

  it("rejects empty targetUserId when provided", () => {
    expect(() =>
      moderationActionRequestSchema.parse({ ...valid, targetUserId: "" })
    ).toThrow();
  });

  it("accepts targetUserId as undefined (optional)", () => {
    const result = moderationActionRequestSchema.parse(valid);
    expect(result.targetUserId).toBeUndefined();
  });

  it("accepts details at max length (500)", () => {
    const result = moderationActionRequestSchema.parse({
      ...valid,
      details: "d".repeat(500),
    });
    expect(result.details).toHaveLength(500);
  });

  it("rejects details longer than 500", () => {
    expect(() =>
      moderationActionRequestSchema.parse({ ...valid, details: "d".repeat(501) })
    ).toThrow();
  });

  it("accepts empty details string (no min constraint)", () => {
    const result = moderationActionRequestSchema.parse({ ...valid, details: "" });
    expect(result.details).toBe("");
  });

  it("accepts details as undefined (optional)", () => {
    const result = moderationActionRequestSchema.parse(valid);
    expect(result.details).toBeUndefined();
  });
});

// ---------------------------------------------------------------------------
// moveInputSchema
// ---------------------------------------------------------------------------

describe("moveInputSchema", () => {
  const valid = { up: true, down: false, left: false, right: true };

  it("accepts valid input", () => {
    expect(moveInputSchema.parse(valid)).toEqual(valid);
  });

  it("accepts all false", () => {
    expect(
      moveInputSchema.parse({ up: false, down: false, left: false, right: false })
    ).toEqual({ up: false, down: false, left: false, right: false });
  });

  it("accepts all true", () => {
    expect(
      moveInputSchema.parse({ up: true, down: true, left: true, right: true })
    ).toEqual({ up: true, down: true, left: true, right: true });
  });

  it("rejects non-boolean values", () => {
    expect(() => moveInputSchema.parse({ up: 1, down: 0, left: 0, right: 0 })).toThrow();
    expect(() =>
      moveInputSchema.parse({ up: "true", down: "false", left: "false", right: "false" })
    ).toThrow();
  });

  it("rejects missing fields", () => {
    expect(() => moveInputSchema.parse({ up: true })).toThrow();
    expect(() => moveInputSchema.parse({ up: true, down: false })).toThrow();
    expect(() => moveInputSchema.parse({ up: true, down: false, left: false })).toThrow();
  });

  it("rejects null/undefined", () => {
    expect(() => moveInputSchema.parse(null)).toThrow();
    expect(() => moveInputSchema.parse(undefined)).toThrow();
  });
});

// ---------------------------------------------------------------------------
// chatSendSchema
// ---------------------------------------------------------------------------

describe("chatSendSchema", () => {
  it("accepts valid body", () => {
    expect(chatSendSchema.parse({ body: "Hello!" })).toEqual({ body: "Hello!" });
  });

  it("accepts body at min length (1)", () => {
    expect(chatSendSchema.parse({ body: "a" }).body).toBe("a");
  });

  it("accepts body at max length (500)", () => {
    const body500 = "c".repeat(500);
    expect(chatSendSchema.parse({ body: body500 }).body).toHaveLength(500);
  });

  it("rejects empty body", () => {
    expect(() => chatSendSchema.parse({ body: "" })).toThrow();
  });

  it("rejects body longer than 500", () => {
    expect(() => chatSendSchema.parse({ body: "c".repeat(501) })).toThrow();
  });

  it("rejects missing body", () => {
    expect(() => chatSendSchema.parse({})).toThrow();
  });

  it("rejects non-string body", () => {
    expect(() => chatSendSchema.parse({ body: 42 })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// websocketAuthSchema
// ---------------------------------------------------------------------------

describe("websocketAuthSchema", () => {
  const valid = { roomId: "room-1", token: "abcdefghijkl" };

  it("accepts valid input", () => {
    expect(websocketAuthSchema.parse(valid)).toEqual(valid);
  });

  it("accepts token at exactly 12 chars", () => {
    expect(
      websocketAuthSchema.parse({ roomId: "r", token: "123456789012" }).token
    ).toHaveLength(12);
  });

  it("rejects token shorter than 12", () => {
    expect(() =>
      websocketAuthSchema.parse({ roomId: "r", token: "12345678901" })
    ).toThrow();
  });

  it("accepts long token", () => {
    const longToken = "t".repeat(256);
    expect(websocketAuthSchema.parse({ roomId: "r", token: longToken }).token).toBe(longToken);
  });

  it("rejects empty roomId", () => {
    expect(() =>
      websocketAuthSchema.parse({ roomId: "", token: "abcdefghijkl" })
    ).toThrow();
  });

  it("rejects missing fields", () => {
    expect(() => websocketAuthSchema.parse({})).toThrow();
    expect(() => websocketAuthSchema.parse({ roomId: "r" })).toThrow();
    expect(() => websocketAuthSchema.parse({ token: "abcdefghijkl" })).toThrow();
  });
});

// ---------------------------------------------------------------------------
// Constants
// ---------------------------------------------------------------------------

describe("WORLD_CONFIG", () => {
  it("has expected tile size", () => {
    expect(WORLD_CONFIG.tileSize).toBe(32);
  });

  it("has expected width and height in tiles", () => {
    expect(WORLD_CONFIG.widthTiles).toBe(60);
    expect(WORLD_CONFIG.heightTiles).toBe(40);
  });

  it("has expected voice radius values", () => {
    expect(WORLD_CONFIG.nearVoiceRadiusTiles).toBe(1.5);
    expect(WORLD_CONFIG.farVoiceRadiusTiles).toBe(14);
  });

  it("has expected Hz rates", () => {
    expect(WORLD_CONFIG.serverSimulationHz).toBe(30);
    expect(WORLD_CONFIG.clientInputHz).toBe(20);
    expect(WORLD_CONFIG.patchRateHz).toBe(15);
  });

  it("has expected limits", () => {
    expect(WORLD_CONFIG.roomChatLimit).toBe(100);
    expect(WORLD_CONFIG.roomQueueLimit).toBe(100);
  });

  it("is frozen / readonly (all keys present)", () => {
    const expectedKeys = [
      "tileSize",
      "widthTiles",
      "heightTiles",
      "nearVoiceRadiusTiles",
      "farVoiceRadiusTiles",
      "serverSimulationHz",
      "clientInputHz",
      "patchRateHz",
      "roomChatLimit",
      "roomQueueLimit",
    ];
    expect(Object.keys(WORLD_CONFIG).sort()).toEqual(expectedKeys.sort());
  });
});

describe("GAME_TABLES", () => {
  it("has exactly 3 tables", () => {
    expect(GAME_TABLES).toHaveLength(3);
  });

  it("contains a chess table", () => {
    const chess = GAME_TABLES.find((t) => t.kind === "chess");
    expect(chess).toBeDefined();
    expect(chess!.tableId).toBe("table-chess-1");
    expect(chess!.x).toBe(16);
    expect(chess!.y).toBe(10);
  });

  it("contains a ttt table", () => {
    const ttt = GAME_TABLES.find((t) => t.kind === "ttt");
    expect(ttt).toBeDefined();
    expect(ttt!.tableId).toBe("table-ttt-1");
    expect(ttt!.x).toBe(28);
    expect(ttt!.y).toBe(12);
  });

  it("contains a pictionary table", () => {
    const pic = GAME_TABLES.find((t) => t.kind === "pictionary");
    expect(pic).toBeDefined();
    expect(pic!.tableId).toBe("table-pictionary-1");
    expect(pic!.x).toBe(42);
    expect(pic!.y).toBe(18);
  });

  it("each table has required shape", () => {
    for (const table of GAME_TABLES) {
      expect(typeof table.tableId).toBe("string");
      expect(typeof table.kind).toBe("string");
      expect(typeof table.x).toBe("number");
      expect(typeof table.y).toBe("number");
    }
  });

  it("has unique tableIds", () => {
    const ids = GAME_TABLES.map((t) => t.tableId);
    expect(new Set(ids).size).toBe(ids.length);
  });
});
