#!/usr/bin/env node
/**
 * Strict Direct YouTube Full-Movie & Real English-Subtitle Finder for Screen9
 *
 * Enforces hard quality & integrity guardrails so trailers, short clips, chopped edits,
 * and tiny/spam unofficial channels can NEVER be selected:
 *   1. Exact Duration Match: Must match official TMDB runtime within ±8 minutes
 *      (accounts for 4% PAL 25fps speedup on Indian films while rejecting trailers & chopped cuts).
 *   2. Real Caption Track Inspection: Searches YouTube directly (including YouTube's
 *      native Subtitles/CC filter) and checks real `captionTracks` for `en:manual`.
 *   3. Official vs Unofficial Channel Rules:
 *      - Recognized official studio/distributor channels are trusted once duration matches.
 *      - Unofficial channels are ONLY allowed if ALL of these hold:
 *          * Duration matches official runtime (within ±8 min)
 *          * Channel has >= 200,000 subscribers
 *          * Video has >= 500,000 views
 *          * Video is established (uploaded >= 1 year ago)
 *
 * Usage:
 *   node .agents/skills/movie-finder/scripts/find_youtube_movie.mjs --runtime 137 "Manorama Six Feet Under 2007"
 */

const UA =
  "Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36";

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const OFFICIAL_CHANNEL_PATTERNS = [
  /shemaroo/i,
  /eros/i,
  /nh\s*(studioz|bolly)/i,
  /drj\s*records/i,
  /zee\s*(studios|cinema|music|bollywood)/i,
  /goldmines/i,
  /ultra\s*(bollywood|movie|media)/i,
  /rajshri/i,
  /t-series/i,
  /yrf|yash\s*raj/i,
  /dharma/i,
  /nfdc|cinemas\s*of\s*india/i,
  /balaji/i,
  /star\s*studios/i,
  /sony\s*(liv|pictures|music)/i,
  /utv/i,
  /viacom18|jiocinema/i,
  /pen\s*movies/i,
  /tips\s*(official|films)/i,
  /venus\s*movies/i,
  /mosfilm/i,
  /nfb/i,
  /bfi/i,
];

function isOfficialChannel(channelName) {
  return OFFICIAL_CHANNEL_PATTERNS.some((re) => re.test(channelName || ""));
}

function parseLengthToSeconds(str) {
  if (!str) return 0;
  const parts = str.split(":").map((n) => parseInt(n, 10));
  if (parts.some(isNaN)) return 0;
  if (parts.length === 3) return parts[0] * 3600 + parts[1] * 60 + parts[2];
  if (parts.length === 2) return parts[0] * 60 + parts[1];
  return parts[0] || 0;
}

function parseCompactCount(str) {
  if (!str) return 0;
  const clean = str.replace(/,/g, "").trim();
  const m = clean.match(/([\d.]+)\s*(billion|million|thousand|[KMB])?/i);
  if (!m) return 0;
  const num = parseFloat(m[1]);
  const unit = (m[2] || "").toLowerCase();
  if (unit === "b" || unit === "billion") return Math.round(num * 1_000_000_000);
  if (unit === "m" || unit === "million") return Math.round(num * 1_000_000);
  if (unit === "k" || unit === "thousand") return Math.round(num * 1_000);
  return Math.round(num);
}

function parseAgeYears(publishedText) {
  if (!publishedText) return 0;
  const s = publishedText.toLowerCase();
  const y = s.match(/(\d+)\s*(y|year)/);
  if (y) return parseInt(y[1], 10);
  const mo = s.match(/(\d+)\s*(mo|month)/);
  if (mo) return parseInt(mo[1], 10) / 12;
  return 0;
}

function titleMatchesMovie(videoTitle, movieQuery) {
  const core = movieQuery
    .replace(/\b(19\d{2}|20\d{2})\b/g, "")
    .toLowerCase()
    .replace(/[^a-z0-9\s]/g, " ")
    .split(/\s+/)
    .filter((w) => w.length >= 2 && !["the", "of", "in", "and", "to", "a"].includes(w));

  if (core.length === 0) return true;
  const vt = (videoTitle || "").toLowerCase().replace(/[^a-z0-9\s]/g, " ");
  // Reject obvious trailers/promos/reviews/songs immediately
  if (/\b(trailer|teaser|promo|review|reaction|explained|interview|making\s+of|in\s+\d+\s+min)\b/i.test(vt)) {
    return false;
  }
  const matched = core.filter((w) => new RegExp(`\\b${w}\\b`).test(vt));
  return matched.length >= Math.max(1, Math.ceil(core.length * 0.6));
}

function durationMatchesRuntime(durationMin, expectedRuntimeMin) {
  // Absolute floor: never accept anything under 55 min unless the film itself is short
  const minFloor = expectedRuntimeMin ? Math.min(55, expectedRuntimeMin - 5) : 60;
  if (!durationMin || durationMin < minFloor) return false;
  if (!expectedRuntimeMin) return true;
  // Allow ±8 minutes tolerance (handles PAL 25fps 4% speedup while rejecting chopped cuts)
  return Math.abs(durationMin - expectedRuntimeMin) <= 8;
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
        const lengthSeconds = parseLengthToSeconds(lengthText);
        results.push({
          id: v.videoId,
          title: v.title?.runs?.map((r) => r.text).join("") || "",
          channel: v.ownerText?.runs?.[0]?.text || "",
          channelUrl: v.ownerText?.runs?.[0]?.navigationEndpoint?.browseEndpoint?.canonicalBaseUrl || null,
          lengthText,
          lengthSeconds,
          durationMin: Math.round(lengthSeconds / 60),
          viewsText: v.viewCountText?.simpleText || "",
          viewCount: parseCompactCount(v.viewCountText?.simpleText || ""),
          publishedText: v.publishedTimeText?.simpleText || "",
          ageYears: parseAgeYears(v.publishedTimeText?.simpleText || ""),
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

  // Extract subscriber count from ytInitialData if present on watch page
  let subscriberCount = 0;
  const subMatch = html.match(/"subscriberCountText":\{"accessibility":\{"accessibilityData":\{"label":"([^"]+)"/);
  if (subMatch) {
    subscriberCount = parseCompactCount(subMatch[1]);
  } else {
    const subSimple = html.match(/"subscriberCountText":\{"simpleText":"([^"]+)"/);
    if (subSimple) subscriberCount = parseCompactCount(subSimple[1]);
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
    officialChannel: isOfficialChannel(vd.author || ""),
    subscriberCount,
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

function passesQualityGate(info, expectedRuntimeMin) {
  if (!info.playableInEmbed) return { ok: false, reason: "Not embeddable" };
  if (!durationMatchesRuntime(info.durationMin, expectedRuntimeMin)) {
    return {
      ok: false,
      reason: `Duration ${info.durationMin}m does not match expected ${expectedRuntimeMin || ">=60"}m (±8m)`,
    };
  }
  // Official channels pass once duration & embeddability match
  if (info.officialChannel) return { ok: true, reason: "Official studio/distributor channel" };

  // Unofficial channels MUST meet strict thresholds:
  // >= 200k subscribers, >= 500k views, >= 1 year old
  if (info.viewCount < 500_000) {
    return { ok: false, reason: `Unofficial channel video has only ${info.viewCount} views (min 500k)` };
  }
  if (info.subscriberCount < 200_000) {
    return { ok: false, reason: `Unofficial channel has only ${info.subscriberCount} subscribers (min 200k)` };
  }
  if (info.ageYears < 1) {
    return { ok: false, reason: `Unofficial channel upload is too new (${info.ageYears}y, min 1y)` };
  }
  return { ok: true, reason: "Established high-view unofficial channel (>=200k subs, >=500k views)" };
}

export async function findBestYouTubeMovie(query, expectedRuntimeMin = null) {
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
        durationMatchesRuntime(h.durationMin, expectedRuntimeMin) &&
        titleMatchesMovie(h.title, cleanQuery) &&
        !candidateMap.has(h.id)
      ) {
        candidateMap.set(h.id, h);
      }
    }
  }

  // Prioritize official channels + CC badge + high views, cap at 5 inspections to avoid HTTP 429
  const sortedCandidates = Array.from(candidateMap.values()).sort((a, b) => {
    const score = (c) =>
      (c.badges.includes("CC") ? 200 : 0) +
      (isOfficialChannel(c.channel) ? 100 : 0) +
      (c.viewCount >= 500_000 ? 80 : 0) +
      (/\b(eng(lish)?\s*(sub|subs|subtitle|subtitles|cc))\b/i.test(c.title) ? 40 : 0);
    return score(b) - score(a);
  });

  const candidates = sortedCandidates.slice(0, 5);
  const accepted = [];
  const rejected = [];

  for (const c of candidates) {
    await sleep(450);
    const info = await inspectYouTubeVideo(c.id);
    if (info.error === "HTTP 429") {
      // Rate-limited fallback: ONLY allow verified official channels via oEmbed (never unverified unofficial channels)
      if (!isOfficialChannel(c.channel)) {
        rejected.push({ id: c.id, title: c.title, reason: "Rate-limited; cannot verify unofficial subscriber count" });
        continue;
      }
      const oe = await fetch(
        `https://www.youtube.com/oembed?format=json&url=${encodeURIComponent(`https://www.youtube.com/watch?v=${c.id}`)}`
      );
      if (oe.ok) {
        const fallbackInfo = {
          id: c.id,
          url: `https://www.youtube.com/watch?v=${c.id}`,
          embedUrl: `https://www.youtube.com/embed/${c.id}?autoplay=1&controls=1&fs=1&rel=0&playsinline=1&vq=hd1080`,
          title: c.title,
          channel: c.channel,
          officialChannel: true,
          subscriberCount: 0,
          lengthSeconds: c.lengthSeconds,
          durationMin: c.durationMin,
          viewCount: c.viewCount,
          publishDate: c.publishedText || null,
          ageYears: c.ageYears,
          playable: true,
          playableInEmbed: true,
          hasManualEnglishCC: c.badges.includes("CC"),
          hasAutoEnglishCC: false,
          titleClaimsEnglishSubs: /\b(eng(lish)?\s*(sub|subs|subtitle|subtitles|cc))\b/i.test(c.title),
          captions: [],
          note: "Official channel verified via search duration + CC badge + oEmbed",
        };
        accepted.push(fallbackInfo);
      }
      continue;
    }

    const gate = passesQualityGate(info, expectedRuntimeMin);
    if (gate.ok) {
      accepted.push({ ...info, gateReason: gate.reason });
    } else {
      rejected.push({ id: info.id, channel: info.channel, durationMin: info.durationMin, views: info.viewCount, subs: info.subscriberCount, reason: gate.reason });
    }
  }

  // Ranking among strictly accepted full-length candidates:
  // 1. Real manual English CC (+1,000,000)
  // 2. Official studio channel (+150,000)
  // 3. Closest to official runtime (+100,000 if within ±3m)
  // 4. Views & age
  accepted.sort((a, b) => {
    const score = (x) => {
      let s = 0;
      if (x.hasManualEnglishCC) s += 1_000_000;
      if (x.officialChannel) s += 150_000;
      if (expectedRuntimeMin && Math.abs(x.durationMin - expectedRuntimeMin) <= 3) s += 100_000;
      if (x.titleClaimsEnglishSubs) s += 50_000;
      s += Math.min(x.viewCount / 1000, 50_000);
      return s;
    };
    return score(b) - score(a);
  });

  return {
    query: cleanQuery,
    expectedRuntimeMin,
    best: accepted[0] || null,
    alternatives: accepted.slice(1, 3),
    rejected,
  };
}

// CLI entrypoint: supports optional `--runtime <minutes>`
if (import.meta.url === `file://${process.argv[1]}`) {
  const args = process.argv.slice(2);
  let runtimeMin = null;
  const queries = [];
  for (let i = 0; i < args.length; i++) {
    if (args[i] === "--runtime" && args[i + 1]) {
      runtimeMin = parseInt(args[i + 1], 10) || null;
      i++;
    } else if (args[i]) {
      queries.push(args[i]);
    }
  }
  if (queries.length === 0) {
    console.error('Usage: node find_youtube_movie.mjs [--runtime 137] "Movie Name Year" ...');
    process.exit(1);
  }
  const results = [];
  for (const q of queries) {
    results.push(await findBestYouTubeMovie(q, runtimeMin));
  }
  console.log(JSON.stringify(results, null, 2));
}
