import { describe, it, expect } from "vitest";
import { calculateProximity } from "../proximity";
import type { AvatarState } from "@chillspace/protocol";
import { WORLD_CONFIG } from "@chillspace/protocol";

function makeAvatar(overrides: Partial<AvatarState> = {}): AvatarState {
  return {
    userId: "u1",
    name: "Test",
    color: "#ff0000",
    x: 0,
    y: 0,
    dir: "down",
    webcamOn: false,
    role: "member",
    ...overrides,
  };
}

describe("calculateProximity", () => {
  it("returns full gain when avatars overlap", () => {
    const self = makeAvatar({ x: 100, y: 100 });
    const other = makeAvatar({ userId: "u2", x: 100, y: 100 });
    const result = calculateProximity(self, other);
    expect(result.distanceTiles).toBe(0);
    expect(result.gain).toBe(1);
    expect(result.muted).toBe(false);
  });

  it("returns zero gain when beyond far radius", () => {
    const tileSize = WORLD_CONFIG.tileSize;
    const far = WORLD_CONFIG.farVoiceRadiusTiles;
    const self = makeAvatar({ x: 0, y: 0 });
    const other = makeAvatar({ userId: "u2", x: (far + 1) * tileSize, y: 0 });
    const result = calculateProximity(self, other);
    expect(result.gain).toBe(0);
    expect(result.muted).toBe(true);
  });

  it("returns muted=false within far radius", () => {
    const tileSize = WORLD_CONFIG.tileSize;
    const self = makeAvatar({ x: 0, y: 0 });
    const other = makeAvatar({ userId: "u2", x: tileSize * 5, y: 0 });
    const result = calculateProximity(self, other);
    expect(result.muted).toBe(false);
    expect(result.gain).toBeGreaterThan(0);
    expect(result.gain).toBeLessThanOrEqual(1);
  });

  it("computes pan based on horizontal offset", () => {
    const tileSize = WORLD_CONFIG.tileSize;
    const self = makeAvatar({ x: 100, y: 100 });
    const otherRight = makeAvatar({ userId: "u2", x: 100 + tileSize * 5, y: 100 });
    const otherLeft = makeAvatar({ userId: "u3", x: 100 - tileSize * 5, y: 100 });

    const rightResult = calculateProximity(self, otherRight);
    const leftResult = calculateProximity(self, otherLeft);

    expect(rightResult.pan).toBeGreaterThan(0);
    expect(leftResult.pan).toBeLessThan(0);
  });

  it("clamps pan to [-1, 1]", () => {
    const tileSize = WORLD_CONFIG.tileSize;
    const far = WORLD_CONFIG.farVoiceRadiusTiles;
    const self = makeAvatar({ x: 0, y: 0 });
    const farRight = makeAvatar({ userId: "u2", x: far * tileSize * 2, y: 0 });
    const result = calculateProximity(self, farRight);
    expect(result.pan).toBeLessThanOrEqual(1);
    expect(result.pan).toBeGreaterThanOrEqual(-1);
  });

  it("uses custom near and far radii", () => {
    const tileSize = WORLD_CONFIG.tileSize;
    const self = makeAvatar({ x: 0, y: 0 });
    const other = makeAvatar({ userId: "u2", x: tileSize * 3, y: 0 });

    const close = calculateProximity(self, other, 1, 5);
    const farAway = calculateProximity(self, other, 1, 2);

    expect(close.muted).toBe(false);
    expect(farAway.muted).toBe(true);
  });

  it("returns full gain within near radius", () => {
    const tileSize = WORLD_CONFIG.tileSize;
    const near = WORLD_CONFIG.nearVoiceRadiusTiles;
    const self = makeAvatar({ x: 0, y: 0 });
    const other = makeAvatar({ userId: "u2", x: tileSize * (near * 0.5), y: 0 });
    const result = calculateProximity(self, other);
    expect(result.gain).toBe(1);
  });

  it("computes diagonal distance correctly", () => {
    const tileSize = WORLD_CONFIG.tileSize;
    const self = makeAvatar({ x: 0, y: 0 });
    const other = makeAvatar({ userId: "u2", x: tileSize * 3, y: tileSize * 4 });
    const result = calculateProximity(self, other);
    expect(result.distanceTiles).toBeCloseTo(5, 5);
  });

  it("handles exactly at far radius boundary", () => {
    const tileSize = WORLD_CONFIG.tileSize;
    const far = WORLD_CONFIG.farVoiceRadiusTiles;
    const self = makeAvatar({ x: 0, y: 0 });
    const atBoundary = makeAvatar({ userId: "u2", x: far * tileSize, y: 0 });
    const result = calculateProximity(self, atBoundary);
    expect(result.muted).toBe(true);
    expect(result.gain).toBe(0);
  });

  it("handles exactly at near radius boundary", () => {
    const tileSize = WORLD_CONFIG.tileSize;
    const near = WORLD_CONFIG.nearVoiceRadiusTiles;
    const self = makeAvatar({ x: 0, y: 0 });
    const atNear = makeAvatar({ userId: "u2", x: near * tileSize, y: 0 });
    const result = calculateProximity(self, atNear);
    expect(result.gain).toBe(1);
    expect(result.muted).toBe(false);
  });
});
