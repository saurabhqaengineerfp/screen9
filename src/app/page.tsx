import Image from "next/image";
import Link from "next/link";
import { Play, Info } from "lucide-react";
import styles from "./page.module.css";
import HeroVideo from "@/components/HeroVideo";
import MoreInfoModal from "@/components/MoreInfoModal";
import { createClient } from "@/utils/supabase/server";
import { headers } from "next/headers";

export const dynamic = 'force-dynamic';
export const revalidate = 0;
export const fetchCache = 'force-no-store';

export default async function Home() {
  await headers(); // Explicitly opt-into dynamic rendering to bypass Vercel CDN/Data cache
  const supabase = await createClient();
  
  // Fetch movies from DB
  const { data: dbMovies } = await supabase
    .from('movies')
    .select('*')
    .order('created_at', { ascending: false });

  const trendingMovies = dbMovies || [];

  // Pick a random movie for the Hero section, fallback to Dune if DB is empty
  const heroMovie = trendingMovies.length > 0 ? trendingMovies[Math.floor(Math.random() * trendingMovies.length)] : {
    title: "Dune: Part Two",
    description: "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
    video_url: null,
    genres: ["Science Fiction", "Adventure"],
    release_year: 2024,
    content_rating: "PG-13",
    runtime: 166
  };

  // Dynamically extract top tags for curated rails
  const tagCounts: Record<string, number> = {};
  trendingMovies.forEach(movie => {
    (movie.tags || []).forEach((tag: string) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });
  
  // Sort tags by frequency
  const sortedTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .map(t => t[0]);

  // Build unique rails to avoid identical rows
  const renderedMovieSets = new Set<string>();
  const curatedRails = [];
  
  for (const tag of sortedTags) {
    if (curatedRails.length >= 4) break; // Limit to 4 rails max
    
    const tagMovies = trendingMovies.filter(m => (m.tags || []).includes(tag));
    if (tagMovies.length < 2) continue; // Only show rail if there are multiple movies
    
    // Create a unique signature for this set of movies (e.g. "uuid1,uuid2")
    const movieSignature = tagMovies.map(m => m.id).sort().join(',');
    if (renderedMovieSets.has(movieSignature)) {
      continue; // Skip this tag because we already have a row with these exact movies
    }
    
    renderedMovieSets.add(movieSignature);
    curatedRails.push({ tag, movies: tagMovies });
  }

  return (
    <main className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <HeroVideo movie={heroMovie || undefined} />
        </div>
        
        <div className={styles.heroContent}>
          <div className={`animate-fade-in ${styles.heroInfo}`}>
            <h1 className={styles.title}>{heroMovie.title}</h1>
            <div className={styles.meta}>
              <span className={styles.match}>Trending Now</span>
              <span>{heroMovie.release_year}</span>
              {heroMovie.content_rating && <span className={styles.rating}>{heroMovie.content_rating}</span>}
              {heroMovie.runtime && <span>{Math.floor(heroMovie.runtime / 60)}h {heroMovie.runtime % 60}m</span>}
            </div>
            <p className={styles.description}>{heroMovie.description}</p>
            
            <div className={styles.genres}>
              {heroMovie.genres?.slice(0, 3).map((g: string) => <span key={g}>{g}</span>)}
            </div>

            <div className={styles.actions}>
              <Link href={heroMovie.id ? `/watch/${heroMovie.id}` : '#'} className={`btn-primary ${styles.playBtn}`}>
                <Play fill="currentColor" size={20} />
                Play Now
              </Link>
              <MoreInfoModal movie={heroMovie} />
            </div>
          </div>
        </div>
      </section>

      {/* Rows Section */}
      <section className={styles.rowsContainer}>
        <div className={styles.row}>
          <h2 className={styles.rowTitle}>Recently Added</h2>
          {trendingMovies.length === 0 ? (
            <p style={{ color: 'rgba(255,255,255,0.6)', paddingLeft: '40px' }}>No movies in the database yet.</p>
          ) : (
            <div className={styles.cardsScroll}>
              {trendingMovies.map((movie) => (
                <MoreInfoModal movie={movie} key={movie.id}>
                  <div className={styles.card}>
                    {movie.poster_url ? (
                      <Image 
                        src={movie.poster_url} 
                        alt={movie.title} 
                        className={styles.poster}
                        fill
                        unoptimized
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333'}}>
                        {movie.title}
                      </div>
                    )}
                    <div className={styles.cardOverlay}>
                      <div className={styles.cardActions}>
                        <Link href={`/watch/${movie.id}`} onClick={(e) => e.stopPropagation()} className={styles.cardPlayBtn}>
                          <Play fill="currentColor" size={20} />
                        </Link>
                        <div className={styles.cardInfoBtn}>
                          <Info size={20} />
                        </div>
                      </div>
                    </div>
                  </div>
                </MoreInfoModal>
              ))}
            </div>
          )}
        </div>

        {/* Dynamic Tag Rails */}
        {curatedRails.map(rail => (
          <div className={styles.row} key={rail.tag}>
            <h2 className={styles.rowTitle}>Curated Collection: {rail.tag}</h2>
            <div className={styles.cardsScroll}>
              {rail.movies.map((movie) => (
                <MoreInfoModal movie={movie} key={movie.id}>
                  <div className={styles.card}>
                    {movie.poster_url ? (
                      <Image 
                        src={movie.poster_url} 
                        alt={movie.title} 
                        className={styles.poster}
                        fill
                        unoptimized
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div style={{width: '100%', height: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#333'}}>
                        {movie.title}
                      </div>
                    )}
                    <div className={styles.cardOverlay}>
                      <div className={styles.cardActions}>
                        <Link href={`/watch/${movie.id}`} onClick={(e) => e.stopPropagation()} className={styles.cardPlayBtn}>
                          <Play fill="currentColor" size={20} />
                        </Link>
                        <div className={styles.cardInfoBtn}>
                          <Info size={20} />
                        </div>
                      </div>
                    </div>
                  </div>
                </MoreInfoModal>
              ))}
            </div>
          </div>
        ))}
      </section>
    </main>
  );
}
