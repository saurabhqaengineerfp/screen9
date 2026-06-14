import Image from "next/image";
import Link from "next/link";
import { Play, Info } from "lucide-react";
import styles from "./page.module.css";
import HeroVideo from "@/components/HeroVideo";
import MoreInfoModal from "@/components/MoreInfoModal";
import { createClient } from "@/utils/supabase/server";

export const dynamic = 'force-dynamic';

export default async function Home() {
  const supabase = await createClient();
  
  // Fetch movies from DB
  const { data: dbMovies } = await supabase
    .from('movies')
    .select('*')
    .order('created_at', { ascending: false });

  const trendingMovies = dbMovies || [];

  // Use the most recent movie as the Hero, fallback to Dune if DB is empty
  const heroMovie = trendingMovies.length > 0 ? trendingMovies[0] : {
    title: "Dune: Part Two",
    description: "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
    video_url: null,
    genres: ["Science Fiction", "Adventure"],
    release_year: 2024,
    content_rating: "PG-13",
    runtime: 166
  };

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
                <Link href={`/watch/${movie.id}`} key={movie.id} className={styles.card}>
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
                </Link>
              ))}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}
