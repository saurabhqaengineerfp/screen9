export type WatchMode = "embed" | "ott" | "native";

export interface WatchProviderItem {
  provider_id: number;
  provider_name: string;
  logo_path?: string | null;
}

export interface RegionWatchProviders {
  link?: string;
  flatrate?: WatchProviderItem[];
  free?: WatchProviderItem[];
  ads?: WatchProviderItem[];
  rent?: WatchProviderItem[];
  buy?: WatchProviderItem[];
}

export type WatchProvidersMap = Record<string, RegionWatchProviders>;

export const SUPPORTED_REGIONS = [
  { code: "US", label: "US" },
  { code: "IN", label: "IN" },
  { code: "GB", label: "UK" },
  { code: "CA", label: "CA" },
  { code: "AU", label: "AU" },
] as const;

export function extractYouTubeId(url?: string | null): string | null {
  if (!url) return null;
  if (url.includes("/embed/")) return url.split("/embed/")[1].split("?")[0];
  if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
  if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split("?")[0];
  return null;
}

export function extractVimeoId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  return match ? match[1] : null;
}

export function extractArchiveOrgId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/archive\.org\/(?:details|embed)\/([^/?#]+)/);
  return match ? match[1] : null;
}

export function extractDailymotionId(url?: string | null): string | null {
  if (!url) return null;
  const match = url.match(/(?:dailymotion\.com\/(?:embed\/)?video\/|dai\.ly\/)([a-zA-Z0-9]+)/);
  return match ? match[1] : null;
}

/**
 * Determine effective watch mode for a movie (backwards compatible with legacy rows).
 */
export function getWatchMode(movie: any): WatchMode {
  if (!movie) return "ott";
  if (movie.watch_mode === "embed" || movie.watch_mode === "ott" || movie.watch_mode === "native") {
    return movie.watch_mode;
  }
  if (movie.video_source_type === "native" && movie.video_url) return "native";
  if (movie.video_url && movie.video_url.trim().length > 0) return "embed";
  return "ott";
}

/**
 * Build a clean, 100% ToS-compliant official embed URL for YouTube or Vimeo.
 */
export function buildOfficialEmbedUrl(
  url?: string | null,
  options?: { autoplay?: boolean; start?: number | null; end?: number | null }
): { type: "youtube" | "vimeo" | "archive" | "dailymotion" | "native"; embedUrl: string } | null {
  if (!url) return null;
  const autoplay = options?.autoplay ? 1 : 0;

  const ytId = extractYouTubeId(url);
  if (ytId) {
    let embedUrl = `https://www.youtube.com/embed/${ytId}?autoplay=${autoplay}&controls=1&fs=1&rel=0&playsinline=1`;
    if (options?.start) embedUrl += `&start=${options.start}`;
    if (options?.end) embedUrl += `&end=${options.end}`;
    return { type: "youtube", embedUrl };
  }

  const vimeoId = extractVimeoId(url);
  if (vimeoId) {
    const embedUrl = `https://player.vimeo.com/video/${vimeoId}?autoplay=${autoplay}`;
    return { type: "vimeo", embedUrl };
  }

  const archiveId = extractArchiveOrgId(url);
  if (archiveId) {
    const embedUrl = `https://archive.org/embed/${archiveId}${autoplay ? "?autoplay=1" : ""}`;
    return { type: "archive", embedUrl };
  }

  const dmId = extractDailymotionId(url);
  if (dmId) {
    const embedUrl = `https://www.dailymotion.com/embed/video/${dmId}${autoplay ? "?autoplay=1" : ""}`;
    return { type: "dailymotion", embedUrl };
  }

  return { type: "native", embedUrl: url };
}

/**
 * Format runtime cleanly for Geist Mono metadata strips (e.g. "2H 18M").
 */
export function formatRuntime(movie: any): string | null {
  if (!movie) return null;
  let totalMinutes = 0;
  if (typeof movie.duration === "number" && movie.duration > 0) {
    totalMinutes = Math.round(movie.duration / 60);
  } else if (typeof movie.runtime === "number" && movie.runtime > 0) {
    totalMinutes = movie.runtime;
  }
  if (totalMinutes <= 0) return null;
  const h = Math.floor(totalMinutes / 60);
  const m = totalMinutes % 60;
  if (h === 0) return `${m}M`;
  return m > 0 ? `${h}H ${m}M` : `${h}H`;
}

/**
 * Return watch providers for a given region code, with optional fallback to any available region.
 */
export function getRegionProviders(
  providers: WatchProvidersMap | null | undefined,
  region: string
): { region: string; data: RegionWatchProviders | null } {
  if (!providers || typeof providers !== "object") {
    return { region, data: null };
  }
  if (providers[region]) {
    return { region, data: providers[region] };
  }
  return { region, data: null };
}

export function getTmdbWatchUrl(movie: any): string | null {
  if (!movie?.tmdb_id) return null;
  return `https://www.themoviedb.org/movie/${movie.tmdb_id}/watch`;
}

/**
 * Build a direct platform URL for a given streaming provider so clicking
 * YouTube, Netflix, Prime, Apple TV, etc. takes the user straight to that platform.
 */
export function getProviderDirectUrl(
  providerName: string,
  movieTitle: string,
  releaseYear?: number | null,
  fallbackUrl?: string | null
): string {
  const name = (providerName || "").toLowerCase();
  const titleQuery = encodeURIComponent(movieTitle);
  const titleWithYear = encodeURIComponent(
    releaseYear ? `${movieTitle} ${releaseYear} movie` : `${movieTitle} movie`
  );

  if (name.includes("youtube")) return `https://www.youtube.com/results?search_query=${titleWithYear}`;
  if (name.includes("netflix")) return `https://www.netflix.com/search?q=${titleQuery}`;
  if (name.includes("amazon") || name.includes("prime video"))
    return `https://www.primevideo.com/search?phrase=${titleQuery}`;
  if (name.includes("apple tv")) return `https://tv.apple.com/search?term=${titleQuery}`;
  if (name.includes("hotstar")) return `https://www.hotstar.com/in/explore?search_query=${titleQuery}`;
  if (name.includes("disney")) return `https://www.disneyplus.com/search?q=${titleQuery}`;
  if (name.includes("mubi")) return `https://mubi.com/en/search?query=${titleQuery}`;
  if (name.includes("criterion")) return `https://www.criterionchannel.com/search?q=${titleQuery}`;
  if (name.includes("paramount")) return `https://www.paramountplus.com/search/?q=${titleQuery}`;
  if (name.includes("hbo") || name === "max") return `https://play.max.com/search?q=${titleQuery}`;
  if (name.includes("hulu")) return `https://www.hulu.com/search?q=${titleQuery}`;
  if (name.includes("tubi")) return `https://tubitv.com/search/${titleQuery}`;
  if (name.includes("plex")) return `https://watch.plex.tv/search?q=${titleQuery}`;
  if (name.includes("kanopy")) return `https://www.kanopy.com/en/search?query=${titleQuery}`;
  if (name.includes("hoopla")) return `https://www.hoopladigital.com/search?q=${titleQuery}&type=direct`;
  if (name.includes("google play")) return `https://play.google.com/store/search?q=${titleQuery}&c=movies`;
  if (name.includes("rakuten")) return `https://www.rakuten.tv/search?q=${titleQuery}`;
  if (name.includes("sky store")) return `https://www.skystore.com/search?q=${titleQuery}`;
  if (name.includes("zee5")) return `https://www.zee5.com/search?q=${titleQuery}`;
  if (name.includes("sonyliv")) return `https://www.sonyliv.com/search?q=${titleQuery}`;
  if (name.includes("jiocinema")) return `https://www.jiocinema.com/search?q=${titleQuery}`;
  if (name.includes("hoichoi")) return `https://www.hoichoi.tv/search?q=${titleQuery}`;
  if (name.includes("starz")) return `https://www.starz.com/us/en/search?q=${titleQuery}`;
  if (name.includes("peacock")) return `https://www.peacocktv.com/watch/search?q=${titleQuery}`;

  return fallbackUrl || "#";
}
