import { describe, it, expect } from "vitest";
import { TicTacToeTable } from "../game/tttGame";

describe("TicTacToeTable", () => {
  it("initializes with empty board", () => {
    const game = new TicTacToeTable("test-ttt");
    const state = game.getState();
    expect(state.board).toEqual(Array(9).fill(null));
    expect(state.turn).toBe("X");
    expect(state.winner).toBeNull();
    expect(state.participants).toEqual([]);
  });

  it("allows players to join", () => {
    const game = new TicTacToeTable("test-ttt");
    const result = game.applyAction("p1", "join", {});
    expect(result.changed).toBe(true);
    expect((result.state.participants as string[]).length).toBe(1);
    expect(result.systemMessage).toContain("joined");
  });

  it("limits to 2 participants", () => {
    const game = new TicTacToeTable("test-ttt");
    game.join("p1");
    game.join("p2");
    game.join("p3");
    const state = game.getState();
    expect((state.participants as string[]).length).toBe(2);
  });

  it("does not add duplicate participants", () => {
    const game = new TicTacToeTable("test-ttt");
    game.join("p1");
    game.join("p1");
    const state = game.getState();
    expect((state.participants as string[]).length).toBe(1);
  });

  it("allows valid moves", () => {
    const game = new TicTacToeTable("test-ttt");
    game.join("p1");
    game.join("p2");

    const result = game.applyAction("p1", "move", { index: 0 });
    expect(result.changed).toBe(true);
    expect((result.state.board as string[])[0]).toBe("X");
    expect(result.state.turn).toBe("O");
  });

  it("rejects move on occupied cell", () => {
    const game = new TicTacToeTable("test-ttt");
    game.join("p1");
    game.join("p2");

    game.applyAction("p1", "move", { index: 0 });
    const result = game.applyAction("p2", "move", { index: 0 });
    expect(result.changed).toBe(false);
    expect(result.systemMessage).toContain("rejected");
  });

  it("rejects move when not player's turn", () => {
    const game = new TicTacToeTable("test-ttt");
    game.join("p1");
    game.join("p2");

    const result = game.applyAction("p2", "move", { index: 0 });
    expect(result.changed).toBe(false);
    expect(result.systemMessage).toContain("turn");
  });

  it("rejects invalid move index", () => {
    const game = new TicTacToeTable("test-ttt");
    game.join("p1");
    const result = game.applyAction("p1", "move", { index: 9 });
    expect(result.changed).toBe(false);
    expect(result.systemMessage).toContain("Invalid");
  });

  it("rejects negative move index", () => {
    const game = new TicTacToeTable("test-ttt");
    game.join("p1");
    const result = game.applyAction("p1", "move", { index: -1 });
    expect(result.changed).toBe(false);
  });

  it("detects X winning", () => {
    const game = new TicTacToeTable("test-ttt");
    game.join("p1");
    game.join("p2");

    game.applyAction("p1", "move", { index: 0 }); // X
    game.applyAction("p2", "move", { index: 3 }); // O
    game.applyAction("p1", "move", { index: 1 }); // X
    game.applyAction("p2", "move", { index: 4 }); // O
    const result = game.applyAction("p1", "move", { index: 2 }); // X wins

    expect(result.changed).toBe(true);
    expect(result.state.winner).toBe("X");
    expect(result.systemMessage).toContain("X");
  });

  it("detects draw", () => {
    const game = new TicTacToeTable("test-ttt");
    game.join("p1");
    game.join("p2");

    // X O X
    // X X O
    // O X O
    game.applyAction("p1", "move", { index: 0 }); // X
    game.applyAction("p2", "move", { index: 1 }); // O
    game.applyAction("p1", "move", { index: 2 }); // X
    game.applyAction("p2", "move", { index: 5 }); // O
    game.applyAction("p1", "move", { index: 3 }); // X
    game.applyAction("p2", "move", { index: 6 }); // O
    game.applyAction("p1", "move", { index: 4 }); // X
    game.applyAction("p2", "move", { index: 8 }); // O
    const result = game.applyAction("p1", "move", { index: 7 }); // X - draw

    expect(result.state.winner).toBe("draw");
  });

  it("rejects moves after game is won", () => {
    const game = new TicTacToeTable("test-ttt");
    game.join("p1");
    game.join("p2");

    game.applyAction("p1", "move", { index: 0 });
    game.applyAction("p2", "move", { index: 3 });
    game.applyAction("p1", "move", { index: 1 });
    game.applyAction("p2", "move", { index: 4 });
    game.applyAction("p1", "move", { index: 2 }); // X wins

    const result = game.applyAction("p2", "move", { index: 5 });
    expect(result.changed).toBe(false);
  });

  it("resets the board", () => {
    const game = new TicTacToeTable("test-ttt");
    game.join("p1");
    game.applyAction("p1", "move", { index: 0 });

    const result = game.applyAction("p1", "reset", {});
    expect(result.changed).toBe(true);
    expect(result.state.board).toEqual(Array(9).fill(null));
    expect(result.state.turn).toBe("X");
    expect(result.state.winner).toBeNull();
  });

  it("handles unknown actions", () => {
    const game = new TicTacToeTable("test-ttt");
    const result = game.applyAction("p1", "unknown", {});
    expect(result.changed).toBe(false);
  });

  it("hydrates from saved state", () => {
    const game = new TicTacToeTable("test-ttt");
    game.hydrate({
      board: ["X", null, "O", null, "X", null, null, null, null],
      participants: ["p1", "p2"],
      turn: "O",
      winner: null,
    });

    const state = game.getState();
    expect((state.board as Array<string | null>)[0]).toBe("X");
    expect((state.board as Array<string | null>)[2]).toBe("O");
    expect(state.turn).toBe("O");
    expect((state.participants as string[]).length).toBe(2);
  });

  it("hydrates with invalid board gracefully", () => {
    const game = new TicTacToeTable("test-ttt");
    game.hydrate({ board: [1, 2, 3, 4, 5, 6, 7, 8, 9] });
    const state = game.getState();
    expect((state.board as Array<null>).every((c) => c === null)).toBe(true);
  });

  it("leave removes participant", () => {
    const game = new TicTacToeTable("test-ttt");
    game.join("p1");
    game.leave("p1");
    expect((game.getState().participants as string[]).length).toBe(0);
  });
});
