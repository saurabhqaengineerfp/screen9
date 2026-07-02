import { createClient } from '@/utils/supabase/server';
import styles from './movies.module.css';
import MoviesClient from './MoviesClient';

export const dynamic = 'force-dynamic';

export default async function MoviesPage() {
  const supabase = await createClient();
  const { data: movies } = await supabase.from('movies').select('*').order('created_at', { ascending: false });

  return (
    <main className={styles.container}>
      <MoviesClient initialMovies={movies || []} />
    </main>
  );
}
