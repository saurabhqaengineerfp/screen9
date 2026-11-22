#!/usr/bin/env node
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", override: true });

const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_SUPABASE_URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const fixMode = process.argv.includes("--fix");

const HEADERS = {
  "User-Agent":
    "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36",
  Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
};

async function fetchWithTimeout(url, options = {}, timeoutMs = 8000) {
  const controller = new AbortController();
  const id = setTimeout(() => controller.abort(), timeoutMs);
  try {
    return await fetch(url, { ...options, signal: controller.signal, redirect: "follow" });
  } finally {
    clearTimeout(id);
  }
}

async function checkEmbedVideo(url) {
  if (!url) return { ok: true };
  try {
    // YouTube oEmbed check (reliable & catches deleted/private/unembeddable videos)
    if (url.includes("youtube.com") || url.includes("youtu.be")) {
      let ytId = null;
      if (url.includes("/embed/")) ytId = url.split("/embed/")[1].split("?")[0];
      else if (url.includes("v=")) ytId = url.split("v=")[1].split("&")[0];
      else if (url.includes("youtu.be/")) ytId = url.split("youtu.be/")[1].split("?")[0];
      if (!ytId) return { ok: false, reason: "Invalid YouTube URL" };
      const res = await fetchWithTimeout(
        `https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v=${ytId}&format=json`
      );
      if (res.status === 404 || res.status === 401 || res.status === 403) {
        return { ok: false, reason: `YouTube unavailable or embed blocked (HTTP ${res.status})` };
      }
      return { ok: true };
    }

    // Vimeo oEmbed check
    if (url.includes("vimeo.com")) {
      const res = await fetchWithTimeout(`https://vimeo.com/api/oembed.json?url=${encodeURIComponent(url)}`);
      if (res.status === 404 || res.status === 403) {
        return { ok: false, reason: `Vimeo unavailable (HTTP ${res.status})` };
      }
      return { ok: true };
    }

    // Generic HTTP check for Archive.org / Dailymotion / native
    const res = await fetchWithTimeout(url, { method: "HEAD", headers: HEADERS });
    if (res.status === 404 || res.status === 410) {
      return { ok: false, reason: `Dead URL (HTTP ${res.status})` };
    }
    return { ok: true };
  } catch (err) {
    return { ok: false, reason: `Network error: ${err.message}` };
  }
}

// Cache URL checks so duplicate provider URLs (rent + buy) are only checked once
const urlCheckCache = new Map();

async function checkProviderUrl(url) {
  if (!url) return { ok: true };
  if (urlCheckCache.has(url)) return urlCheckCache.get(url);

  let result = { ok: true };
  try {
    let res = await fetchWithTimeout(url, { method: "HEAD", headers: HEADERS });
    // Some servers return 405 Method Not Allowed on HEAD; retry with GET
    if (res.status === 405 || res.status === 400) {
      res = await fetchWithTimeout(url, { method: "GET", headers: HEADERS });
    }
    if (res.status === 404 || res.status === 410) {
      result = { ok: false, status: res.status, reason: `HTTP ${res.status} Not Found` };
    } else if (res.url && /\/404(\/|$|\?)/i.test(res.url)) {
      result = { ok: false, status: 404, reason: "Redirected to 404 page" };
    }
  } catch (err) {
    // Only flag DNS / hard connection failures, ignore timeouts on slow streaming sites
    if (err.name !== "AbortError" && String(err.message).includes("ENOTFOUND")) {
      result = { ok: false, status: 0, reason: "Domain not found" };
    }
  }

  urlCheckCache.set(url, result);
  return result;
}

async function main() {
  const { data: movies, error } = await supabase
    .from("movies")
    .select("id, title, watch_mode, video_url, watch_providers");

  if (error) {
    console.error("Failed to load movies:", error.message);
    process.exit(1);
  }

  const report = {
    scannedMovies: movies.length,
    fixMode,
    brokenEmbeds: [],
    brokenProviderLinks: [],
    removedProviderCount: 0,
  };

  for (const movie of movies) {
    // 1. Check free embed video_url
    if (movie.video_url && movie.watch_mode !== "ott") {
      const check = await checkEmbedVideo(movie.video_url);
      if (!check.ok) {
        report.brokenEmbeds.push({
          title: movie.title,
          video_url: movie.video_url,
          reason: check.reason,
        });
      }
    }

    // 2. Check direct Watchmode provider URLs
    if (!movie.watch_providers || typeof movie.watch_providers !== "object") continue;

    let movieDirty = false;
    const cleanedProviders = {};

    for (const [region, regionData] of Object.entries(movie.watch_providers)) {
      const updatedRegion = { ...regionData };
      for (const bucket of ["flatrate", "free", "ads", "rent", "buy"]) {
        const list = regionData[bucket];
        if (!Array.isArray(list)) continue;

        const kept = [];
        for (const provider of list) {
          if (!provider.web_url) {
            kept.push(provider);
            continue;
          }
          const check = await checkProviderUrl(provider.web_url);
          if (!check.ok) {
            report.brokenProviderLinks.push({
              title: movie.title,
              region,
              bucket,
              provider: provider.provider_name,
              url: provider.web_url,
              reason: check.reason,
            });
            movieDirty = true;
            if (!fixMode) kept.push(provider);
            else report.removedProviderCount++;
          } else {
            kept.push(provider);
          }
        }
        updatedRegion[bucket] = kept;
      }
      cleanedProviders[region] = updatedRegion;
    }

    if (fixMode && movieDirty) {
      await supabase
        .from("movies")
        .update({ watch_providers: cleanedProviders })
        .eq("id", movie.id);
    }
  }

  console.log(JSON.stringify(report, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
