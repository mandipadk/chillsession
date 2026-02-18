import type { PlaybackState } from "@chillspace/protocol";
import type { NowFn, PlaybackSyncStatus } from "./types";

export const getExpectedPositionMs = (
  playback: PlaybackState,
  nowEpochMs: number
): number => {
  if (!playback.isPlaying) {
    return playback.positionMs;
  }

  const elapsedMs = Math.max(0, nowEpochMs - playback.startedAtEpochMs);
  return playback.positionMs + elapsedMs;
};

export const evaluatePlaybackDrift = (
  playback: PlaybackState,
  localPositionMs: number,
  now: NowFn = () => Date.now(),
  thresholdMs = 250
): PlaybackSyncStatus => {
  const expectedPositionMs = getExpectedPositionMs(playback, now());
  const driftMs = Math.abs(expectedPositionMs - localPositionMs);

  return {
    expectedPositionMs,
    driftMs,
    shouldResync: driftMs > thresholdMs
  };
};
