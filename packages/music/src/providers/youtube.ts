import type { MusicProvider } from "../types";

const youtubeVideoIdRegex = /^[A-Za-z0-9_-]{11}$/;

export const createYouTubeProvider = (enabled: boolean): MusicProvider => ({
  source: "youtube",
  isEnabled: () => enabled,
  resolve: (item) => {
    if (!youtubeVideoIdRegex.test(item.itemId)) {
      throw new Error("Invalid YouTube itemId. Provide the 11-char video ID.");
    }

    return {
      source: "youtube",
      title: item.title,
      embeddableUrl: `https://www.youtube.com/embed/${item.itemId}?autoplay=1&rel=0`
    };
  }
});
