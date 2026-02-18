import { GAME_TABLES } from "@chillspace/protocol";
import { ChessTable } from "./chessGame";
import { PictionaryTable } from "./pictionaryGame";
import { TicTacToeTable } from "./tttGame";
import type { GameRuntime } from "./types";

export const createGameTables = (): Map<string, GameRuntime> => {
  const tableMap = new Map<string, GameRuntime>();

  for (const table of GAME_TABLES) {
    if (table.kind === "chess") {
      tableMap.set(table.tableId, new ChessTable(table.tableId));
      continue;
    }

    if (table.kind === "ttt") {
      tableMap.set(table.tableId, new TicTacToeTable(table.tableId));
      continue;
    }

    if (table.kind === "pictionary") {
      tableMap.set(table.tableId, new PictionaryTable(table.tableId));
    }
  }

  return tableMap;
};
