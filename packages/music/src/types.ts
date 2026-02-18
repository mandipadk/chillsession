import type { MusicQueueItem, MusicSource, PlaybackState } from "@chillspace/protocol";

export interface ProviderConfig {
  licensedEnabled: boolean;
  spotifyEnabled: boolean;
  youtubeEnabled: boolean;
}

export interface ResolvedPlayback {
  source: MusicSource;
  title: string;
  embeddableUrl: string;
}

export interface MusicProvider {
  source: MusicSource;
  isEnabled: () => boolean;
  resolve: (item: MusicQueueItem) => ResolvedPlayback;
}

export interface PlaybackSyncStatus {
  expectedPositionMs: number;
  driftMs: number;
  shouldResync: boolean;
}

export type NowFn = () => number;

export type PlaybackReducerAction =
  | { type: "play" }
  | { type: "pause" }
  | { type: "skip"; nextItemId?: string; nextSource?: MusicSource }
  | { type: "seek"; positionMs: number };

export interface PlaybackReducerResult {
  playback: PlaybackState;
  consumedCurrentTrack: boolean;
}
