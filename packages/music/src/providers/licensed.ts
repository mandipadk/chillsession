import type { MusicProvider } from "../types";

export const createLicensedProvider = (enabled: boolean): MusicProvider => ({
  source: "licensed",
  isEnabled: () => enabled,
  resolve: (item) => ({
    source: "licensed",
    title: item.title,
    embeddableUrl: item.itemId
  })
});
