#!/usr/bin/env node
import "dotenv/config";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

// Load .env.local explicitly (Next.js convention)
config({ path: ".env.local", override: true });

const tmdbKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL;
const supabaseKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

if (!tmdbKey) {
  console.error("Missing NEXT_PUBLIC_TMDB_API_KEY in .env.local");
  process.exit(1);
}

const supabase =
  supabaseUrl && supabaseKey ? createClient(supabaseUrl, supabaseKey) : null;

const movieNames = process.argv.slice(2).filter(Boolean);
if (movieNames.length === 0) {
  console.error('Usage: node lookup_movies.mjs "Movie Name 1" "Movie Name 2"');
  process.exit(1);
}

const REGIONS = ["US", "IN", "GB"];

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

function getInitialPublicDomainHint(year, country) {
  if (!year) return { status: "unknown", note: "Release year unknown — check manually." };
  if (year <= 1930) {
    return {
      status: "likely_global_pd",
      note: `Released in ${year} (pre-1931): likely Public Domain in the US and most countries. Verify print/music rights.`,
    };
  }
  if (year <= 1977 && country === "United States of America") {
    return {
      status: "check_us_renewal",
      note: `US film from ${year}: could be Public Domain if copyright was not renewed or notice was omitted. Verify via web search.`,
    };
  }
  if (year <= 1965 && country === "India") {
    return {
      status: "india_only_pd",
      note: `Indian film from ${year}: Public Domain in India (60-year rule), but still copyrighted in the US (URAA). Needs geo-blocking if self-hosted.`,
    };
  }
  return {
    status: "likely_copyrighted",
    note: `Released in ${year} (${country || "Unknown"}): likely still under copyright.`,
  };
}

async function searchArchiveOrg(title, year) {
  try {
    const q = `title:("${title.replace(/"/g, "")}") AND mediatype:(movies)${year ? ` AND year:${year}` : ""}`;
    const url = `https://archive.org/advancedsearch.php?q=${encodeURIComponent(q)}&fl[]=identifier,title,year,licenseurl,downloads&sort[]=downloads+desc&rows=3&page=1&output=json`;
    const res = await fetch(url);
    if (!res.ok) return [];
    const data = await res.json();
    return (data.response?.docs || []).map((doc) => ({
      title: doc.title,
      year: doc.year || null,
      url: `https://archive.org/details/${doc.identifier}`,
      license: doc.licenseurl || null,
      downloads: doc.downloads || 0,
    }));
  } catch {
    return [];
  }
}

async function lookupOne(query, existingTmdbIds) {
  // Support context hints like "Ray - Jamie Foxx" and optional year like "Charade 1963"
  const [titlePart, ...hintParts] = query.split(/\s+[-–—]\s+/);
  const contextHint = hintParts.join(" ").trim().toLowerCase();
  const yearMatch = titlePart.match(/\b(19\d{2}|20\d{2})\b/);
  const searchYear = yearMatch ? yearMatch[1] : null;
  const cleanTitle = yearMatch ? titlePart.replace(yearMatch[0], "").trim() : titlePart.trim();

  const searchUrl = `https://api.themoviedb.org/3/search/movie?api_key=${tmdbKey}&query=${encodeURIComponent(cleanTitle)}${searchYear ? `&year=${searchYear}` : ""}`;
  const searchRes = await fetch(searchUrl);
  const searchData = await searchRes.json();

  const candidates = searchData.results || [];
  if (candidates.length === 0) {
    return { query, found: false, error: "No matching movie found on TMDB." };
  }

  // If a context hint (actor/director name) was given, inspect top 5 candidates' credits to pick exact match
  let details = null;
  if (contextHint) {
    for (const cand of candidates.slice(0, 5)) {
      const dRes = await fetch(
        `https://api.themoviedb.org/3/movie/${cand.id}?api_key=${tmdbKey}&append_to_response=credits,videos,watch/providers`
      );
      const d = await dRes.json();
      const people = [
        ...(d.credits?.cast || []).slice(0, 10).map((p) => p.name?.toLowerCase() || ""),
        ...(d.credits?.crew || []).map((p) => p.name?.toLowerCase() || ""),
      ];
      if (people.some((name) => name.includes(contextHint))) {
        details = d;
        break;
      }
    }
  }

  if (!details) {
    const match = candidates[0];
    const detailsUrl = `https://api.themoviedb.org/3/movie/${match.id}?api_key=${tmdbKey}&append_to_response=credits,videos,watch/providers`;
    const detailsRes = await fetch(detailsUrl);
    details = await detailsRes.json();
  }

  const releaseYear = details.release_date ? parseInt(details.release_date.split("-")[0], 10) : null;
  const country = resolveCountry(details);
  const director = details.credits?.crew?.find((c) => c.job === "Director")?.name || null;

  const videos = details.videos?.results || [];
  const trailer =
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer" && v.official) ||
    videos.find((v) => v.site === "YouTube" && v.type === "Trailer") ||
    videos.find((v) => v.site === "YouTube");

  const rawProviders = details["watch/providers"]?.results || {};
  const streaming = {};
  for (const r of REGIONS) {
    const entry = rawProviders[r];
    if (!entry) continue;
    const flat = (entry.flatrate || []).map((p) => p.provider_name);
    const free = [...(entry.free || []), ...(entry.ads || [])].map((p) => `${p.provider_name} (Free)`);
    const combined = Array.from(new Set([...free, ...flat]));
    if (combined.length > 0) streaming[r] = combined;
  }

  const pdHint = getInitialPublicDomainHint(releaseYear, country);
  const archiveMatches =
    pdHint.status !== "likely_copyrighted" ? await searchArchiveOrg(details.title, releaseYear) : [];

  return {
    query,
    found: true,
    already_in_db: existingTmdbIds.has(details.id),
    tmdb_id: details.id,
    tmdb_url: `https://www.themoviedb.org/movie/${details.id}`,
    title: details.title,
    release_year: releaseYear,
    country,
    director,
    genres: (details.genres || []).map((g) => g.name),
    languages: Array.from(
      new Set((details.spoken_languages || []).map((l) => l.english_name).filter((n) => n && n !== "No Language"))
    ),
    trailer_url: trailer?.key ? `https://www.youtube.com/watch?v=${trailer.key}` : null,
    streaming_by_region: streaming,
    public_domain_hint: pdHint,
    archive_org_matches: archiveMatches,
  };
}

async function main() {
  const existingTmdbIds = new Set();
  if (supabase) {
    const { data } = await supabase.from("movies").select("tmdb_id");
    (data || []).forEach((m) => {
      if (m.tmdb_id) existingTmdbIds.add(m.tmdb_id);
    });
  }

  const results = [];
  for (const name of movieNames) {
    results.push(await lookupOne(name, existingTmdbIds));
  }
  console.log(JSON.stringify(results, null, 2));
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
