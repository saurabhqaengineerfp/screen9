"use client";

import { useMemo } from "react";
import Image from "next/image";
import { useRouter, useSearchParams } from "next/navigation";
import { SlidersHorizontal } from "lucide-react";
import styles from "./movies.module.css";
import MoreInfoModal from "@/components/MoreInfoModal";
import CustomSelect from "@/components/CustomSelect";
import { getWatchMode } from "@/utils/movieHelpers";

export default function MoviesClient({ initialMovies }: { initialMovies: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();

  const categories = useMemo(
    () => Array.from(new Set(initialMovies.map((m) => m.category).filter(Boolean))).sort(),
    [initialMovies]
  );
  const countries = useMemo(
    () => Array.from(new Set(initialMovies.map((m) => m.country).filter(Boolean))).sort(),
    [initialMovies]
  );
  const periods = useMemo(
    () => Array.from(new Set(initialMovies.map((m) => m.period).filter(Boolean))).sort(),
    [initialMovies]
  );
  const tags = useMemo(() => {
    const allTags = initialMovies.flatMap((m) => m.tags || []);
    return Array.from(new Set(allTags)).sort();
  }, [initialMovies]);

  const currentMode = searchParams.get("mode") || "";
  const currentCategory = searchParams.get("category") || "";
  const currentCountry = searchParams.get("country") || "";
  const currentPeriod = searchParams.get("period") || "";
  const currentTag = searchParams.get("tag") || "";

  const filteredMovies = useMemo(() => {
    return initialMovies.filter((m) => {
      const mode = getWatchMode(m);
      if (currentMode === "free" && mode !== "embed" && mode !== "native") return false;
      if (currentMode === "ott" && mode !== "ott") return false;
      if (currentCategory && m.category !== currentCategory) return false;
      if (currentCountry && m.country !== currentCountry) return false;
      if (currentPeriod && m.period !== currentPeriod) return false;
      if (currentTag && !(m.tags || []).includes(currentTag)) return false;
      return true;
    });
  }, [initialMovies, currentMode, currentCategory, currentCountry, currentPeriod, currentTag]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    const qs = params.toString();
    router.push(qs ? `/movies?${qs}` : "/movies");
  };

  const hasFilters = Boolean(
    currentMode || currentCategory || currentCountry || currentPeriod || currentTag
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
            options={[
              { value: "", label: "All Countries" },
              ...countries.map((c) => ({ value: c as string, label: c as string })),
            ]}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Era</label>
          <CustomSelect
            value={currentPeriod}
            onChange={(val) => updateFilter("period", val)}
            options={[
              { value: "", label: "All Eras" },
              ...periods.map((p) => ({ value: p as string, label: p as string })),
            ]}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Category</label>
          <CustomSelect
            value={currentCategory}
            onChange={(val) => updateFilter("category", val)}
            options={[
              { value: "", label: "All Categories" },
              ...categories.map((c) => ({ value: c as string, label: c as string })),
            ]}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Tag / Collection</label>
          <CustomSelect
            value={currentTag}
            onChange={(val) => updateFilter("tag", val)}
            options={[
              { value: "", label: "All Tags" },
              ...tags.map((t) => ({ value: t as string, label: t as string })),
            ]}
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
                : "Film Index"}
            </h1>
            <span className={styles.countBadge}>{filteredMovies.length} FILMS</span>
          </div>
          <p className={styles.subtitle}>
            Curated across countries, decades, and languages. Click any title for curator notes, trailer, or full playback.
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
