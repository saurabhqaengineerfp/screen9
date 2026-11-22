import { WatchProvidersMap } from "./movieHelpers";

interface WatchmodeSource {
  name: string;
  type: string; // sub, free, tve, rent, buy
  region: string;
  web_url?: string;
}

function normalizeProviderKey(name: string): string {
  const s = (name || "").toLowerCase().replace(/[^a-z0-9]/g, "");
  if (s.includes("appletv") || s.includes("itunes")) return "appletv";
  if (s.includes("primevideo") || s.includes("amazon")) return "amazon";
  if (s.includes("youtube")) return "youtube";
  if (s.includes("netflix")) return "netflix";
  if (s.includes("paramount")) return "paramount";
  if (s.includes("hbomax") || s === "max") return "max";
  if (s.includes("disney")) return "disney";
  if (s.includes("hotstar")) return "hotstar";
  if (s.includes("hulu")) return "hulu";
  if (s.includes("hoopla")) return "hoopla";
  if (s.includes("kanopy")) return "kanopy";
  if (s.includes("tubi")) return "tubi";
  if (s.includes("plex")) return "plex";
  if (s.includes("mubi")) return "mubi";
  if (s.includes("criterion")) return "criterion";
  if (s.includes("rakuten")) return "rakuten";
  if (s.includes("skystore")) return "skystore";
  if (s.includes("googleplay")) return "googleplay";
  if (s.includes("fandango") || s.includes("vudu")) return "fandango";
  if (s.includes("starz")) return "starz";
  if (s.includes("peacock")) return "peacock";
  if (s.includes("philo")) return "philo";
  return s;
}

/**
 * Fetches exact direct movie web_urls from Watchmode API (using TMDB ID)
 * and attaches them onto matching TMDB Watch Provider entries by region.
 */
export async function enrichProvidersWithWatchmode(
  tmdbId: number | string,
  tmdbProviders: WatchProvidersMap | null
): Promise<WatchProvidersMap | null> {
  if (!tmdbProviders) return null;
  const apiKey = process.env.WATCHMODE_API_KEY;
  if (!apiKey) return tmdbProviders;

  try {
    const res = await fetch(
      `https://api.watchmode.com/v1/title/movie-${tmdbId}/sources/?apiKey=${apiKey}`
    );
    if (!res.ok) return tmdbProviders;
    const sources: WatchmodeSource[] = await res.json();
    if (!Array.isArray(sources)) return tmdbProviders;

    // Build lookup map: `${region}:${normalizedKey}` -> best web_url (prefer sub/free over rent/buy)
    const urlMap = new Map<string, { url: string; priority: number }>();
    for (const src of sources) {
      if (!src.web_url || !src.region || !src.name) continue;
      const key = `${src.region.toUpperCase()}:${normalizeProviderKey(src.name)}`;
      const priority = src.type === "free" || src.type === "sub" ? 2 : 1;
      const existing = urlMap.get(key);
      if (!existing || priority > existing.priority) {
        urlMap.set(key, { url: src.web_url, priority });
      }
    }

    const enriched: WatchProvidersMap = {};
    for (const [regionCode, regionData] of Object.entries(tmdbProviders)) {
      const attachUrls = (list?: any[]) =>
        list?.map((p) => {
          const match = urlMap.get(`${regionCode.toUpperCase()}:${normalizeProviderKey(p.provider_name)}`);
          return match ? { ...p, web_url: match.url } : p;
        });

      enriched[regionCode] = {
        ...regionData,
        flatrate: attachUrls(regionData.flatrate),
        free: attachUrls(regionData.free),
        ads: attachUrls(regionData.ads),
        rent: attachUrls(regionData.rent),
        buy: attachUrls(regionData.buy),
      };
    }

    return enriched;
  } catch {
    return tmdbProviders;
  }
}
