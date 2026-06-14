import Image from "next/image";
import Link from "next/link";
import { createClient } from "@/utils/supabase/server";
import styles from "./category.module.css";

export const dynamic = 'force-dynamic';

export default async function CategoryPage({ params }: { params: Promise<{ name: string }> }) {
  const { name } = await params;
  const categoryName = decodeURIComponent(name);
  
  const supabase = await createClient();
  const { data: movies } = await supabase
    .from('movies')
    .select('*')
    .eq('category', categoryName)
    .order('created_at', { ascending: false });

  return (
    <main className={styles.main}>
      <div className={styles.header}>
        <h1 className={styles.title}>{categoryName} Movies</h1>
        <p className={styles.subtitle}>
          {movies && movies.length > 0 
            ? `Found ${movies.length} movies in this category.` 
            : "No movies found in this category yet."}
        </p>
      </div>

      <div className={styles.grid}>
        {movies?.map((movie) => (
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
            <div className={styles.cardInfo}>
              <p>{movie.title}</p>
            </div>
          </Link>
        ))}
      </div>
    </main>
  );
}
