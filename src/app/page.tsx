import Image from "next/image";
import Link from "next/link";
import { Play, ArrowUpRight } from "lucide-react";
import styles from "./page.module.css";
import HeroVideo from "@/components/HeroVideo";
import MoreInfoModal from "@/components/MoreInfoModal";
import { createClient } from "@/utils/supabase/server";
import { formatRuntime, getWatchMode } from "@/utils/movieHelpers";

export const dynamic = "force-dynamic";

export default async function Home() {
  const supabase = await createClient();

  const { data: dbMovies } = await supabase
    .from("movies")
    .select("*")
    .order("created_at", { ascending: false });

  const allMovies = dbMovies || [];

  const heroPool = allMovies.filter((m) => m.trailer_url || m.backdrop_url);
  const randomPool = heroPool.length > 0 ? heroPool : allMovies;

  const heroMovie =
    randomPool.length > 0
      ? randomPool[Math.floor(Math.random() * randomPool.length)]
      : {
          title: "Curated World Cinema",
          description:
            "Every film here is handpicked across countries, eras, and languages. Zero algorithmic filler.",
          video_url: null,
          watch_mode: "ott",
          genres: ["World Cinema", "Curated"],
          release_year: 2026,
          country: "Global",
          duration: 7200,
        };

  const heroMode = getWatchMode(heroMovie);
  const heroRuntime = formatRuntime(heroMovie);

  // Free to watch directly on Screen9 (official embeds / native)
  const freeToWatch = allMovies.filter((m) => {
    const mode = getWatchMode(m);
    return mode === "embed" || mode === "native";
  });

  // Extract unique countries for quick world cinema pills
  const countries = Array.from(new Set(allMovies.map((m) => m.country).filter(Boolean))).slice(0, 10);

  // Dynamically extract top curated tags
  const tagCounts: Record<string, number> = {};
  allMovies.forEach((movie) => {
    (movie.tags || []).forEach((tag: string) => {
      tagCounts[tag] = (tagCounts[tag] || 0) + 1;
    });
  });

  const topTags = Object.entries(tagCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map((t) => t[0]);

  const renderCard = (movie: any) => {
    const mode = getWatchMode(movie);
    const isFree = mode === "embed" || mode === "native";
    return (
      <MoreInfoModal movie={movie} key={movie.id}>
        <div className={styles.card} role="button" tabIndex={0}>
          {movie.poster_url ? (
            <Image
              src={movie.poster_url}
              alt={movie.title}
              className={styles.poster}
              fill
              unoptimized
              style={{ objectFit: "cover" }}
            />
          ) : (
            <div className={styles.posterFallback}>{movie.title}</div>
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
          <div className={styles.cardFooter}>
            <span className={styles.cardTitle}>{movie.title}</span>
            <span className={styles.cardSub}>
              {movie.release_year || "—"}
              {movie.country ? ` · ${movie.country}` : ""}
            </span>
          </div>
        </div>
      </MoreInfoModal>
    );
  };

  let sectionIndex = 1;
  const fmtIdx = () => String(sectionIndex++).padStart(2, "0");

  return (
    <main className={styles.main}>
      {/* Apple TV+ Full-Bleed Editorial Hero */}
      <section className={styles.hero}>
        <HeroVideo movie={heroMovie} />

        <div className={styles.heroInner}>
          <div className={`animate-fade-in ${styles.heroContent}`}>
            <div className={styles.heroEyebrow}>
              {heroMode === "embed" || heroMode === "native" ? (
                <span className={styles.eyebrowFree}>
                  <span className={styles.amberDot} />
                  FREE TO WATCH ON SCREEN9
                </span>
              ) : (
                <span className={styles.eyebrowOtt}>CURATED FEATURE · PARTNER OTT</span>
              )}
              {heroMovie.country && (
                <>
                  <span className={styles.eyebrowSep}>/</span>
                  <span>{String(heroMovie.country).toUpperCase()}</span>
                </>
              )}
            </div>

            <h1 className={styles.title}>{heroMovie.title}</h1>

            <div className={styles.meta}>
              {heroMovie.release_year && <span>{heroMovie.release_year}</span>}
              {heroRuntime && <span>{heroRuntime}</span>}
              {heroMovie.director && <span>DIR. {heroMovie.director.toUpperCase()}</span>}
              {heroMovie.genres?.slice(0, 2).map((g: string) => (
                <span key={g} className={styles.metaChip}>
                  {g.toUpperCase()}
                </span>
              ))}
            </div>

            {heroMovie.curator_note ? (
              <p className={styles.curatorQuote}>“{heroMovie.curator_note}”</p>
            ) : (
              <p className={styles.description}>{heroMovie.description}</p>
            )}

            <div className={styles.actions}>
              {heroMovie.id && (
                <Link href={`/watch/${heroMovie.id}`} className={`btn-primary ${styles.playBtn}`}>
                  <Play fill="currentColor" size={16} />
                  {heroMode === "embed" || heroMode === "native" ? "Watch Full Film" : "Trailer & Streaming"}
                </Link>
              )}
              <MoreInfoModal movie={heroMovie} />
            </div>
          </div>
        </div>
      </section>

      {/* Editorial Index Strip (skills.sh precision) */}
      <section className={styles.rowsContainer}>
        {countries.length > 0 && (
          <div className={styles.worldStrip}>
            <span className={styles.worldLabel}>WORLD CINEMA</span>
            <div className={styles.worldPills}>
              <Link href="/movies" className={styles.worldPill}>
                All ({allMovies.length})
              </Link>
              {countries.map((country) => (
                <Link
                  key={country}
                  href={`/movies?country=${encodeURIComponent(country as string)}`}
                  className={styles.worldPill}
                >
                  {country}
                </Link>
              ))}
            </div>
          </div>
        )}

        {/* Rail 1: Free to Watch Directly */}
        {freeToWatch.length > 0 && (
          <div className={styles.row}>
            <div className={styles.rowHeader}>
              <div className={styles.rowTitleGroup}>
                <span className={styles.rowIndex}>{fmtIdx()}</span>
                <h2 className={styles.rowTitle}>Free to Watch Now</h2>
                <span className={styles.rowCount}>{freeToWatch.length}</span>
              </div>
              <Link href="/movies?mode=free" className={styles.rowLink}>
                View all <ArrowUpRight size={14} />
              </Link>
            </div>
            <div className={styles.cardsScroll}>{freeToWatch.map(renderCard)}</div>
          </div>
        )}

        {/* Rail 2: Recently Curated */}
        <div className={styles.row}>
          <div className={styles.rowHeader}>
            <div className={styles.rowTitleGroup}>
              <span className={styles.rowIndex}>{fmtIdx()}</span>
              <h2 className={styles.rowTitle}>Recently Curated</h2>
              <span className={styles.rowCount}>{allMovies.length}</span>
            </div>
            <Link href="/movies" className={styles.rowLink}>
              Browse index <ArrowUpRight size={14} />
            </Link>
          </div>
          {allMovies.length === 0 ? (
            <div className={styles.emptyRail}>
              No films curated yet. Add your first film in <Link href="/admin">/admin</Link>.
            </div>
          ) : (
            <div className={styles.cardsScroll}>{allMovies.slice(0, 18).map(renderCard)}</div>
          )}
        </div>

        {/* Dynamic Curated Tag Rails */}
        {topTags.map((tag) => {
          const tagMovies = allMovies.filter((m) => (m.tags || []).includes(tag));
          if (tagMovies.length < 2) return null;
          return (
            <div className={styles.row} key={tag}>
              <div className={styles.rowHeader}>
                <div className={styles.rowTitleGroup}>
                  <span className={styles.rowIndex}>{fmtIdx()}</span>
                  <h2 className={styles.rowTitle}>{tag}</h2>
                  <span className={styles.rowCount}>{tagMovies.length}</span>
                </div>
                <Link href={`/movies?tag=${encodeURIComponent(tag)}`} className={styles.rowLink}>
                  Explore <ArrowUpRight size={14} />
                </Link>
              </div>
              <div className={styles.cardsScroll}>{tagMovies.map(renderCard)}</div>
            </div>
          );
        })}
      </section>
    </main>
  );
}
