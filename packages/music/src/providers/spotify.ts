import type { MusicProvider } from "../types";

const spotifyTrackIdRegex = /^[A-Za-z0-9]{10,40}$/;

export const createSpotifyProvider = (enabled: boolean): MusicProvider => ({
  source: "spotify",
  isEnabled: () => enabled,
  resolve: (item) => {
    if (!spotifyTrackIdRegex.test(item.itemId)) {
      throw new Error("Invalid Spotify itemId. Use Spotify track/playlist ID only.");
    }

    return {
      source: "spotify",
      title: item.title,
      embeddableUrl: `https://open.spotify.com/embed/track/${item.itemId}`
    };
  }
});
