"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import { searchMovies } from "@/app/actions/search";
import styles from "./SearchBar.module.css";
import Image from "next/image";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    function handleClickOutside(event: MouseEvent) {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target as Node)) {
        setIsFocused(false);
      }
    }
    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Debounced search effect
  useEffect(() => {
    if (!query.trim()) {
      setResults([]);
      setLoading(false);
      return;
    }

    setLoading(true);
    const delayDebounceFn = setTimeout(async () => {
      try {
        const data = await searchMovies(query);
        setResults(data);
      } catch (err) {
        console.error(err);
      } finally {
        setLoading(false);
      }
    }, 300); // 300ms debounce

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className={styles.searchContainer} ref={dropdownRef}>
      <div className={`${styles.inputWrapper} ${isFocused ? styles.focused : ''}`}>
        <Search size={18} className={styles.searchIcon} />
        <input
          type="text"
          placeholder="Search movies..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className={styles.searchInput}
        />
      </div>

      {isFocused && query.trim() !== "" && (
        <div className={styles.dropdown}>
          {loading ? (
            <div className={styles.message}>Searching...</div>
          ) : results.length > 0 ? (
            <div className={styles.resultsList}>
              {results.map((movie) => (
                <Link
                  key={movie.id}
                  href={`/watch/${movie.id}`}
                  className={styles.resultItem}
                  onClick={() => setIsFocused(false)}
                >
                  <div className={styles.posterWrapper}>
                    {movie.poster_url ? (
                      <Image 
                        src={movie.poster_url} 
                        alt={movie.title} 
                        fill 
                        style={{ objectFit: 'cover' }}
                      />
                    ) : (
                      <div className={styles.placeholderPoster} />
                    )}
                  </div>
                  <div className={styles.movieInfo}>
                    <span className={styles.movieTitle}>{movie.title}</span>
                    <span className={styles.movieYear}>{movie.release_year}</span>
                  </div>
                </Link>
              ))}
            </div>
          ) : (
            <div className={styles.message}>No movies found.</div>
          )}
        </div>
      )}
    </div>
  );
}
