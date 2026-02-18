import type { PlaybackState } from "@chillspace/protocol";
import type { PlaybackReducerAction, PlaybackReducerResult } from "./types";

export const reducePlayback = (
  playback: PlaybackState,
  action: PlaybackReducerAction,
  nowEpochMs = Date.now()
): PlaybackReducerResult => {
  switch (action.type) {
    case "play": {
      if (playback.isPlaying) {
        return { playback, consumedCurrentTrack: false };
      }

      return {
        playback: {
          ...playback,
          isPlaying: true,
          startedAtEpochMs: nowEpochMs
        },
        consumedCurrentTrack: false
      };
    }

    case "pause": {
      if (!playback.isPlaying) {
        return { playback, consumedCurrentTrack: false };
      }

      const elapsedMs = Math.max(0, nowEpochMs - playback.startedAtEpochMs);
      return {
        playback: {
          ...playback,
          isPlaying: false,
          positionMs: playback.positionMs + elapsedMs
        },
        consumedCurrentTrack: false
      };
    }

    case "seek": {
      return {
        playback: {
          ...playback,
          positionMs: action.positionMs,
          startedAtEpochMs: nowEpochMs
        },
        consumedCurrentTrack: false
      };
    }

    case "skip": {
      return {
        playback: {
          ...playback,
          source: action.nextSource ?? playback.source,
          itemId: action.nextItemId ?? playback.itemId,
          positionMs: 0,
          startedAtEpochMs: nowEpochMs,
          isPlaying: Boolean(action.nextItemId)
        },
        consumedCurrentTrack: true
      };
    }

    default: {
      const exhaustiveCheck: never = action;
      return { playback, consumedCurrentTrack: exhaustiveCheck };
    }
  }
};
