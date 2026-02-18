import { Chess } from "chess.js";
import type { GameRuntime, GameActionResult } from "./types";

export class ChessTable implements GameRuntime {
  readonly kind = "chess" as const;
  private engine = new Chess();
  private participants = new Set<string>();

  constructor(public readonly tableId: string) {}

  join(userId: string): void {
    this.participants.add(userId);
  }

  leave(userId: string): void {
    this.participants.delete(userId);
  }

  getState(): Record<string, unknown> {
    return {
      fen: this.engine.fen(),
      turn: this.engine.turn(),
      history: this.engine.history(),
      participants: Array.from(this.participants)
    };
  }

  hydrate(state: Record<string, unknown>): void {
    const fen = typeof state.fen === "string" ? state.fen : null;
    if (fen) {
      try {
        this.engine = new Chess(fen);
      } catch {
        this.engine = new Chess();
      }
    }

    this.participants.clear();
    if (Array.isArray(state.participants)) {
      for (const participant of state.participants) {
        if (typeof participant === "string") {
          this.participants.add(participant);
        }
      }
    }
  }

  applyAction(
    userId: string,
    action: string,
    payload: Record<string, unknown>
  ): GameActionResult {
    if (!this.participants.has(userId)) {
      this.participants.add(userId);
    }

    if (action === "reset") {
      this.engine = new Chess();
      return {
        changed: true,
        state: this.getState(),
        systemMessage: "Chess board reset."
      };
    }

    if (action === "move") {
      const from = typeof payload.from === "string" ? payload.from : "";
      const to = typeof payload.to === "string" ? payload.to : "";
      const promotion = typeof payload.promotion === "string" ? payload.promotion : undefined;
      const moveInput =
        promotion !== undefined ? { from, to, promotion } : { from, to };

      try {
        const move = this.engine.move(moveInput);
        if (!move) {
          return {
            changed: false,
            state: this.getState(),
            systemMessage: "Illegal move."
          };
        }

        const baseResult: GameActionResult = {
          changed: true,
          state: this.getState(),
          systemMessage: `${userId} played ${move.san}`
        };

        if (this.engine.isGameOver()) {
          baseResult.systemMessage = this.engine.isCheckmate()
            ? `${userId} delivered checkmate.`
            : "Chess game ended in draw.";
        }

        return baseResult;
      } catch {
        return {
          changed: false,
          state: this.getState(),
          systemMessage: "Invalid move payload."
        };
      }
    }

    return { changed: false, state: this.getState() };
  }
}
