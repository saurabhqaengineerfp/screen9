"use server";

import { createClient } from "@/utils/supabase/server";

export async function addMovie(formData: FormData) {
  const tmdbUrl = formData.get("tmdbUrl") as string;
  const videoUrl = formData.get("videoUrl") as string;
  const category = formData.get("category") as string || "Trending";

  if (!tmdbUrl || !videoUrl) throw new Error("TMDB URL and Video URL are required");

  // Extract TMDB ID from URL
  const tmdbMatch = tmdbUrl.match(/\/movie\/(\d+)/);
  if (!tmdbMatch) {
    throw new Error("Invalid TMDB URL. Example: https://www.themoviedb.org/movie/12345-movie-name");
  }
  const tmdbId = tmdbMatch[1];

  // Determine video source type and clean URL
  let videoSourceType = 'native';
  let cleanVideoUrl = videoUrl;

  if (videoUrl.includes("youtube.com") || videoUrl.includes("youtu.be")) {
    videoSourceType = 'youtube';
    let videoId = "";
    if (videoUrl.includes("v=")) {
      videoId = videoUrl.split("v=")[1].split("&")[0];
    } else if (videoUrl.includes("youtu.be/")) {
      videoId = videoUrl.split("youtu.be/")[1].split("?")[0];
    }
    if (videoId) {
      cleanVideoUrl = `https://www.youtube.com/embed/${videoId}?autoplay=1&mute=0&controls=1`;
    }
  } else if (videoUrl.includes("vimeo.com")) {
    videoSourceType = 'vimeo';
    const vimeoMatch = videoUrl.match(/vimeo\.com\/(\d+)/);
    if (vimeoMatch) {
      cleanVideoUrl = `https://player.vimeo.com/video/${vimeoMatch[1]}?autoplay=1`;
    }
  }

  const tmdbKey = process.env.NEXT_PUBLIC_TMDB_API_KEY;
  if (!tmdbKey) throw new Error("TMDB API key is missing in .env.local");

  // Fetch full details from TMDB
  const detailsRes = await fetch(`https://api.themoviedb.org/3/movie/${tmdbId}?api_key=${tmdbKey}`);
  const detailsData = await detailsRes.json();

  if (detailsData.success === false) {
    throw new Error("TMDB Error: " + detailsData.status_message);
  }

  const supabase = await createClient();
  
  const { error } = await supabase.from('movies').insert({
    title: detailsData.title,
    description: detailsData.overview,
    poster_url: detailsData.poster_path ? `https://image.tmdb.org/t/p/w500${detailsData.poster_path}` : null,
    backdrop_url: detailsData.backdrop_path ? `https://image.tmdb.org/t/p/original${detailsData.backdrop_path}` : null,
    release_year: detailsData.release_date ? parseInt(detailsData.release_date.split('-')[0]) : null,
    genres: detailsData.genres?.map((g: any) => g.name) || [],
    category: category,
    video_source_type: videoSourceType,
    video_url: cleanVideoUrl,
    tmdb_id: parseInt(tmdbId),
    duration: (detailsData.runtime || 120) * 60 // convert minutes to seconds
  });

  if (error) {
    console.error("Supabase insert error:", error);
    throw new Error("Failed to save to database: " + error.message);
  }

  return { success: true, title: detailsData.title };
}
