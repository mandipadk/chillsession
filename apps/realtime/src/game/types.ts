import type { GameKind } from "@chillspace/protocol";

export interface GameActionResult {
  changed: boolean;
  state: Record<string, unknown>;
  systemMessage?: string;
}

export interface GameRuntime {
  readonly tableId: string;
  readonly kind: GameKind;
  join: (userId: string) => void;
  leave: (userId: string) => void;
  getState: () => Record<string, unknown>;
  hydrate: (state: Record<string, unknown>) => void;
  applyAction: (
    userId: string,
    action: string,
    payload: Record<string, unknown>
  ) => GameActionResult;
}
