import { createClient } from '@/utils/supabase/server';
import styles from './movies.module.css';
import Image from 'next/image';
import Link from 'next/link';

export const dynamic = 'force-dynamic';

export default async function MoviesPage() {
  const supabase = await createClient();
  const { data: movies } = await supabase.from('movies').select('*').order('created_at', { ascending: false });

  // Group movies by category
  const categories: Record<string, any[]> = {};
  if (movies) {
    movies.forEach(movie => {
      const cat = movie.category || 'Trending';
      if (!categories[cat]) categories[cat] = [];
      categories[cat].push(movie);
    });
  }

  return (
    <main className={styles.container}>
      <h1 className={styles.title}>All Movies</h1>
      
      {Object.keys(categories).length === 0 && (
        <p className={styles.emptyState}>No movies added yet. Go to /admin to add your first movie!</p>
      )}

      {Object.entries(categories).map(([categoryName, catMovies]) => (
        <div key={categoryName} className={styles.categoryRow}>
          <h2 className={styles.categoryTitle}>{categoryName}</h2>
          <div className={styles.movieGrid}>
            {catMovies.map((movie) => (
              <Link href={`/watch/${movie.id}`} key={movie.id} className={styles.movieCard}>
                {movie.poster_url ? (
                  <Image 
                    src={movie.poster_url} 
                    alt={movie.title} 
                    fill
                    className={styles.moviePoster}
                    unoptimized
                  />
                ) : (
                  <div className={styles.moviePlaceholder}>{movie.title}</div>
                )}
                <div className={styles.movieOverlay}>
                  <h3>{movie.title}</h3>
                </div>
              </Link>
            ))}
          </div>
        </div>
      ))}
    </main>
  );
}
