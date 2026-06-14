"use server";

import { createClient } from "@/utils/supabase/server";
import Fuse from "fuse.js";

// Global cache for movies in Node.js serverless environment (might reset per cold start, which is fine)
let cachedMovies: any[] | null = null;
let lastFetchTime = 0;
const CACHE_TTL = 1000 * 60 * 5; // 5 minutes

export async function searchMovies(query: string) {
  if (!query || query.trim().length === 0) {
    return [];
  }

  // Fetch or use cached movies
  const now = Date.now();
  if (!cachedMovies || now - lastFetchTime > CACHE_TTL) {
    const supabase = await createClient();
    const { data } = await supabase
      .from('movies')
      .select('id, title, poster_url, release_year')
      .order('title');
    
    if (data) {
      cachedMovies = data;
      lastFetchTime = now;
    } else {
      cachedMovies = [];
    }
  }

  if (cachedMovies.length === 0) return [];

  // Setup Fuse.js for fuzzy searching
  const fuse = new Fuse(cachedMovies, {
    keys: ['title'],
    includeScore: true,
    threshold: 0.4, // 0 is perfect match, 1 is anything. 0.4 handles typos well.
    distance: 100, // How far the match can be from the start
  });

  // Perform search
  const results = fuse.search(query);

  // Return top 5 results
  return results.slice(0, 5).map(result => result.item);
}
