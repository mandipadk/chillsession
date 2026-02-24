import { describe, it, expect } from "vitest";
import { PictionaryTable } from "../game/pictionaryGame";

describe("PictionaryTable", () => {
  it("initializes with default state", () => {
    const game = new PictionaryTable("test-pic");
    const state = game.getState();
    expect(state.participants).toEqual([]);
    expect(state.drawerUserId).toBeNull();
    expect(state.strokes).toEqual([]);
    expect(state.guesses).toEqual([]);
    expect(state.round).toBe(1);
    expect(typeof state.currentWordHint).toBe("string");
    expect((state.currentWordHint as string).length).toBeGreaterThan(0);
  });

  it("first joiner becomes drawer", () => {
    const game = new PictionaryTable("test-pic");
    game.join("p1");
    expect(game.getState().drawerUserId).toBe("p1");
  });

  it("second joiner does not replace drawer", () => {
    const game = new PictionaryTable("test-pic");
    game.join("p1");
    game.join("p2");
    expect(game.getState().drawerUserId).toBe("p1");
  });

  it("drawer leaves, next participant becomes drawer", () => {
    const game = new PictionaryTable("test-pic");
    game.join("p1");
    game.join("p2");
    game.leave("p1");
    expect(game.getState().drawerUserId).toBe("p2");
  });

  it("all leave, drawer becomes null", () => {
    const game = new PictionaryTable("test-pic");
    game.join("p1");
    game.leave("p1");
    expect(game.getState().drawerUserId).toBeNull();
  });

  it("startRound resets strokes and guesses", () => {
    const game = new PictionaryTable("test-pic");
    game.join("p1");
    game.applyAction("p1", "stroke", {
      points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
      color: "#ff0000",
    });
    const result = game.applyAction("p1", "startRound", {});
    expect(result.changed).toBe(true);
    expect((result.state.strokes as unknown[]).length).toBe(0);
    expect((result.state.guesses as unknown[]).length).toBe(0);
    expect(result.state.drawerUserId).toBe("p1");
    expect(result.systemMessage).toContain("started");
  });

  it("only drawer can draw strokes", () => {
    const game = new PictionaryTable("test-pic");
    game.join("p1");
    game.join("p2");

    const result = game.applyAction("p2", "stroke", {
      points: [{ x: 0, y: 0 }],
    });
    expect(result.changed).toBe(false);
    expect(result.systemMessage).toContain("drawer");
  });

  it("drawer can add strokes", () => {
    const game = new PictionaryTable("test-pic");
    game.join("p1");

    const result = game.applyAction("p1", "stroke", {
      points: [{ x: 10, y: 20 }, { x: 30, y: 40 }],
      color: "#ff0000",
    });
    expect(result.changed).toBe(true);
    expect((result.state.strokes as unknown[]).length).toBe(1);
  });

  it("rejects empty strokes", () => {
    const game = new PictionaryTable("test-pic");
    game.join("p1");
    const result = game.applyAction("p1", "stroke", { points: [] });
    expect(result.changed).toBe(false);
    expect(result.systemMessage).toContain("Empty");
  });

  it("rejects stroke with invalid points", () => {
    const game = new PictionaryTable("test-pic");
    game.join("p1");
    const result = game.applyAction("p1", "stroke", {
      points: [{ x: "bad", y: "data" }],
    });
    expect(result.changed).toBe(false);
  });

  it("accepts guess from non-drawer", () => {
    const game = new PictionaryTable("test-pic");
    game.join("p1");
    game.join("p2");

    const result = game.applyAction("p2", "guess", { text: "something" });
    expect(result.changed).toBe(true);
    expect((result.state.guesses as unknown[]).length).toBe(1);
  });

  it("rejects empty guess", () => {
    const game = new PictionaryTable("test-pic");
    game.join("p1");
    const result = game.applyAction("p1", "guess", { text: "" });
    expect(result.changed).toBe(false);
    expect(result.systemMessage).toContain("empty");
  });

  it("clears strokes", () => {
    const game = new PictionaryTable("test-pic");
    game.join("p1");
    game.applyAction("p1", "stroke", {
      points: [{ x: 0, y: 0 }, { x: 1, y: 1 }],
    });
    const result = game.applyAction("p1", "clear", {});
    expect(result.changed).toBe(true);
    expect((result.state.strokes as unknown[]).length).toBe(0);
    expect(result.systemMessage).toContain("cleared");
  });

  it("unknown action returns unchanged", () => {
    const game = new PictionaryTable("test-pic");
    const result = game.applyAction("p1", "unknown", {});
    expect(result.changed).toBe(false);
  });

  it("auto-joins on action", () => {
    const game = new PictionaryTable("test-pic");
    game.applyAction("p1", "guess", { text: "test" });
    expect((game.getState().participants as string[])).toContain("p1");
  });

  it("word hint shows first letter only", () => {
    const game = new PictionaryTable("test-pic");
    const state = game.getState();
    const hint = state.currentWordHint as string;
    const underscoreCount = (hint.match(/_/g) ?? []).length;
    expect(underscoreCount).toBe(hint.length - 1);
  });

  it("hydrates from state", () => {
    const game = new PictionaryTable("test-pic");
    game.hydrate({
      participants: ["p1", "p2"],
      drawerUserId: "p1",
      currentWordHint: "c_____",
      strokes: [{ id: "s1", color: "#fff", points: [{ x: 0, y: 0 }] }],
      guesses: [{ userId: "p2", text: "cat", correct: false }],
      round: 3,
    });

    const state = game.getState();
    expect((state.participants as string[]).length).toBe(2);
    expect(state.drawerUserId).toBe("p1");
    expect((state.strokes as unknown[]).length).toBe(1);
    expect((state.guesses as unknown[]).length).toBe(1);
    expect(state.round).toBe(3);
  });

  it("hydrate filters invalid strokes", () => {
    const game = new PictionaryTable("test-pic");
    game.hydrate({
      strokes: [null, "bad", { id: "s1", color: "#fff", points: [] }],
    });
    expect((game.getState().strokes as unknown[]).length).toBe(0);
  });

  it("hydrate filters invalid guesses", () => {
    const game = new PictionaryTable("test-pic");
    game.hydrate({
      guesses: [null, "bad", { userId: 123 }],
    });
    expect((game.getState().guesses as unknown[]).length).toBe(0);
  });
});
