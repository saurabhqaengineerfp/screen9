import Link from "next/link";
import styles from "./Navbar.module.css";
import { createClient } from "@/utils/supabase/server";
import CategoriesDropdown from "./CategoriesDropdown";
import SearchBar from "./SearchBar";

export default async function Navbar() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  const { data: allCategories } = await supabase.from("categories").select("id, name").order("name");

  const { data: moviesCategories } = await supabase.from("movies").select("category");
  const usedCategoryNames = new Set((moviesCategories || []).map((m) => m.category).filter(Boolean));

  const categories = (allCategories || []).filter((c) => usedCategoryNames.has(c.name));

  return (
    <header className={styles.navbar}>
      <div className={styles.navInner}>
        <div className={styles.leftGroup}>
          <Link href="/" className={styles.brand} aria-label="Screen9 Home">
            <span className={styles.brandDot} aria-hidden="true" />
            <span className={styles.brandWord}>
              SCREEN<span className={styles.brandAccent}>9</span>
            </span>
          </Link>

          <nav className={styles.navLinks} aria-label="Primary">
            <Link href="/" className={styles.link}>
              Home
            </Link>
            <Link href="/movies" className={styles.link}>
              Index
            </Link>
            <Link href="/movies?mode=free" className={styles.link}>
              Free
            </Link>
            <CategoriesDropdown categories={categories || []} />
            {user && (
              <Link href="/watchlist" className={styles.link}>
                Watchlist
              </Link>
            )}
          </nav>
        </div>

        <div className={styles.actions}>
          <SearchBar />
          {user ? (
            <form action="/auth/signout" method="post">
              <button type="submit" className={styles.loginBtn}>
                Sign Out
              </button>
            </form>
          ) : (
            <Link href="/login" className={styles.loginBtn}>
              Sign In
            </Link>
          )}
        </div>
      </div>
    </header>
  );
}
