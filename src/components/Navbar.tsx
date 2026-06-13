import Link from 'next/link';
import { Film } from 'lucide-react';
import styles from './Navbar.module.css';
import { createClient } from '@/utils/supabase/server';

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  return (
    <nav className={styles.navbar}>
      <Link href="/" className={styles.brand}>
        <Film size={28} color="#6d28d9" />
        Screen<span>9</span>
      </Link>
      
      <div className={styles.navLinks}>
        <Link href="/" className={styles.link}>Home</Link>
        <Link href="/movies" className={styles.link}>Movies</Link>
        {user && <Link href="/watchlist" className={styles.link}>My List</Link>}
      </div>

      <div className={styles.actions}>
        {user ? (
          <form action="/auth/signout" method="post">
            <button type="submit" className={styles.loginBtn}>Sign Out</button>
          </form>
        ) : (
          <Link href="/login" className={styles.loginBtn}>Sign In</Link>
        )}
      </div>
    </nav>
  );
}
