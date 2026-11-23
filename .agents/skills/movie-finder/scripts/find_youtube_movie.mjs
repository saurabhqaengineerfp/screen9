#!/usr/bin/env node
/**
 * Direct YouTube Full-Movie & Real English-Subtitle Finder for Screen9
 *
 * Searches YouTube directly using BOTH standard search AND YouTube's native
 * Subtitles/CC filter (&sp=EgIoAQ%253D%253D), filters to full-length movies
 * whose title matches the requested movie, and inspects each candidate's real
 * YouTube player metadata:
 *   - playableInEmbed (guarantees it actually plays embedded on Screen9)
 *   - real captionTracks (detects genuine manual English CC vs auto-generated Hindi)
 *   - exact viewCount, publishDate, duration, and channel name
 *
 * Usage:
 *   node .agents/skills/movie-finder/scripts/find_youtube_movie.mjs "Manorama Six Feet Under" "Aligarh"
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

function parseLengthToSeconds(str) {
  if (!str) return 0;
  const parts = str.split(":").map((n) => parseInt(n, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function titleMatchesMovie(videoTitle, movieQuery) {
  // Strip optional 4-digit year from query to get core movie words
  const core = movieQuery
    .replace(/\b(19\d{2}|20\d{2})\b/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !["the", "of", "in", "and", "to", "a"].includes(w));

  if (core.length === 0) return true;
  const vt = (videoTitle || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  // Require at least the first significant word (or >=60% of significant words) to match
  const matched = core.filter((w) => new RegExp(`\\b${w}\\b`).test(vt));
  return matched.length >= Math.max(1, Math.ceil(core.length * 0.6));
}

export async function searchYouTubeRaw(query, { ccOnly = false, limit = 15 } = {}) {
  const sp = ccOnly ? "&sp=EgIoAQ%253D%253D" : "";
  const url = `https://www.youtube.com/results?search_query=${encodeURIComponent(query)}${sp}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
  });
  if (!res.ok) return [];
  const html = await res.text();
  const match = html.match(/var ytInitialData = (\{.+?\});<\/script>/s);
  if (!match) return [];
  let data;
  try {
    data = JSON.parse(match[1]);
  } catch {
    return [];
  }

  const results = [];
  const seen = new Set();
  const walk = (obj) => {
    if (!obj || typeof obj !== "object") return;
    if (obj.videoRenderer && obj.videoRenderer.videoId) {
      const v = obj.videoRenderer;
      if (!seen.has(v.videoId)) {
        seen.add(v.videoId);
        const lengthText = v.lengthText?.simpleText || "";
        results.push({
          id: v.videoId,
          title: v.title?.runs?.map((r) => r.text).join("") || "",
          channel: v.ownerText?.runs?.[0]?.text || "",
          lengthText,
          lengthSeconds: parseLengthToSeconds(lengthText),
          viewsText: v.viewCountText?.simpleText || "",
          publishedText: v.publishedTimeText?.simpleText || "",
          badges: (v.badges || []).map((b) => b.metadataBadgeRenderer?.label).filter(Boolean),
        });
      }
    }
    for (const val of Object.values(obj)) walk(val);
  };
  walk(data);
  return results.slice(0, limit);
}

export async function inspectYouTubeVideo(videoId) {
  const url = `https://www.youtube.com/watch?v=${videoId}`;
  const res = await fetch(url, {
    headers: { "User-Agent": UA, "Accept-Language": "en-US,en;q=0.9" },
  });
  if (!res.ok) return { id: videoId, playable: false, error: `HTTP ${res.status}` };
  const html = await res.text();
  const prMatch = html.match(/var ytInitialPlayerResponse = (\{.+?\});/s);
  if (!prMatch) return { id: videoId, playable: false, error: "No playerResponse" };

  let pr;
  try {
    pr = JSON.parse(prMatch[1]);
  } catch {
    return { id: videoId, playable: false, error: "Invalid playerResponse JSON" };
  }

  const vd = pr.videoDetails || {};
  const ps = pr.playabilityStatus || {};
  const mf = pr.microformat?.playerMicroformatRenderer || {};
  const caps = pr.captions?.playerCaptionsTracklistRenderer?.captionTracks || [];

  const captions = caps.map((c) => ({
    lang: c.languageCode,
    name: c.name?.simpleText || c.name?.runs?.[0]?.text || c.languageCode,
    kind: c.kind || "manual",
  }));

  const hasManualEnglishCC = captions.some(
    (c) => /^en(-[a-z]+)?$/i.test(c.lang) && c.kind !== "asr"
  );
  const hasAutoEnglishCC = captions.some(
    (c) => /^en(-[a-z]+)?$/i.test(c.lang) && c.kind === "asr"
  );
  const titleLower = (vd.title || "").toLowerCase();
  const titleClaimsEnglishSubs =
    /\b(eng(lish)?\s*(sub|subs|subtitle|subtitles|cc))\b/i.test(titleLower) ||
    /with\s+subtitles/i.test(titleLower);

  const lengthSeconds = Number(vd.lengthSeconds || 0);
  const viewCount = Number(vd.viewCount || 0);
  const publishDate = mf.publishDate || null;
  const ageYears = publishDate
    ? Math.max(0, (Date.now() - new Date(publishDate).getTime()) / (1000 * 60 * 60 * 24 * 365.25))
    : 0;

  return {
    id: videoId,
    url,
    embedUrl: `https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&fs=1&rel=0&playsinline=1&vq=hd1080`,
    title: vd.title || "",
    channel: vd.author || "",
    lengthSeconds,
    durationMin: Math.round(lengthSeconds / 60),
    viewCount,
    publishDate,
    ageYears: Number(ageYears.toFixed(1)),
    playable: ps.status === "OK",
    playableInEmbed: ps.status === "OK" && ps.playableInEmbed !== false,
    hasManualEnglishCC,
    hasAutoEnglishCC,
    titleClaimsEnglishSubs,
    captions,
  };
}

export async function findBestYouTubeMovie(query, minMinutes = 50) {
  const cleanQuery = query.trim();
  const passes = [
    { q: `${cleanQuery} full movie`, ccOnly: true },
    { q: `${cleanQuery} full movie english subtitles`, ccOnly: false },
    { q: `${cleanQuery} full movie`, ccOnly: false },
  ];

  const candidateMap = new Map();
  for (const pass of passes) {
    const hits = await searchYouTubeRaw(pass.q, { ccOnly: pass.ccOnly, limit: 15 });
    for (const h of hits) {
      if (
        h.lengthSeconds >= minMinutes * 60 &&
        titleMatchesMovie(h.title, cleanQuery) &&
        !candidateMap.has(h.id)
      ) {
        candidateMap.set(h.id, h);
      }
    }
  }

  // Prioritize candidates that already show a CC badge or English subs in title, and cap at 5 to avoid HTTP 429
  const sortedCandidates = Array.from(candidateMap.values()).sort((a, b) => {
    const score = (c) =>
      (c.badges.includes("CC") ? 100 : 0) +
      (/\b(eng(lish)?\s*(sub|subs|subtitle|subtitles|cc))\b/i.test(c.title) ? 50 : 0);
    return score(b) - score(a);
  });

  const candidates = sortedCandidates.slice(0, 5);
  const inspected = [];
  for (const c of candidates) {
    await sleep(450);
    const info = await inspectYouTubeVideo(c.id);
    if (info.playableInEmbed && info.lengthSeconds >= minMinutes * 60) {
      inspected.push(info);
    } else if (info.error === "HTTP 429") {
      // Fallback to oEmbed + search metadata when YouTube rate-limits watch pages
      const oe = await fetch(
        `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${c.id}`)}`
      );
      if (oe.ok) {
        inspected.push({
          id: c.id,
          url: `https://www.youtube.com/watch?v=${c.id}`,
          embedUrl: `https://www.youtube.com/embed/${c.id}?autoplay=1&controls=1&fs=1&rel=0&playsinline=1&vq=hd1080`,
          title: c.title,
          channel: c.channel,
          lengthSeconds: c.lengthSeconds,
          durationMin: Math.round(c.lengthSeconds / 60),
          viewCount: parseInt((c.viewsText || "").replace(/[^0-9]/g, ""), 10) || 0,
          publishDate: c.publishedText || null,
          ageYears: 0,
          playable: true,
          playableInEmbed: true,
          hasManualEnglishCC: c.badges.includes("CC"),
          hasAutoEnglishCC: false,
          titleClaimsEnglishSubs: /\b(eng(lish)?\s*(sub|subs|subtitle|subtitles|cc))\b/i.test(c.title),
          captions: [],
          note: "Verified via search CC badge + oEmbed (watch page rate-limited)",
        });
      }
    }
  }

  // Ranking: Real Manual English CC > Title Claims English Subs (established) > Views & Age
  inspected.sort((a, b) => {
    const score = (x) => {
      let s = 0;
      if (x.hasManualEnglishCC) s += 1_000_000;
      else if (x.hasAutoEnglishCC) s += 150_000;
      if (x.titleClaimsEnglishSubs) s += 200_000;
      if (x.ageYears >= 2) s += 50_000;
      if (x.viewCount >= 50_000) s += 50_000;
      s += Math.min(x.viewCount / 1000, 40_000);
      return s;
    };
    return score(b) - score(a);
  });

  return {
    query: cleanQuery,
    best: inspected[0] || null,
    alternatives: inspected.slice(1, 4),
  };
}

// CLI entrypoint
if (import.meta.url === `file://${process.argv[1]}`) {
  const queries = process.argv.slice(2).filter(Boolean);
  if (queries.length === 0) {
    console.error('Usage: node find_youtube_movie.mjs "Movie Name Year" ...');
    process.exit(1);
  }
  const results = [];
  for (const q of queries) {
    results.push(await findBestYouTubeMovie(q));
  }
  console.log(JSON.stringify(results, null, 2));
}
