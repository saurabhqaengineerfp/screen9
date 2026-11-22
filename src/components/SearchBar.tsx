"use client";

import { useState, useEffect, useRef } from "react";
import { Search } from "lucide-react";
import Link from "next/link";
import { searchMovies } from "@/app/actions/search";
import styles from "./SearchBar.module.css";
import Image from "next/image";
import { getWatchMode } from "@/utils/movieHelpers";

export default function SearchBar() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<any[]>([]);
  const [isFocused, setIsFocused] = useState(false);
  const [loading, setLoading] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);

  // Cmd+K / Ctrl+K shortcut (skills.sh style)
  useEffect(() => {
    function handleKeyDown(e: KeyboardEvent) {
      if ((e.metaKey || e.ctrlKey) && e.key.toLowerCase() === "k") {
        e.preventDefault();
        inputRef.current?.focus();
        setIsFocused(true);
      } else if (e.key === "Escape" && document.activeElement === inputRef.current) {
        inputRef.current?.blur();
        setIsFocused(false);
      }
    }
    window.addEventListener("keydown", handleKeyDown);
    return () => window.removeEventListener("keydown", handleKeyDown);
  }, []);

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
    }, 250);

    return () => clearTimeout(delayDebounceFn);
  }, [query]);

  return (
    <div className={styles.searchContainer} ref={dropdownRef}>
      <div className={`${styles.inputWrapper} ${isFocused ? styles.focused : ""}`}>
        <Search size={14} className={styles.searchIcon} />
        <input
          ref={inputRef}
          type="text"
          placeholder="Search films..."
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onFocus={() => setIsFocused(true)}
          className={styles.searchInput}
          aria-label="Search curated films"
        />
        <kbd className={styles.kbd} aria-hidden="true">
          ⌘K
        </kbd>
      </div>

      {isFocused && query.trim() !== "" && (
        <div className={styles.dropdown}>
          {loading ? (
            <div className={styles.message}>SEARCHING...</div>
          ) : results.length > 0 ? (
            <div className={styles.resultsList}>
              {results.map((movie) => {
                const mode = getWatchMode(movie);
                return (
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
                          unoptimized
                          style={{ objectFit: "cover" }}
                        />
                      ) : (
                        <div className={styles.placeholderPoster} />
                      )}
                    </div>
                    <div className={styles.movieInfo}>
                      <span className={styles.movieTitle}>{movie.title}</span>
                      <span className={styles.movieMeta}>
                        {movie.release_year || "—"}
                        {mode === "embed" || mode === "native" ? (
                          <span className={styles.freeTag}>● FREE</span>
                        ) : (
                          <span className={styles.ottTag}>OTT</span>
                        )}
                      </span>
                    </div>
                  </Link>
                );
              })}
            </div>
          ) : (
            <div className={styles.message}>NO FILMS FOUND</div>
          )}
        </div>
      )}
    </div>
  );
}
