import { WORLD_CONFIG, type AvatarState } from "@chillspace/protocol";

export interface ProximityResult {
  distanceTiles: number;
  gain: number;
  pan: number;
  muted: boolean;
}

export const calculateProximity = (
  self: AvatarState,
  other: AvatarState,
  nearTiles = WORLD_CONFIG.nearVoiceRadiusTiles,
  farTiles = WORLD_CONFIG.farVoiceRadiusTiles
): ProximityResult => {
  const tileSize = WORLD_CONFIG.tileSize;
  const dxTiles = (other.x - self.x) / tileSize;
  const dyTiles = (other.y - self.y) / tileSize;
  const distanceTiles = Math.sqrt(dxTiles * dxTiles + dyTiles * dyTiles);

  if (distanceTiles >= farTiles) {
    return {
      distanceTiles,
      gain: 0,
      pan: Math.max(-1, Math.min(1, dxTiles / farTiles)),
      muted: true
    };
  }

  const normalized = Math.max(0, Math.min(1, 1 - (distanceTiles - nearTiles) / (farTiles - nearTiles)));
  const gain = Math.pow(normalized, 2);
  const pan = Math.max(-1, Math.min(1, dxTiles / farTiles));

  return {
    distanceTiles,
    gain,
    pan,
    muted: false
  };
};
