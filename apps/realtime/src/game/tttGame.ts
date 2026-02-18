import type { GameRuntime, GameActionResult } from "./types";

const WIN_LINES: Array<[number, number, number]> = [
  [0, 1, 2],
  [3, 4, 5],
  [6, 7, 8],
  [0, 3, 6],
  [1, 4, 7],
  [2, 5, 8],
  [0, 4, 8],
  [2, 4, 6]
];

export class TicTacToeTable implements GameRuntime {
  readonly kind = "ttt" as const;
  private board: Array<"X" | "O" | null> = Array(9).fill(null);
  private participants: string[] = [];
  private turn: "X" | "O" = "X";
  private winner: "X" | "O" | "draw" | null = null;

  constructor(public readonly tableId: string) {}

  join(userId: string): void {
    if (!this.participants.includes(userId) && this.participants.length < 2) {
      this.participants.push(userId);
    }
  }

  leave(userId: string): void {
    this.participants = this.participants.filter((id) => id !== userId);
  }

  getState(): Record<string, unknown> {
    return {
      board: this.board,
      participants: this.participants,
      turn: this.turn,
      winner: this.winner
    };
  }

  hydrate(state: Record<string, unknown>): void {
    if (Array.isArray(state.board) && state.board.length === 9) {
      this.board = state.board.map((cell) => {
        if (cell === "X" || cell === "O") {
          return cell;
        }
        return null;
      });
    }

    if (Array.isArray(state.participants)) {
      this.participants = state.participants.filter(
        (participant): participant is string => typeof participant === "string"
      );
    }

    if (state.turn === "X" || state.turn === "O") {
      this.turn = state.turn;
    }

    if (state.winner === "X" || state.winner === "O" || state.winner === "draw" || state.winner === null) {
      this.winner = state.winner;
    }
  }

  applyAction(
    userId: string,
    action: string,
    payload: Record<string, unknown>
  ): GameActionResult {
    if (action === "join") {
      this.join(userId);
      return {
        changed: true,
        state: this.getState(),
        systemMessage: `${userId} joined Tic-Tac-Toe.`
      };
    }

    if (action === "reset") {
      this.board = Array(9).fill(null);
      this.turn = "X";
      this.winner = null;
      return {
        changed: true,
        state: this.getState(),
        systemMessage: "Tic-Tac-Toe board reset."
      };
    }

    if (action !== "move") {
      return { changed: false, state: this.getState() };
    }

    const index = Number(payload.index);
    if (!Number.isInteger(index) || index < 0 || index > 8) {
      return {
        changed: false,
        state: this.getState(),
        systemMessage: "Invalid move index."
      };
    }

    if (this.winner || this.board[index]) {
      return {
        changed: false,
        state: this.getState(),
        systemMessage: "Move rejected."
      };
    }

    const currentPlayerIndex = this.turn === "X" ? 0 : 1;
    if (this.participants[currentPlayerIndex] !== userId) {
      return {
        changed: false,
        state: this.getState(),
        systemMessage: `It is ${this.turn}'s turn.`
      };
    }

    this.board[index] = this.turn;
    this.winner = this.findWinner();

    if (!this.winner) {
      this.turn = this.turn === "X" ? "O" : "X";
    }

    return {
      changed: true,
      state: this.getState(),
      systemMessage: this.winner ? `Game result: ${this.winner}` : `${userId} played at ${index}`
    };
  }

  private findWinner(): "X" | "O" | "draw" | null {
    for (const [a, b, c] of WIN_LINES) {
      const first = this.board[a];
      if (first && first === this.board[b] && first === this.board[c]) {
        return first;
      }
    }

    if (this.board.every((cell) => cell !== null)) {
      return "draw";
    }

    return null;
  }
}
