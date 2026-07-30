import Link from 'next/link';
import { Film } from 'lucide-react';
import styles from './Navbar.module.css';
import { createClient } from '@/utils/supabase/server';
import CategoriesDropdown from './CategoriesDropdown';
import SearchBar from './SearchBar';
import NavbarScroll from './NavbarScroll';

export default async function Navbar() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  const { data: allCategories } = await supabase.from('categories').select('id, name').order('name');
  
  // Get categories in use
  const { data: moviesCategories } = await supabase.from('movies').select('category');
  const usedCategoryNames = new Set((moviesCategories || []).map(m => m.category).filter(Boolean));
  
  const categories = (allCategories || []).filter(c => usedCategoryNames.has(c.name));

  return (
    <>
    <NavbarScroll />
    <nav id="main-navbar" className={styles.navbar}>
      <Link href="/" className={styles.brand}>
        <Film size={28} color="#6d28d9" />
        <div>Screen<span>9</span></div>
      </Link>
      
      <div className={styles.navLinks}>
        <Link href="/" className={styles.link}>Home</Link>
        <Link href="/movies" className={styles.link}>Movies</Link>
        <CategoriesDropdown categories={categories || []} />
        {user && <Link href="/watchlist" className={styles.link}>My List</Link>}
      </div>

      <div className={styles.actions}>
        <SearchBar />
        {user ? (
          <form action="/auth/signout" method="post">
            <button type="submit" className={styles.loginBtn}>Sign Out</button>
          </form>
        ) : (
          <Link href="/login" className={styles.loginBtn}>Sign In</Link>
        )}
      </div>
    </nav>
    </>
  );
}
