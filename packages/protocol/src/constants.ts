export const WORLD_CONFIG = {
  tileSize: 32,
  widthTiles: 60,
  heightTiles: 40,
  nearVoiceRadiusTiles: 1.5,
  farVoiceRadiusTiles: 14,
  serverSimulationHz: 30,
  clientInputHz: 20,
  patchRateHz: 15,
  roomChatLimit: 100,
  roomQueueLimit: 100
} as const;

export const GAME_TABLES = [
  { tableId: "table-chess-1", kind: "chess", x: 16, y: 10 },
  { tableId: "table-ttt-1", kind: "ttt", x: 28, y: 12 },
  { tableId: "table-pictionary-1", kind: "pictionary", x: 42, y: 18 }
] as const;
