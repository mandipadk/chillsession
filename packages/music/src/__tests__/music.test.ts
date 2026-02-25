import { describe, it, expect } from "vitest";
import type { PlaybackState, MusicQueueItem } from "@chillspace/protocol";
import { getExpectedPositionMs, evaluatePlaybackDrift } from "../sync";
import { reducePlayback } from "../reducer";
import {
  createMusicProviders,
  resolveQueueItem,
  assertControlRole,
  normalizeSource
} from "../provider-registry";
import { createLicensedProvider } from "../providers/licensed";
import { createSpotifyProvider } from "../providers/spotify";
import { createYouTubeProvider } from "../providers/youtube";

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

const basePlayback = (overrides: Partial<PlaybackState> = {}): PlaybackState => ({
  source: "licensed",
  itemId: "track-1",
  positionMs: 0,
  isPlaying: false,
  startedAtEpochMs: 0,
  controllerRole: "host",
  ...overrides
});

const queueItem = (overrides: Partial<MusicQueueItem> = {}): MusicQueueItem => ({
  id: "q1",
  source: "licensed",
  itemId: "song.mp3",
  title: "Lo-fi Beat",
  addedBy: "user-1",
  addedAtEpochMs: 1000,
  ...overrides
});

// ===========================================================================
// sync.ts
// ===========================================================================

describe("sync – getExpectedPositionMs", () => {
  it("returns positionMs when paused", () => {
    const pb = basePlayback({ positionMs: 5000, isPlaying: false });
    expect(getExpectedPositionMs(pb, 99999)).toBe(5000);
  });

  it("adds elapsed time when playing", () => {
    const pb = basePlayback({ positionMs: 1000, isPlaying: true, startedAtEpochMs: 10000 });
    expect(getExpectedPositionMs(pb, 12000)).toBe(3000);
  });

  it("clamps negative elapsed to zero", () => {
    const pb = basePlayback({ positionMs: 500, isPlaying: true, startedAtEpochMs: 20000 });
    expect(getExpectedPositionMs(pb, 10000)).toBe(500);
  });

  it("returns positionMs when nowEpochMs equals startedAtEpochMs", () => {
    const pb = basePlayback({ positionMs: 3000, isPlaying: true, startedAtEpochMs: 5000 });
    expect(getExpectedPositionMs(pb, 5000)).toBe(3000);
  });
});

describe("sync – evaluatePlaybackDrift", () => {
  it("reports no resync when drift is below threshold", () => {
    const pb = basePlayback({ positionMs: 1000, isPlaying: true, startedAtEpochMs: 0 });
    const now = () => 2000;
    const result = evaluatePlaybackDrift(pb, 3000, now);
    expect(result.expectedPositionMs).toBe(3000);
    expect(result.driftMs).toBe(0);
    expect(result.shouldResync).toBe(false);
  });

  it("reports resync when drift exceeds threshold", () => {
    const pb = basePlayback({ positionMs: 0, isPlaying: true, startedAtEpochMs: 0 });
    const now = () => 5000;
    const result = evaluatePlaybackDrift(pb, 10000, now);
    expect(result.expectedPositionMs).toBe(5000);
    expect(result.driftMs).toBe(5000);
    expect(result.shouldResync).toBe(true);
  });

  it("respects custom threshold", () => {
    const pb = basePlayback({ positionMs: 0, isPlaying: true, startedAtEpochMs: 0 });
    const now = () => 1000;
    // drift = |1000 - 1100| = 100; threshold = 50
    const result = evaluatePlaybackDrift(pb, 1100, now, 50);
    expect(result.driftMs).toBe(100);
    expect(result.shouldResync).toBe(true);
  });

  it("drift exactly equal to threshold does NOT trigger resync", () => {
    const pb = basePlayback({ positionMs: 0, isPlaying: true, startedAtEpochMs: 0 });
    const now = () => 1000;
    const result = evaluatePlaybackDrift(pb, 1250, now, 250);
    expect(result.driftMs).toBe(250);
    expect(result.shouldResync).toBe(false);
  });

  it("uses Date.now by default for now parameter", () => {
    const pb = basePlayback({ positionMs: 0, isPlaying: false });
    const result = evaluatePlaybackDrift(pb, 0);
    expect(result.driftMs).toBe(0);
    expect(result.shouldResync).toBe(false);
  });

  it("handles paused playback with drift", () => {
    const pb = basePlayback({ positionMs: 2000, isPlaying: false });
    const now = () => 99999;
    const result = evaluatePlaybackDrift(pb, 5000, now);
    expect(result.expectedPositionMs).toBe(2000);
    expect(result.driftMs).toBe(3000);
    expect(result.shouldResync).toBe(true);
  });
});

// ===========================================================================
// reducer.ts
// ===========================================================================

describe("reducer – play action", () => {
  it("starts playback when paused", () => {
    const pb = basePlayback({ isPlaying: false });
    const { playback, consumedCurrentTrack } = reducePlayback(pb, { type: "play" }, 5000);
    expect(playback.isPlaying).toBe(true);
    expect(playback.startedAtEpochMs).toBe(5000);
    expect(consumedCurrentTrack).toBe(false);
  });

  it("is idempotent when already playing", () => {
    const pb = basePlayback({ isPlaying: true, startedAtEpochMs: 3000 });
    const { playback } = reducePlayback(pb, { type: "play" }, 9000);
    expect(playback).toBe(pb); // same reference
    expect(playback.startedAtEpochMs).toBe(3000);
  });
});

describe("reducer – pause action", () => {
  it("pauses and captures elapsed position", () => {
    const pb = basePlayback({ isPlaying: true, positionMs: 1000, startedAtEpochMs: 2000 });
    const { playback, consumedCurrentTrack } = reducePlayback(pb, { type: "pause" }, 5000);
    expect(playback.isPlaying).toBe(false);
    expect(playback.positionMs).toBe(4000); // 1000 + (5000-2000)
    expect(consumedCurrentTrack).toBe(false);
  });

  it("is idempotent when already paused", () => {
    const pb = basePlayback({ isPlaying: false, positionMs: 7000 });
    const { playback } = reducePlayback(pb, { type: "pause" }, 9999);
    expect(playback).toBe(pb);
    expect(playback.positionMs).toBe(7000);
  });

  it("clamps negative elapsed to zero", () => {
    const pb = basePlayback({ isPlaying: true, positionMs: 500, startedAtEpochMs: 20000 });
    const { playback } = reducePlayback(pb, { type: "pause" }, 10000);
    expect(playback.positionMs).toBe(500); // 500 + max(0, 10000-20000)
  });
});

describe("reducer – seek action", () => {
  it("updates positionMs and startedAtEpochMs", () => {
    const pb = basePlayback({ positionMs: 0, startedAtEpochMs: 0, isPlaying: true });
    const { playback, consumedCurrentTrack } = reducePlayback(pb, { type: "seek", positionMs: 30000 }, 7000);
    expect(playback.positionMs).toBe(30000);
    expect(playback.startedAtEpochMs).toBe(7000);
    expect(playback.isPlaying).toBe(true);
    expect(consumedCurrentTrack).toBe(false);
  });

  it("works while paused", () => {
    const pb = basePlayback({ isPlaying: false, positionMs: 500 });
    const { playback } = reducePlayback(pb, { type: "seek", positionMs: 0 }, 1000);
    expect(playback.positionMs).toBe(0);
    expect(playback.isPlaying).toBe(false);
  });
});

describe("reducer – skip action", () => {
  it("advances to next track when nextItemId is provided", () => {
    const pb = basePlayback({ itemId: "old", source: "licensed", isPlaying: true });
    const { playback, consumedCurrentTrack } = reducePlayback(
      pb,
      { type: "skip", nextItemId: "new-track", nextSource: "spotify" },
      8000
    );
    expect(playback.itemId).toBe("new-track");
    expect(playback.source).toBe("spotify");
    expect(playback.positionMs).toBe(0);
    expect(playback.startedAtEpochMs).toBe(8000);
    expect(playback.isPlaying).toBe(true);
    expect(consumedCurrentTrack).toBe(true);
  });

  it("stops playing when nextItemId is undefined (queue exhausted)", () => {
    const pb = basePlayback({ itemId: "current", isPlaying: true });
    const { playback, consumedCurrentTrack } = reducePlayback(pb, { type: "skip" }, 9000);
    expect(playback.isPlaying).toBe(false);
    expect(playback.itemId).toBe("current"); // retains previous
    expect(playback.positionMs).toBe(0);
    expect(consumedCurrentTrack).toBe(true);
  });

  it("retains source when nextSource is undefined", () => {
    const pb = basePlayback({ source: "youtube" });
    const { playback } = reducePlayback(pb, { type: "skip", nextItemId: "abc" }, 1000);
    expect(playback.source).toBe("youtube");
  });
});

// ===========================================================================
// provider-registry.ts
// ===========================================================================

describe("provider-registry – createMusicProviders", () => {
  it("creates three providers in order: licensed, spotify, youtube", () => {
    const providers = createMusicProviders({
      licensedEnabled: true,
      spotifyEnabled: false,
      youtubeEnabled: true
    });
    expect(providers).toHaveLength(3);
    expect(providers[0]!.source).toBe("licensed");
    expect(providers[1]!.source).toBe("spotify");
    expect(providers[2]!.source).toBe("youtube");
    expect(providers[0]!.isEnabled()).toBe(true);
    expect(providers[1]!.isEnabled()).toBe(false);
    expect(providers[2]!.isEnabled()).toBe(true);
  });
});

describe("provider-registry – resolveQueueItem", () => {
  it("resolves a licensed queue item", () => {
    const providers = createMusicProviders({
      licensedEnabled: true,
      spotifyEnabled: true,
      youtubeEnabled: true
    });
    const item = queueItem({ source: "licensed", itemId: "track.mp3", title: "Chill" });
    const resolved = resolveQueueItem(providers, item);
    expect(resolved.source).toBe("licensed");
    expect(resolved.embeddableUrl).toBe("track.mp3");
    expect(resolved.title).toBe("Chill");
  });

  it("throws when provider is disabled", () => {
    const providers = createMusicProviders({
      licensedEnabled: false,
      spotifyEnabled: true,
      youtubeEnabled: true
    });
    const item = queueItem({ source: "licensed" });
    expect(() => resolveQueueItem(providers, item)).toThrow("Music provider unavailable: licensed");
  });

  it("throws when provider is not found", () => {
    const item = queueItem({ source: "spotify" });
    expect(() => resolveQueueItem([], item)).toThrow("Music provider unavailable: spotify");
  });
});

describe("provider-registry – assertControlRole", () => {
  it.each(["host", "dj", "member"] as const)("allows %s to enqueue", (role) => {
    expect(() => assertControlRole(role, "enqueue")).not.toThrow();
  });

  it("allows host to control", () => {
    expect(() => assertControlRole("host", "control")).not.toThrow();
  });

  it("allows dj to control", () => {
    expect(() => assertControlRole("dj", "control")).not.toThrow();
  });

  it("denies member control", () => {
    expect(() => assertControlRole("member", "control")).toThrow(
      "Role is not allowed to perform this action."
    );
  });
});

describe("provider-registry – normalizeSource", () => {
  it.each(["licensed", "spotify", "youtube"] as const)("accepts valid source: %s", (src) => {
    expect(normalizeSource(src)).toBe(src);
  });

  it.each(["soundcloud", "apple", "", "SPOTIFY", "Youtube"])(
    "rejects invalid source: %s",
    (src) => {
      expect(() => normalizeSource(src)).toThrow("Unsupported music source.");
    }
  );
});

// ===========================================================================
// providers/licensed.ts
// ===========================================================================

describe("LicensedProvider", () => {
  it("reports enabled state", () => {
    expect(createLicensedProvider(true).isEnabled()).toBe(true);
    expect(createLicensedProvider(false).isEnabled()).toBe(false);
  });

  it("resolves with itemId as embeddableUrl", () => {
    const provider = createLicensedProvider(true);
    const item = queueItem({ source: "licensed", itemId: "cdn/beat.mp3", title: "Beat" });
    const result = provider.resolve(item);
    expect(result).toEqual({
      source: "licensed",
      title: "Beat",
      embeddableUrl: "cdn/beat.mp3"
    });
  });
});

// ===========================================================================
// providers/spotify.ts
// ===========================================================================

describe("SpotifyProvider", () => {
  it("reports enabled state", () => {
    expect(createSpotifyProvider(true).isEnabled()).toBe(true);
    expect(createSpotifyProvider(false).isEnabled()).toBe(false);
  });

  it("resolves valid track ID", () => {
    const provider = createSpotifyProvider(true);
    const trackId = "4iV5W9uYEdYUVa79Axb7Rh";
    const item = queueItem({ source: "spotify", itemId: trackId, title: "Song" });
    const result = provider.resolve(item);
    expect(result.source).toBe("spotify");
    expect(result.embeddableUrl).toBe(`https://open.spotify.com/embed/track/${trackId}`);
  });

  it("accepts 10-char alphanumeric ID (minimum length)", () => {
    const provider = createSpotifyProvider(true);
    const item = queueItem({ source: "spotify", itemId: "abcABC1234", title: "Min" });
    expect(() => provider.resolve(item)).not.toThrow();
  });

  it("accepts 40-char alphanumeric ID (maximum length)", () => {
    const provider = createSpotifyProvider(true);
    const id40 = "a".repeat(40);
    const item = queueItem({ source: "spotify", itemId: id40, title: "Max" });
    expect(() => provider.resolve(item)).not.toThrow();
  });

  it("rejects ID shorter than 10 chars", () => {
    const provider = createSpotifyProvider(true);
    const item = queueItem({ source: "spotify", itemId: "short", title: "Bad" });
    expect(() => provider.resolve(item)).toThrow("Invalid Spotify itemId");
  });

  it("rejects ID longer than 40 chars", () => {
    const provider = createSpotifyProvider(true);
    const item = queueItem({ source: "spotify", itemId: "a".repeat(41), title: "Bad" });
    expect(() => provider.resolve(item)).toThrow("Invalid Spotify itemId");
  });

  it("rejects ID with special characters", () => {
    const provider = createSpotifyProvider(true);
    const item = queueItem({ source: "spotify", itemId: "abc!@#$%^&*()12", title: "Bad" });
    expect(() => provider.resolve(item)).toThrow("Invalid Spotify itemId");
  });

  it("rejects empty string", () => {
    const provider = createSpotifyProvider(true);
    const item = queueItem({ source: "spotify", itemId: "", title: "Bad" });
    expect(() => provider.resolve(item)).toThrow("Invalid Spotify itemId");
  });
});

// ===========================================================================
// providers/youtube.ts
// ===========================================================================

describe("YouTubeProvider", () => {
  it("reports enabled state", () => {
    expect(createYouTubeProvider(true).isEnabled()).toBe(true);
    expect(createYouTubeProvider(false).isEnabled()).toBe(false);
  });

  it("resolves valid 11-char video ID", () => {
    const provider = createYouTubeProvider(true);
    const videoId = "dQw4w9WgXcQ";
    const item = queueItem({ source: "youtube", itemId: videoId, title: "Video" });
    const result = provider.resolve(item);
    expect(result.source).toBe("youtube");
    expect(result.embeddableUrl).toBe(
      `https://www.youtube.com/embed/${videoId}?autoplay=1&rel=0`
    );
  });

  it("accepts IDs with underscores and hyphens", () => {
    const provider = createYouTubeProvider(true);
    const item = queueItem({ source: "youtube", itemId: "a_b-c_D-E_1", title: "Dash" });
    expect(() => provider.resolve(item)).not.toThrow();
  });

  it("rejects ID shorter than 11 chars", () => {
    const provider = createYouTubeProvider(true);
    const item = queueItem({ source: "youtube", itemId: "short", title: "Bad" });
    expect(() => provider.resolve(item)).toThrow("Invalid YouTube itemId");
  });

  it("rejects ID longer than 11 chars", () => {
    const provider = createYouTubeProvider(true);
    const item = queueItem({ source: "youtube", itemId: "a".repeat(12), title: "Bad" });
    expect(() => provider.resolve(item)).toThrow("Invalid YouTube itemId");
  });

  it("rejects ID with invalid characters", () => {
    const provider = createYouTubeProvider(true);
    const item = queueItem({ source: "youtube", itemId: "abc!@#defgh", title: "Bad" });
    expect(() => provider.resolve(item)).toThrow("Invalid YouTube itemId");
  });

  it("rejects empty string", () => {
    const provider = createYouTubeProvider(true);
    const item = queueItem({ source: "youtube", itemId: "", title: "Bad" });
    expect(() => provider.resolve(item)).toThrow("Invalid YouTube itemId");
  });
});
