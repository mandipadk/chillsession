import { describe, it, expect } from "vitest";
import { createGameTables } from "../game/createTables";
import { GAME_TABLES } from "@chillspace/protocol";

describe("createGameTables", () => {
  it("creates one table for each GAME_TABLE entry", () => {
    const tables = createGameTables();
    expect(tables.size).toBe(GAME_TABLES.length);
  });

  it("creates table with correct IDs", () => {
    const tables = createGameTables();
    for (const table of GAME_TABLES) {
      expect(tables.has(table.tableId)).toBe(true);
    }
  });

  it("creates chess table with correct kind", () => {
    const tables = createGameTables();
    const chess = tables.get("table-chess-1");
    expect(chess).toBeDefined();
    expect(chess!.kind).toBe("chess");
  });

  it("creates ttt table with correct kind", () => {
    const tables = createGameTables();
    const ttt = tables.get("table-ttt-1");
    expect(ttt).toBeDefined();
    expect(ttt!.kind).toBe("ttt");
  });

  it("creates pictionary table with correct kind", () => {
    const tables = createGameTables();
    const pic = tables.get("table-pictionary-1");
    expect(pic).toBeDefined();
    expect(pic!.kind).toBe("pictionary");
  });

  it("each table has required methods", () => {
    const tables = createGameTables();
    for (const [, table] of tables) {
      expect(typeof table.join).toBe("function");
      expect(typeof table.leave).toBe("function");
      expect(typeof table.getState).toBe("function");
      expect(typeof table.hydrate).toBe("function");
      expect(typeof table.applyAction).toBe("function");
    }
  });

  it("each table returns valid initial state", () => {
    const tables = createGameTables();
    for (const [, table] of tables) {
      const state = table.getState();
      expect(typeof state).toBe("object");
      expect(state).not.toBeNull();
    }
  });
});
