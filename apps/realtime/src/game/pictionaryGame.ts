import { nanoid } from "nanoid";
import type { GameRuntime, GameActionResult } from "./types";

const DEFAULT_WORDS = ["notebook", "headphones", "coffee", "rocket", "library", "moon"];

interface Stroke {
  id: string;
  color: string;
  points: Array<{ x: number; y: number }>;
}

export class PictionaryTable implements GameRuntime {
  readonly kind = "pictionary" as const;
  private participants = new Set<string>();
  private drawerUserId: string | null = null;
  private currentWord = DEFAULT_WORDS[Math.floor(Math.random() * DEFAULT_WORDS.length)]!;
  private strokes: Stroke[] = [];
  private guesses: Array<{ userId: string; text: string; correct: boolean }> = [];
  private round = 1;

  constructor(public readonly tableId: string) {}

  join(userId: string): void {
    this.participants.add(userId);
    if (!this.drawerUserId) {
      this.drawerUserId = userId;
    }
  }

  leave(userId: string): void {
    this.participants.delete(userId);
    if (this.drawerUserId === userId) {
      this.drawerUserId = Array.from(this.participants)[0] ?? null;
    }
  }

  getState(): Record<string, unknown> {
    return {
      participants: Array.from(this.participants),
      drawerUserId: this.drawerUserId,
      currentWordHint: this.currentWord[0] + "_".repeat(Math.max(0, this.currentWord.length - 1)),
      strokes: this.strokes,
      guesses: this.guesses,
      round: this.round
    };
  }

  hydrate(state: Record<string, unknown>): void {
    this.participants.clear();
    if (Array.isArray(state.participants)) {
      for (const participant of state.participants) {
        if (typeof participant === "string") {
          this.participants.add(participant);
        }
      }
    }

    this.drawerUserId = typeof state.drawerUserId === "string" ? state.drawerUserId : null;

    if (typeof state.currentWordHint === "string" && state.currentWordHint.length > 0) {
      // Word hint is persisted publicly; on restore we keep round continuity with a random internal word.
      this.currentWord = DEFAULT_WORDS[Math.floor(Math.random() * DEFAULT_WORDS.length)]!;
    }

    if (Array.isArray(state.strokes)) {
      this.strokes = state.strokes
        .map((stroke) => {
          if (typeof stroke !== "object" || stroke === null) {
            return null;
          }

          const candidate = stroke as {
            id?: unknown;
            color?: unknown;
            points?: unknown;
          };

          const points = Array.isArray(candidate.points)
            ? candidate.points
                .map((point) => {
                  if (
                    typeof point === "object" &&
                    point !== null &&
                    typeof (point as { x?: unknown }).x === "number" &&
                    typeof (point as { y?: unknown }).y === "number"
                  ) {
                    return {
                      x: (point as { x: number }).x,
                      y: (point as { y: number }).y
                    };
                  }
                  return null;
                })
                .filter((point): point is { x: number; y: number } => Boolean(point))
            : [];

          if (points.length === 0) {
            return null;
          }

          return {
            id: typeof candidate.id === "string" ? candidate.id : nanoid(8),
            color: typeof candidate.color === "string" ? candidate.color : "#f8fafc",
            points
          };
        })
        .filter((stroke): stroke is Stroke => Boolean(stroke));
    }

    if (Array.isArray(state.guesses)) {
      this.guesses = state.guesses
        .map((guess) => {
          if (typeof guess !== "object" || guess === null) {
            return null;
          }

          const candidate = guess as {
            userId?: unknown;
            text?: unknown;
            correct?: unknown;
          };

          if (typeof candidate.userId !== "string" || typeof candidate.text !== "string") {
            return null;
          }

          return {
            userId: candidate.userId,
            text: candidate.text,
            correct: Boolean(candidate.correct)
          };
        })
        .filter((guess): guess is { userId: string; text: string; correct: boolean } => Boolean(guess));
    }

    if (typeof state.round === "number" && Number.isFinite(state.round)) {
      this.round = Math.max(1, Math.floor(state.round));
    }
  }

  applyAction(
    userId: string,
    action: string,
    payload: Record<string, unknown>
  ): GameActionResult {
    if (!this.participants.has(userId)) {
      this.join(userId);
    }

    if (action === "startRound") {
      this.round += 1;
      this.strokes = [];
      this.guesses = [];
      this.currentWord = DEFAULT_WORDS[Math.floor(Math.random() * DEFAULT_WORDS.length)]!;
      this.drawerUserId = userId;

      return {
        changed: true,
        state: this.getState(),
        systemMessage: `${userId} started a new Pictionary round.`
      };
    }

    if (action === "stroke") {
      if (this.drawerUserId !== userId) {
        return {
          changed: false,
          state: this.getState(),
          systemMessage: "Only the drawer can draw."
        };
      }

      const points = Array.isArray(payload.points)
        ? payload.points
            .map((point) => {
              if (
                typeof point === "object" &&
                point !== null &&
                typeof (point as { x?: unknown }).x === "number" &&
                typeof (point as { y?: unknown }).y === "number"
              ) {
                return {
                  x: (point as { x: number }).x,
                  y: (point as { y: number }).y
                };
              }
              return null;
            })
            .filter((point): point is { x: number; y: number } => Boolean(point))
        : [];

      if (points.length === 0) {
        return {
          changed: false,
          state: this.getState(),
          systemMessage: "Empty stroke ignored."
        };
      }

      this.strokes.push({
        id: nanoid(8),
        color: typeof payload.color === "string" ? payload.color : "#f8fafc",
        points
      });

      return {
        changed: true,
        state: this.getState()
      };
    }

    if (action === "guess") {
      const text = String(payload.text ?? "").trim().toLowerCase();
      if (!text) {
        return {
          changed: false,
          state: this.getState(),
          systemMessage: "Guess cannot be empty."
        };
      }

      const correct = text === this.currentWord.toLowerCase();
      this.guesses.push({ userId, text, correct });

      const result: GameActionResult = {
        changed: true,
        state: this.getState(),
        systemMessage: correct ? `${userId} guessed the word!` : `${userId} guessed \"${text}\"`
      };

      if (correct) {
        this.round += 1;
        this.strokes = [];
        this.currentWord = DEFAULT_WORDS[Math.floor(Math.random() * DEFAULT_WORDS.length)]!;
      }

      return result;
    }

    if (action === "clear") {
      this.strokes = [];
      return {
        changed: true,
        state: this.getState(),
        systemMessage: `${userId} cleared the board.`
      };
    }

    return { changed: false, state: this.getState() };
  }
}
