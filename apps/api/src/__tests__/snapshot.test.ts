import { describe, it, expect } from "vitest";
import { getSnapshotKey } from "../lib/snapshot";

describe("getSnapshotKey", () => {
  it("returns correct Redis key format", () => {
    expect(getSnapshotKey("room123")).toBe("chillspace:room:room123:snapshot");
  });

  it("handles empty string", () => {
    expect(getSnapshotKey("")).toBe("chillspace:room::snapshot");
  });

  it("handles special characters in room ID", () => {
    expect(getSnapshotKey("abc-def_123")).toBe("chillspace:room:abc-def_123:snapshot");
  });
});
