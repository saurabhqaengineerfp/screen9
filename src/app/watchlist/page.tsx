import { createClient } from '@/utils/supabase/server';
import { redirect } from 'next/navigation';
import styles from '../movies/movies.module.css';

export default async function WatchlistPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  if (!user) {
    redirect('/login');
  }

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>My List</h1>
      
      <div className={styles.grid}>
        {/* Placeholder for empty state or watchlist movies */}
        <div className={styles.placeholderCard} style={{ width: '100%', gridColumn: '1 / -1', padding: '40px' }}>
          <span style={{ fontSize: '1.2rem' }}>Your watchlist is currently empty.</span>
        </div>
      </div>
    </div>
  );
}
