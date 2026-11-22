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
): { type: "youtube" | "vimeo" | "native"; embedUrl: string } | null {
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
