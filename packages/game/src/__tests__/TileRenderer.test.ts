import { describe, it, expect } from "vitest";
import { buildRoomLayout } from "../TileRenderer";
import { GAME_TABLES } from "@chillspace/protocol";

describe("buildRoomLayout", () => {
  const layout = buildRoomLayout();

  it("returns an array of furniture items", () => {
    expect(Array.isArray(layout)).toBe(true);
    expect(layout.length).toBeGreaterThan(0);
  });

  it("each item has required properties", () => {
    for (const item of layout) {
      expect(item).toHaveProperty("tileX");
      expect(item).toHaveProperty("tileY");
      expect(item).toHaveProperty("textureKey");
      expect(item).toHaveProperty("widthTiles");
      expect(item).toHaveProperty("heightTiles");
      expect(item).toHaveProperty("depth");
      expect(typeof item.tileX).toBe("number");
      expect(typeof item.tileY).toBe("number");
      expect(typeof item.textureKey).toBe("string");
    }
  });

  it("includes one item per GAME_TABLE", () => {
    expect(layout.length).toBe(GAME_TABLES.length);
  });

  it("game table positions align with GAME_TABLES", () => {
    for (const table of GAME_TABLES) {
      const found = layout.find(
        (item) => item.tileX === table.x - 1 && item.tileY === table.y - 1
      );
      expect(found).toBeDefined();
    }
  });

  it("all tile positions are non-negative", () => {
    for (const item of layout) {
      expect(item.tileX).toBeGreaterThanOrEqual(0);
      expect(item.tileY).toBeGreaterThanOrEqual(0);
    }
  });

  it("all dimensions are positive", () => {
    for (const item of layout) {
      expect(item.widthTiles).toBeGreaterThan(0);
      expect(item.heightTiles).toBeGreaterThan(0);
    }
  });
});
