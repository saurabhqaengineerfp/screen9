import Image from "next/image";
import Link from "next/link";
import { Play, Info } from "lucide-react";
import styles from "./page.module.css";
import HeroVideo from "@/components/HeroVideo";

export default function Home() {
  // Mock data since database is pending connection
  const featuredMovie = {
    title: "Dune: Part Two",
    description: "Paul Atreides unites with Chani and the Fremen while on a warpath of revenge against the conspirators who destroyed his family.",
    backdrop_url: "https://image.tmdb.org/t/p/original/1XDDXPXGiI8id7MrUxK36ke7wow.jpg",
    genres: ["Science Fiction", "Adventure"]
  };

  const trendingMovies = [
    { id: 1, title: "Oppenheimer", poster: "https://image.tmdb.org/t/p/w500/8Gxv8gSFCU0XGDykEGv7zR1n2ua.jpg" },
    { id: 2, title: "Interstellar", poster: "https://image.tmdb.org/t/p/w500/rAiYTfKGqDCRIIqo664sY9XZIvQ.jpg" },
    { id: 3, title: "Inception", poster: "https://image.tmdb.org/t/p/w500/oYuLEt3zVCKq57qu2F8dT7NIa6f.jpg" },
    { id: 4, title: "The Dark Knight", poster: "https://image.tmdb.org/t/p/w500/qJ2tW6WMUDux911r6m7haRef0WH.jpg" },
    { id: 5, title: "Blade Runner 2049", poster: "https://image.tmdb.org/t/p/w500/gajva2L0rPYkEWjzgFlBXCAVBE5.jpg" },
  ];

  return (
    <main className={styles.main}>
      {/* Hero Section */}
      <section className={styles.hero}>
        <div className={styles.heroBackground}>
          <HeroVideo />
        </div>
        
        <div className={styles.heroContent}>
          <div className={`animate-fade-in ${styles.heroInfo}`}>
            <h1 className={styles.title}>{featuredMovie.title}</h1>
            <div className={styles.meta}>
              <span className={styles.match}>98% Match</span>
              <span>2024</span>
              <span className={styles.rating}>PG-13</span>
              <span>2h 46m</span>
            </div>
            <p className={styles.description}>{featuredMovie.description}</p>
            
            <div className={styles.genres}>
              {featuredMovie.genres.map(g => <span key={g}>{g}</span>)}
            </div>

            <div className={styles.actions}>
              <button className={`btn-primary ${styles.playBtn}`}>
                <Play fill="currentColor" size={20} />
                Play Now
              </button>
              <button className={styles.infoBtn}>
                <Info size={20} />
                More Info
              </button>
            </div>
          </div>
        </div>
      </section>

      {/* Rows Section */}
      <section className={styles.rowsContainer}>
        <div className={styles.row}>
          <h2 className={styles.rowTitle}>Trending Now</h2>
          <div className={styles.cardsScroll}>
            {trendingMovies.map((movie) => (
              <div key={movie.id} className={styles.card}>
                <img src={movie.poster} alt={movie.title} className={styles.poster} />
              </div>
            ))}
          </div>
        </div>
      </section>
    </main>
  );
}
