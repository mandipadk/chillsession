import type { MusicQueueItem, MusicSource } from "@chillspace/protocol";
import { createLicensedProvider } from "./providers/licensed";
import { createSpotifyProvider } from "./providers/spotify";
import { createYouTubeProvider } from "./providers/youtube";
import type { MusicProvider, ProviderConfig, ResolvedPlayback } from "./types";

export const createMusicProviders = (config: ProviderConfig): MusicProvider[] => [
  createLicensedProvider(config.licensedEnabled),
  createSpotifyProvider(config.spotifyEnabled),
  createYouTubeProvider(config.youtubeEnabled)
];

export const resolveQueueItem = (
  providers: MusicProvider[],
  item: MusicQueueItem
): ResolvedPlayback => {
  const provider = providers.find((candidate) => candidate.source === item.source);

  if (!provider || !provider.isEnabled()) {
    throw new Error(`Music provider unavailable: ${item.source}`);
  }

  return provider.resolve(item);
};

export const assertControlRole = (
  role: "host" | "dj" | "member",
  action: "enqueue" | "control"
): void => {
  if (action === "enqueue" && ["host", "dj", "member"].includes(role)) {
    return;
  }

  if (action === "control" && (role === "host" || role === "dj")) {
    return;
  }

  throw new Error("Role is not allowed to perform this action.");
};

export const normalizeSource = (source: string): MusicSource => {
  if (source === "licensed" || source === "spotify" || source === "youtube") {
    return source;
  }

  throw new Error("Unsupported music source.");
};
