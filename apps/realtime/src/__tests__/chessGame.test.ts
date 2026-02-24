import { describe, it, expect } from "vitest";
import { ChessTable } from "../game/chessGame";

describe("ChessTable", () => {
  it("initializes with starting position", () => {
    const game = new ChessTable("test-chess");
    const state = game.getState();
    expect(state.fen).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    expect(state.turn).toBe("w");
    expect(state.history).toEqual([]);
    expect(state.participants).toEqual([]);
  });

  it("allows valid move", () => {
    const game = new ChessTable("test-chess");
    const result = game.applyAction("p1", "move", { from: "e2", to: "e4" });
    expect(result.changed).toBe(true);
    expect(result.systemMessage).toContain("e4");
  });

  it("auto-joins on action", () => {
    const game = new ChessTable("test-chess");
    game.applyAction("p1", "move", { from: "e2", to: "e4" });
    const state = game.getState();
    expect((state.participants as string[])).toContain("p1");
  });

  it("rejects illegal move", () => {
    const game = new ChessTable("test-chess");
    const result = game.applyAction("p1", "move", { from: "e2", to: "e5" });
    expect(result.changed).toBe(false);
  });

  it("resets the board", () => {
    const game = new ChessTable("test-chess");
    game.applyAction("p1", "move", { from: "e2", to: "e4" });
    const result = game.applyAction("p1", "reset", {});
    expect(result.changed).toBe(true);
    expect(result.state.fen).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
    expect(result.systemMessage).toContain("reset");
  });

  it("handles unknown action", () => {
    const game = new ChessTable("test-chess");
    const result = game.applyAction("p1", "unknown", {});
    expect(result.changed).toBe(false);
  });

  it("handles invalid move payload", () => {
    const game = new ChessTable("test-chess");
    const result = game.applyAction("p1", "move", { from: 123, to: true });
    expect(result.changed).toBe(false);
  });

  it("tracks move history", () => {
    const game = new ChessTable("test-chess");
    game.applyAction("p1", "move", { from: "e2", to: "e4" });
    game.applyAction("p2", "move", { from: "e7", to: "e5" });
    const state = game.getState();
    expect((state.history as string[]).length).toBe(2);
  });

  it("join and leave manage participants", () => {
    const game = new ChessTable("test-chess");
    game.join("p1");
    game.join("p2");
    expect((game.getState().participants as string[]).length).toBe(2);
    game.leave("p1");
    expect((game.getState().participants as string[]).length).toBe(1);
    expect((game.getState().participants as string[])).not.toContain("p1");
  });

  it("hydrates from FEN", () => {
    const game = new ChessTable("test-chess");
    const fen = "rnbqkbnr/pppppppp/8/8/4P3/8/PPPP1PPP/RNBQKBNR b KQkq - 0 1";
    game.hydrate({ fen, participants: ["p1"] });
    expect(game.getState().fen).toBe(fen);
    expect(game.getState().turn).toBe("b");
  });

  it("hydrates with invalid FEN falls back to starting position", () => {
    const game = new ChessTable("test-chess");
    game.hydrate({ fen: "invalid_fen" });
    expect(game.getState().fen).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  });

  it("hydrates without FEN keeps starting position", () => {
    const game = new ChessTable("test-chess");
    game.hydrate({});
    expect(game.getState().fen).toBe("rnbqkbnr/pppppppp/8/8/8/8/PPPPPPPP/RNBQKBNR w KQkq - 0 1");
  });

  it("handles promotion move", () => {
    const game = new ChessTable("test-chess");
    game.hydrate({ fen: "8/4P3/8/8/8/8/8/4K2k w - - 0 1" });
    const result = game.applyAction("p1", "move", { from: "e7", to: "e8", promotion: "q" });
    expect(result.changed).toBe(true);
  });
});
