"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import styles from "./movies.module.css";
import MoreInfoModal from "@/components/MoreInfoModal";
import CustomSelect from "@/components/CustomSelect";
import { getWatchMode } from "@/utils/movieHelpers";

function normalizeValue(val?: string | null): string {
  return (val || "").trim();
}

export default function MoviesClient({ initialMovies }: { initialMovies: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const currentMode = searchParams.get("mode") || "";
  const currentGenre = searchParams.get("genre") || searchParams.get("category") || "";
  const currentCountry = searchParams.get("country") || "";
  const currentPeriod = searchParams.get("period") || "";
  const currentTag = searchParams.get("tag") || "";

  const matchesFilters = (
    m: any,
    filters: { mode: string; country: string; genre: string; period: string; tag: string }
  ) => {
    const mode = getWatchMode(m);
    if (filters.mode === "free" && mode !== "embed" && mode !== "native") return false;
    if (filters.mode === "ott" && mode !== "ott") return false;

    if (filters.country) {
      if (normalizeValue(m.country).toLowerCase() !== filters.country.toLowerCase()) return false;
    }

    if (filters.genre) {
      const movieGenres =
        Array.isArray(m.genres) && m.genres.length > 0 ? m.genres : m.category ? [m.category] : [];
      const match = movieGenres.some(
        (g: string) => normalizeValue(g).toLowerCase() === filters.genre.toLowerCase()
      );
      if (!match && normalizeValue(m.category).toLowerCase() !== filters.genre.toLowerCase()) {
        return false;
      }
    }

    if (filters.period) {
      const effectivePeriod =
        normalizeValue(m.period) || (m.release_year ? `${Math.floor(m.release_year / 10) * 10}s` : "");
      if (effectivePeriod.toLowerCase() !== filters.period.toLowerCase()) return false;
    }

    if (filters.tag) {
      const match = (m.tags || []).some(
        (t: string) => normalizeValue(t).toLowerCase() === filters.tag.toLowerCase()
      );
      if (!match) return false;
    }

    return true;
  };

  // Faceted counts: each dropdown reflects movies matching all OTHER active filters
  const countryOptions = useMemo(() => {
    const counts = new Map<string, number>();
    initialMovies
      .filter((m) =>
        matchesFilters(m, {
          mode: currentMode,
          country: "",
          genre: currentGenre,
          period: currentPeriod,
          tag: currentTag,
        })
      )
      .forEach((m) => {
        const c = normalizeValue(m.country);
        if (c) counts.set(c, (counts.get(c) || 0) + 1);
      });
    if (currentCountry && !counts.has(currentCountry)) counts.set(currentCountry, 0);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ value: name, label: `${name} (${count})` }));
  }, [initialMovies, currentMode, currentCountry, currentGenre, currentPeriod, currentTag]);

  const genreOptions = useMemo(() => {
    const counts = new Map<string, number>();
    initialMovies
      .filter((m) =>
        matchesFilters(m, {
          mode: currentMode,
          country: currentCountry,
          genre: "",
          period: currentPeriod,
          tag: currentTag,
        })
      )
      .forEach((m) => {
        const movieGenres =
          Array.isArray(m.genres) && m.genres.length > 0 ? m.genres : m.category ? [m.category] : [];
        const unique = new Set<string>(movieGenres.map((g: string) => normalizeValue(g)).filter(Boolean));
        unique.forEach((clean) => counts.set(clean, (counts.get(clean) || 0) + 1));
      });
    if (currentGenre && !counts.has(currentGenre)) counts.set(currentGenre, 0);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ value: name, label: `${name} (${count})` }));
  }, [initialMovies, currentMode, currentCountry, currentGenre, currentPeriod, currentTag]);

  const periodOptions = useMemo(() => {
    const counts = new Map<string, number>();
    initialMovies
      .filter((m) =>
        matchesFilters(m, {
          mode: currentMode,
          country: currentCountry,
          genre: currentGenre,
          period: "",
          tag: currentTag,
        })
      )
      .forEach((m) => {
        const p = normalizeValue(m.period) || (m.release_year ? `${Math.floor(m.release_year / 10) * 10}s` : "");
        if (p) counts.set(p, (counts.get(p) || 0) + 1);
      });
    if (currentPeriod && !counts.has(currentPeriod)) counts.set(currentPeriod, 0);
    return Array.from(counts.entries())
      .sort((a, b) => b[0].localeCompare(a[0]))
      .map(([name, count]) => ({ value: name, label: `${name} (${count})` }));
  }, [initialMovies, currentMode, currentCountry, currentGenre, currentPeriod, currentTag]);

  const tagOptions = useMemo(() => {
    const counts = new Map<string, number>();
    initialMovies
      .filter((m) =>
        matchesFilters(m, {
          mode: currentMode,
          country: currentCountry,
          genre: currentGenre,
          period: currentPeriod,
          tag: "",
        })
      )
      .forEach((m) => {
        const unique = new Set<string>((m.tags || []).map((t: string) => normalizeValue(t)).filter(Boolean));
        unique.forEach((clean) => counts.set(clean, (counts.get(clean) || 0) + 1));
      });
    if (currentTag && !counts.has(currentTag)) counts.set(currentTag, 0);
    return Array.from(counts.entries())
      .sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0]))
      .map(([name, count]) => ({ value: name, label: `${name} (${count})` }));
  }, [initialMovies, currentMode, currentCountry, currentGenre, currentPeriod, currentTag]);

  const filteredMovies = useMemo(() => {
    return initialMovies.filter((m) =>
      matchesFilters(m, {
        mode: currentMode,
        country: currentCountry,
        genre: currentGenre,
        period: currentPeriod,
        tag: currentTag,
      })
    );
  }, [initialMovies, currentMode, currentGenre, currentCountry, currentPeriod, currentTag]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (key === "genre") params.delete("category");
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.push(qs ? `/movies?${qs}` : "/movies");
  };

  const hasFilters = Boolean(
    currentMode || currentGenre || currentCountry || currentPeriod || currentTag
  );

  return (
    <div className={styles.browseLayout}>
      <aside className={styles.filterSidebar}>
        <div className={styles.filterHeader}>
          <SlidersHorizontal size={14} />
          <span>FILTERS</span>
        </div>

        <div className={styles.filterGroup}>
          <label>Availability</label>
          <div className={styles.modeToggle}>
            <button
              type="button"
              onClick={() => updateFilter("mode", "")}
              className={`${styles.modeBtn} ${currentMode === "" ? styles.modeActive : ""}`}
            >
              All
            </button>
            <button
              type="button"
              onClick={() => updateFilter("mode", "free")}
              className={`${styles.modeBtn} ${currentMode === "free" ? styles.modeActive : ""}`}
            >
              ● Free
            </button>
            <button
              type="button"
              onClick={() => updateFilter("mode", "ott")}
              className={`${styles.modeBtn} ${currentMode === "ott" ? styles.modeActive : ""}`}
            >
              OTT
            </button>
          </div>
        </div>

        <div className={styles.filterGroup}>
          <label>Country</label>
          <CustomSelect
            value={currentCountry}
            onChange={(val) => updateFilter("country", val)}
            options={[{ value: "", label: "All Countries" }, ...countryOptions]}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Genre</label>
          <CustomSelect
            value={currentGenre}
            onChange={(val) => updateFilter("genre", val)}
            options={[{ value: "", label: "All Genres" }, ...genreOptions]}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Era</label>
          <CustomSelect
            value={currentPeriod}
            onChange={(val) => updateFilter("period", val)}
            options={[{ value: "", label: "All Eras" }, ...periodOptions]}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Language / Collection</label>
          <CustomSelect
            value={currentTag}
            onChange={(val) => updateFilter("tag", val)}
            options={[{ value: "", label: "All Languages & Tags" }, ...tagOptions]}
          />
        </div>

        {hasFilters && (
          <button
            type="button"
            className={styles.clearFiltersBtn}
            onClick={() => router.push("/movies")}
          >
            Reset Filters
          </button>
        )}
      </aside>

      <div className={styles.browseContent}>
        <div className={styles.headerArea}>
          <div className={styles.titleRow}>
            <h1 className={styles.title}>
              {currentMode === "free"
                ? "Free to Watch"
                : currentCountry
                ? `${currentCountry} Cinema`
                : currentGenre
                ? `${currentGenre} Films`
                : "Film Index"}
            </h1>
            <span className={styles.countBadge}>{filteredMovies.length} FILMS</span>
          </div>
          <p className={styles.subtitle}>
            Curated across countries, decades, genres, and languages. Click any title for curator notes, trailer, or full playback.
          </p>
        </div>

        {filteredMovies.length === 0 ? (
          <div className={styles.emptyState}>No films match your current filters.</div>
        ) : (
          <div className={styles.flatGrid}>
            {filteredMovies.map((movie) => {
              const mode = getWatchMode(movie);
              const isFree = mode === "embed" || mode === "native";
              return (
                <MoreInfoModal movie={movie} key={movie.id}>
                  <div className={styles.movieCard} role="button" tabIndex={0}>
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
                    <div className={styles.cardBadge}>
                      {isFree ? (
                        <span className={styles.badgeFree}>
                          <span className={styles.amberDot} />
                          FREE
                        </span>
                      ) : (
                        <span className={styles.badgeOtt}>OTT</span>
                      )}
                    </div>
                    <div className={styles.movieOverlay}>
                      <h3>{movie.title}</h3>
                      <div className={styles.movieMeta}>
                        <span>{movie.release_year || "—"}</span>
                        {movie.country && <span>{movie.country}</span>}
                      </div>
                    </div>
                  </div>
                </MoreInfoModal>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
