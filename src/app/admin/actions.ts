"use server";

import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { extractVimeoId, extractYouTubeId, SUPPORTED_REGIONS, WatchProvidersMap } from "@/utils/movieHelpers";

const getAdminSupabase = () => {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) throw new Error("Missing Supabase URL or SUPABASE_SERVICE_ROLE_KEY in .env.local");
  return createSupabaseClient(url, key);
};

function normalizeVideoSource(videoUrl?: string | null): {
  videoSourceType: "youtube" | "vimeo" | "native" | "ott";
  cleanVideoUrl: string | null;
  watchMode: "embed" | "ott" | "native";
} {
  const trimmed = (videoUrl || "").trim();
  if (!trimmed) {
    return { videoSourceType: "ott", cleanVideoUrl: null, watchMode: "ott" };
  }

  const ytId = extractYouTubeId(trimmed);
  if (ytId) {
    return {
      videoSourceType: "youtube",
      cleanVideoUrl: `https://www.youtube.com/embed/${ytId}?autoplay=1&controls=1&rel=0&playsinline=1`,
      watchMode: "embed",
    };
  }

  const vimeoId = extractVimeoId(trimmed);
  if (vimeoId) {
    return {
      videoSourceType: "vimeo",
      cleanVideoUrl: `https://player.vimeo.com/video/${vimeoId}?autoplay=1`,
      watchMode: "embed",
    };
  }

  return {
    videoSourceType: "native",
    cleanVideoUrl: trimmed,
    watchMode: "native",
  };
}

function extractWatchProviders(rawResults: any): WatchProvidersMap | null {
  if (!rawResults || typeof rawResults !== "object") return null;
  const filtered: WatchProvidersMap = {};
  for (const { code } of SUPPORTED_REGIONS) {
    const entry = rawResults[code];
    if (entry) {
      filtered[code] = {
        link: entry.link,
        flatrate: entry.flatrate?.map((p: any) => ({
          provider_id: p.provider_id,
          provider_name: p.provider_name,
          logo_path: p.logo_path,
        })),
        free: entry.free?.map((p: any) => ({
          provider_id: p.provider_id,
          provider_name: p.provider_name,
          logo_path: p.logo_path,
        })),
        ads: entry.ads?.map((p: any) => ({
          provider_id: p.provider_id,
          provider_name: p.provider_name,
          logo_path: p.logo_path,
        })),
        rent: entry.rent?.map((p: any) => ({
          provider_id: p.provider_id,
          provider_name: p.provider_name,
          logo_path: p.logo_path,
        })),
        buy: entry.buy?.map((p: any) => ({
          provider_id: p.provider_id,
          provider_name: p.provider_name,
          logo_path: p.logo_path,
        })),
      };
    }
  }
  return Object.keys(filtered).length > 0 ? filtered : null;
}

function extractOfficialTrailer(videos: any): string | null {
  const list = videos?.results;
  if (!Array.isArray(list)) return null;
  const preferred =
    list.find((v: any) => v.site === "YouTube" && v.type === "Trailer" && v.official) ||
    list.find((v: any) => v.site === "YouTube" && v.type === "Trailer") ||
    list.find((v: any) => v.site === "YouTube");
  return preferred?.key ? `https://www.youtube.com/watch?v=${preferred.key}` : null;
}

export async function addMovie(formData: FormData) {
  const tmdbUrl = (formData.get("tmdbUrl") as string)?.trim();
  const videoUrl = (formData.get("videoUrl") as string)?.trim() || "";
  const manualTrailerUrl = (formData.get("trailerUrl") as string)?.trim() || null;
  const category = (formData.get("category") as string) || "";
  const startTimeStr = formData.get("start_time") as string;
  const endTimeStr = formData.get("end_time") as string;
  const manualCountry = (formData.get("country") as string)?.trim();
  const manualPeriod = (formData.get("period") as string)?.trim();
  const manualTagsStr = (formData.get("tags") as string)?.trim();
  const curatorNote = (formData.get("curator_note") as string)?.trim() || null;
  const sourceChannel = (formData.get("source_channel") as string)?.trim() || null;

  if (!tmdbUrl) {
    throw new Error("TMDB URL is required.");
  }

  const start_time = startTimeStr ? parseInt(startTimeStr, 10) : null;
  const end_time = endTimeStr ? parseInt(endTimeStr, 10) : null;

  const tmdbMatch = tmdbUrl.match(/\/movie\/(\d+)/);
  if (!tmdbMatch) {
    throw new Error("Invalid TMDB URL. Example: https://www.themoviedb.org/movie/12345-movie-name");
  }
  const tmdbId = tmdbMatch[1];

  const { videoSourceType, cleanVideoUrl, watchMode } = normalizeVideoSource(videoUrl);

  const tmdbKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!tmdbKey) throw new Error("TMDB API key is missing in .env.local");

  // Fetch full details from TMDB including credits, keywords, official videos/trailers, and watch providers
  const detailsRes = await fetch(
    `https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbKey}&append_to_response=credits,keywords,videos,watch/providers`
  );
  const detailsData = await detailsRes.json();

  if (detailsData.success === false) {
    throw new Error("TMDB Error: " + detailsData.status_message);
  }

  const supabase = getAdminSupabase();

  const director = detailsData.credits?.crew?.find((person: any) => person.job === "Director")?.name || null;
  const castMembers = detailsData.credits?.cast?.slice(0, 5).map((person: any) => person.name) || [];

  const releaseYear = detailsData.release_date ? parseInt(detailsData.release_date.split("-")[0], 10) : null;
  const autoPeriod = releaseYear ? `${Math.floor(releaseYear / 10) * 10}s` : null;
  const autoCountry = detailsData.production_countries?.length > 0 ? detailsData.production_countries[0].name : null;

  const tmdbGenres = detailsData.genres?.map((g: any) => g.name) || [];
  const tmdbKeywords = detailsData.keywords?.keywords?.map((k: any) => k.name) || [];
  const tmdbLanguages = detailsData.spoken_languages?.map((l: any) => l.english_name) || [];
  const autoTags = Array.from(new Set([...tmdbGenres, ...tmdbKeywords, ...tmdbLanguages]));

  const manualTags = manualTagsStr ? manualTagsStr.split(",").map((t) => t.trim()).filter(Boolean) : [];
  const finalTags = Array.from(new Set([...manualTags, ...autoTags]));

  const autoTrailerUrl = extractOfficialTrailer(detailsData.videos);
  const watchProviders = extractWatchProviders(detailsData["watch/providers"]?.results);

  let finalCategory = category;
  if (!finalCategory || finalCategory === "Trending" || finalCategory === "Auto-Assign") {
    finalCategory = tmdbGenres.length > 0 ? tmdbGenres[0] : "Curated";
    const { data: existingCat } = await supabase.from("categories").select("id").eq("name", finalCategory).single();
    if (!existingCat) {
      await supabase.from("categories").insert({ name: finalCategory });
    }
  }

  const { error } = await supabase.from("movies").insert({
    title: detailsData.title,
    description: detailsData.overview,
    poster_url: detailsData.poster_path ? `https://image.tmdb.org/t/p/w500${detailsData.poster_path}` : null,
    backdrop_url: detailsData.backdrop_path ? `https://image.tmdb.org/t/p/original${detailsData.backdrop_path}` : null,
    release_year: releaseYear,
    genres: tmdbGenres,
    category: finalCategory,
    video_source_type: videoSourceType,
    video_url: cleanVideoUrl,
    watch_mode: watchMode,
    trailer_url: manualTrailerUrl || autoTrailerUrl,
    tmdb_id: parseInt(tmdbId, 10),
    duration: (detailsData.runtime || 120) * 60,
    director,
    cast_members: castMembers,
    start_time,
    end_time,
    country: manualCountry || autoCountry,
    period: manualPeriod || autoPeriod,
    tags: finalTags,
    curator_note: curatorNote,
    source_channel: sourceChannel,
    watch_providers: watchProviders,
  });

  if (error) {
    console.error("Supabase insert error:", error);
    throw new Error("Failed to save to database: " + error.message);
  }

  return { success: true, title: detailsData.title, watchMode };
}

export async function loginAdmin(password: string) {
  const adminPassword = process.env.ADMIN_PASSWORD;
  if (!adminPassword) throw new Error("Admin password not set in environment");

  if (password === adminPassword) {
    const { cookies } = await import("next/headers");
    const cookieStore = await cookies();
    cookieStore.set("admin_auth", "true", {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      maxAge: 60 * 60 * 24 * 30,
    });
    return { success: true };
  } else {
    throw new Error("Invalid password");
  }
}

export async function deleteMovie(id: string) {
  const supabase = getAdminSupabase();
  const { error } = await supabase.from("movies").delete().eq("id", id);
  if (error) {
    throw new Error("Failed to delete movie: " + error.message);
  }
  return { success: true };
}

export async function updateMovie(id: string, formData: FormData) {
  const title = (formData.get("title") as string)?.trim();
  const videoUrl = (formData.get("videoUrl") as string)?.trim() || "";
  const trailerUrl = (formData.get("trailerUrl") as string)?.trim() || null;
  const category = (formData.get("category") as string) || "Curated";
  const startTimeStr = formData.get("start_time") as string;
  const endTimeStr = formData.get("end_time") as string;
  const country = (formData.get("country") as string)?.trim() || null;
  const period = (formData.get("period") as string)?.trim() || null;
  const tagsStr = (formData.get("tags") as string)?.trim();
  const curatorNote = (formData.get("curator_note") as string)?.trim() || null;
  const sourceChannel = (formData.get("source_channel") as string)?.trim() || null;

  if (!title) throw new Error("Title is required.");

  const start_time = startTimeStr ? parseInt(startTimeStr, 10) : null;
  const end_time = endTimeStr ? parseInt(endTimeStr, 10) : null;

  const { videoSourceType, cleanVideoUrl, watchMode } = normalizeVideoSource(videoUrl);

  const supabase = getAdminSupabase();
  const updatePayload = {
    title,
    video_url: cleanVideoUrl,
    trailer_url: trailerUrl,
    category,
    start_time,
    end_time,
    video_source_type: videoSourceType,
    watch_mode: watchMode,
    country,
    period,
    curator_note: curatorNote,
    source_channel: sourceChannel,
    tags: tagsStr ? tagsStr.split(",").map((t) => t.trim()).filter(Boolean) : [],
  };

  const { data, error } = await supabase.from("movies").update(updatePayload).eq("id", id).select().single();

  if (error) {
    throw new Error("Failed to update movie: " + error.message);
  }

  return { success: true, title, movie: data };
}

export async function addCategory(formData: FormData) {
  const name = (formData.get("name") as string)?.trim();
  if (!name) throw new Error("Category name is required");

  const supabase = getAdminSupabase();
  const { error } = await supabase.from("categories").insert({ name });

  if (error) {
    throw new Error("Failed to add category: " + error.message);
  }
  return { success: true, name };
}

export async function deleteCategory(id: string) {
  const supabase = getAdminSupabase();
  const { error } = await supabase.from("categories").delete().eq("id", id);
  if (error) {
    throw new Error("Failed to delete category: " + error.message);
  }
  return { success: true };
}
