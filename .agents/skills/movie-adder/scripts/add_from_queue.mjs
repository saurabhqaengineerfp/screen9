#!/usr/bin/env node
import fs from "node:fs";
import path from "node:path";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", override: true });

const tmdbKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!tmdbKey || !supabaseUrl || !supabaseKey) {
  console.error("Missing NEXT_PUBLIC_TMDB_API_KEY, NEXT_PUBLIC_SUPABASE_URL, or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  process.exit(1);
}

const supabase = createClient(supabaseUrl, supabaseKey);
const REGIONS = ["US", "IN", "GB", "CA", "AU"];

// Parse CLI flags
const args = process.argv.slice(2);
const dryRun = args.includes("--dry-run");
const clearAfter = args.includes("--clear");
const onlyIndex = args.indexOf("--only");
const onlyTitles =
  onlyIndex !== -1
    ? args
        .slice(onlyIndex + 1)
        .filter((a) => !a.startsWith("--"))
        .map((t) => t.toLowerCase().trim())
    : null;

const queuePath = path.resolve(process.cwd(), "movie-queue.json");
if (!fs.existsSync(queuePath)) {
  console.error("No movie-queue.json found. Run Movie Finder first.");
  process.exit(1);
}

const queue = JSON.parse(fs.readFileSync(queuePath, "utf8"));
if (!Array.isArray(queue) || queue.length === 0) {
  console.log("movie-queue.json is empty. Nothing to add.");
  process.exit(0);
}

function normalizeVideoSource(videoUrl) {
  const trimmed = (videoUrl || "").trim();
  if (!trimmed) {
    return { videoSourceType: "ott", cleanVideoUrl: null, watchMode: "ott" };
  }

  // YouTube
  if (trimmed.includes("youtube.com") || trimmed.includes("youtu.be")) {
    let id = null;
    if (trimmed.includes("/embed/")) id = trimmed.split("/embed/")[1].split("?")[0];
    else if (trimmed.includes("v=")) id = trimmed.split("v=")[1].split("&")[0];
    else if (trimmed.includes("youtu.be/")) id = trimmed.split("youtu.be/")[1].split("?")[0];
    if (id) {
      return {
        videoSourceType: "youtube",
        cleanVideoUrl: `https://www.youtube.com/embed/${id}?autoplay=1&controls=1&fs=1&rel=0&playsinline=1`,
        watchMode: "embed",
      };
    }
  }

  // Vimeo
  const vimeoMatch = trimmed.match(/vimeo\.com\/(?:video\/)?(\d+)/);
  if (vimeoMatch) {
    return {
      videoSourceType: "vimeo",
      cleanVideoUrl: `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`,
      watchMode: "embed",
    };
  }

  // Archive.org
  const archiveMatch = trimmed.match(/archive\.org\/(?:details|embed)\/([^/?#]+)/);
  if (archiveMatch) {
    return {
      videoSourceType: "vimeo",
      cleanVideoUrl: `https://archive.org/embed/${archiveMatch[1]}`,
      watchMode: "embed",
    };
  }

  // Dailymotion
  const dmMatch = trimmed.match(/(?:dailymotion\.com\/(?:embed\/)?video\/|dai\.ly\/)([a-zA-Z0-9]+)/);
  if (dmMatch) {
    return {
      videoSourceType: "vimeo",
      cleanVideoUrl: `https://www.dailymotion.com/embed/video/${dmMatch[1]}`,
      watchMode: "embed",
    };
  }

  return { videoSourceType: "native", cleanVideoUrl: trimmed, watchMode: "native" };
}

function resolveCountry(details) {
  if (details.production_countries?.[0]?.name) {
    return details.production_countries[0].name;
  }
  const code = details.origin_country?.[0];
  if (code) {
    try {
      return new Intl.DisplayNames(["en"], { type: "region" }).of(code) || code;
    } catch {
      return code;
    }
  }
  return null;
}

function extractLanguages(details) {
  const langs = [];
  if (Array.isArray(details.spoken_languages)) {
    for (const l of details.spoken_languages) {
      if (l?.english_name && l.english_name !== "No Language") langs.push(l.english_name);
    }
  }
  if (langs.length === 0 && details.original_language) {
    try {
      const name = new Intl.DisplayNames(["en"], { type: "language" }).of(details.original_language);
      if (name) langs.push(name);
    } catch {
      // ignore
    }
  }
  return Array.from(new Set(langs));
}

function extractProviders(rawResults) {
  if (!rawResults || typeof rawResults !== "object") return null;
  const filtered = {};
  for (const code of REGIONS) {
    const entry = rawResults[code];
    if (!entry) continue;
    filtered[code] = {
      link: entry.link,
      flatrate: entry.flatrate?.map((p) => ({
        provider_id: p.provider_id,
        provider_name: p.provider_name,
        logo_path: p.logo_path,
      })),
      free: entry.free?.map((p) => ({
        provider_id: p.provider_id,
        provider_name: p.provider_name,
        logo_path: p.logo_path,
      })),
      ads: entry.ads?.map((p) => ({
        provider_id: p.provider_id,
        provider_name: p.provider_name,
        logo_path: p.logo_path,
      })),
      rent: entry.rent?.map((p) => ({
        provider_id: p.provider_id,
        provider_name: p.provider_name,
        logo_path: p.logo_path,
      })),
      buy: entry.buy?.map((p) => ({
        provider_id: p.provider_id,
        provider_name: p.provider_name,
        logo_path: p.logo_path,
      })),
    };
  }
  return Object.keys(filtered).length > 0 ? filtered : null;
}

function extractTrailer(videos) {
  const list = videos?.results;
  if (!Array.isArray(list)) return null;
  const match =
    list.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ||
    list.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
    list.find((v) => v.site === "YouTube");
  return match?.key ? `https://www.youtube.com/watch?v=${match.key}` : null;
}

async function main() {
  const { data: existingMovies } = await supabase.from("movies").select("tmdb_id");
  const existingIds = new Set((existingMovies || []).map((m) => m.tmdb_id).filter(Boolean));

  const targets = onlyTitles
    ? queue.filter((item) => onlyTitles.includes((item.title || "").toLowerCase().trim()))
    : queue;

  const summary = { added: [], skipped: [], failed: [] };
  const addedTmdbUrls = new Set();

  for (const item of targets) {
    const tmdbMatch = (item.tmdb_url || "").match(/\/movie\/(\d+)/);
    if (!tmdbMatch) {
      summary.failed.push({ title: item.title, reason: "Missing or invalid tmdb_url" });
      continue;
    }

    const tmdbId = parseInt(tmdbMatch[1], 10);
    if (existingIds.has(tmdbId)) {
      summary.skipped.push({ title: item.title, reason: "Already in Screen9" });
      addedTmdbUrls.add(item.tmdb_url);
      continue;
    }

    const detailsRes = await fetch(
      `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbKey}&append_to_response=credits,videos,watch/providers`
    );
    const details = await detailsRes.json();
    if (details.success === false) {
      summary.failed.push({ title: item.title, reason: `TMDB error: ${details.status_message}` });
      continue;
    }

    const { videoSourceType, cleanVideoUrl, watchMode } = normalizeVideoSource(item.free_embed_url);
    const releaseYear = details.release_date ? parseInt(details.release_date.split("-")[0], 10) : null;
    const period = releaseYear ? `${Math.floor(releaseYear / 10) * 10}s` : null;
    const country = resolveCountry(details);
    const genres = (details.genres || []).map((g) => g.name);
    const languages = extractLanguages(details);
    const extraTags = Array.isArray(item.tags) ? item.tags : [];
    const finalTags = Array.from(new Set([...extraTags, ...languages]));
    const category = item.category || (genres.length > 0 ? genres[0] : "Curated");
    const director = details.credits?.crew?.find((p) => p.job === "Director")?.name || null;
    const castMembers = (details.credits?.cast || []).slice(0, 5).map((p) => p.name);
    const trailerUrl = item.trailer_url || extractTrailer(details.videos);
    const watchProviders = extractProviders(details["watch/providers"]?.results);

    const payload = {
      title: details.title,
      description: details.overview,
      poster_url: details.poster_path ? `https://image.tmdb.org/t/p/w500${details.poster_path}` : null,
      backdrop_url: details.backdrop_path ? `https://image.tmdb.org/t/p/original${details.backdrop_path}` : null,
      release_year: releaseYear,
      genres,
      category,
      video_source_type: videoSourceType,
      video_url: cleanVideoUrl,
      watch_mode: watchMode,
      trailer_url: trailerUrl,
      tmdb_id: tmdbId,
      duration: (details.runtime || 120) * 60,
      director,
      cast_members: castMembers,
      country,
      period,
      tags: finalTags,
      curator_note: item.curator_note || null,
      source_channel: item.source_channel || null,
      watch_providers: watchProviders,
    };

    if (dryRun) {
      summary.added.push({ title: payload.title, year: releaseYear, mode: watchMode, dryRun: true });
      continue;
    }

    // Ensure category exists
    const { data: existingCat } = await supabase.from("categories").select("id").eq("name", category).single();
    if (!existingCat) {
      await supabase.from("categories").insert({ name: category });
    }

    const { error } = await supabase.from("movies").insert(payload);
    if (error) {
      summary.failed.push({ title: payload.title, reason: error.message });
    } else {
      existingIds.add(tmdbId);
      addedTmdbUrls.add(item.tmdb_url);
      summary.added.push({
        title: payload.title,
        year: releaseYear,
        country,
        mode: watchMode,
      });
    }
  }

  if (clearAfter && !dryRun && addedTmdbUrls.size > 0) {
    const remaining = queue.filter((item) => !addedTmdbUrls.has(item.tmdb_url));
    fs.writeFileSync(queuePath, JSON.stringify(remaining, null, 2) + "\n", "utf8");
  }

  console.log(JSON.stringify(summary, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
