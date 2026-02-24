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
      expect(typeof item.widthTiles).toBe("number");
      expect(typeof item.heightTiles).toBe("number");
      expect(typeof item.depth).toBe("number");
    }
  });

  it("includes game tables", () => {
    const gameTables = layout.filter((item) => item.textureKey === "tile_game_table");
    expect(gameTables.length).toBe(GAME_TABLES.length);
  });

  it("includes windows", () => {
    const windows = layout.filter((item) => item.textureKey === "tile_window");
    expect(windows.length).toBeGreaterThan(0);
  });

  it("includes bookshelves", () => {
    const shelves = layout.filter((item) => item.textureKey === "tile_bookshelf");
    expect(shelves.length).toBeGreaterThan(0);
  });

  it("includes plants", () => {
    const plants = layout.filter((item) => item.textureKey === "tile_plant");
    expect(plants.length).toBeGreaterThan(0);
  });

  it("includes lamps", () => {
    const lamps = layout.filter((item) => item.textureKey === "tile_lamp");
    expect(lamps.length).toBeGreaterThan(0);
  });

  it("includes rugs", () => {
    const rugs = layout.filter((item) => item.textureKey === "tile_rug");
    expect(rugs.length).toBeGreaterThan(0);
  });

  it("includes desks", () => {
    const desks = layout.filter((item) => item.textureKey === "tile_desk");
    expect(desks.length).toBeGreaterThan(0);
  });

  it("includes at least one cat", () => {
    const cats = layout.filter((item) => item.textureKey === "tile_cat");
    expect(cats.length).toBeGreaterThan(0);
  });

  it("includes cushions", () => {
    const cushions = layout.filter((item) =>
      item.textureKey === "tile_cushion_a" || item.textureKey === "tile_cushion_b"
    );
    expect(cushions.length).toBeGreaterThan(0);
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

  it("game table positions align with GAME_TABLES", () => {
    const gameTables = layout.filter((item) => item.textureKey === "tile_game_table");
    for (const table of GAME_TABLES) {
      const found = gameTables.find(
        (item) => item.tileX === table.x - 1 && item.tileY === table.y - 1
      );
      expect(found).toBeDefined();
    }
  });
});
