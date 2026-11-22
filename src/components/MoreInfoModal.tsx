"use client";

import { useEffect, useId, useRef, useState } from "react";
import Image from "next/image";
import Link from "next/link";
import { Play, Info, X, ExternalLink } from "lucide-react";
import styles from "./MoreInfoModal.module.css";
import {
  formatRuntime,
  getRegionProviders,
  getTmdbWatchUrl,
  getWatchMode,
  SUPPORTED_REGIONS,
} from "@/utils/movieHelpers";

export default function MoreInfoModal({
  movie,
  children,
}: {
  movie: any;
  children?: React.ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [region, setRegion] = useState<string>("US");
  const titleId = useId();

  const openModal = (e: React.MouseEvent | React.KeyboardEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const dialog = dialogRef.current;
    if (dialog && !dialog.open) {
      dialog.showModal();
    }
  };

  const closeModal = () => {
    dialogRef.current?.close();
  };

  // Light-dismiss fallback for browsers without native <dialog closedby="any"> (e.g., Safari)
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (typeof HTMLDialogElement !== "undefined" && "closedBy" in HTMLDialogElement.prototype) {
      return;
    }

    const isOutside = (e: PointerEvent) => {
      const r = dialog.getBoundingClientRect();
      return e.clientX < r.left || e.clientX > r.right || e.clientY < r.top || e.clientY > r.bottom;
    };

    let pressedOutside = false;
    const onPointerDown = (e: PointerEvent) => {
      pressedOutside = isOutside(e);
    };
    const onPointerUp = (e: PointerEvent) => {
      if (pressedOutside && isOutside(e)) {
        dialog.close();
      }
      pressedOutside = false;
    };

    dialog.addEventListener("pointerdown", onPointerDown);
    dialog.addEventListener("pointerup", onPointerUp);
    return () => {
      dialog.removeEventListener("pointerdown", onPointerDown);
      dialog.removeEventListener("pointerup", onPointerUp);
    };
  }, []);

  const mode = getWatchMode(movie);
  const isFree = mode === "embed" || mode === "native";
  const runtime = formatRuntime(movie);
  const { data: regionProviders } = getRegionProviders(movie.watch_providers, region);
  const streamProviders = [
    ...(regionProviders?.flatrate || []),
    ...(regionProviders?.free || []),
    ...(regionProviders?.ads || []),
  ];
  const rentBuyProviders = [...(regionProviders?.rent || []), ...(regionProviders?.buy || [])].filter(
    (p, idx, arr) => arr.findIndex((x) => x.provider_id === p.provider_id) === idx
  );
  const watchExternalUrl = regionProviders?.link || getTmdbWatchUrl(movie);

  return (
    <>
      {children ? (
        <div
          onClick={openModal}
          onKeyDown={(e) => {
            if (e.key === "Enter" || e.key === " ") openModal(e);
          }}
          style={{ display: "contents" }}
        >
          {children}
        </div>
      ) : (
        <button type="button" className="btn-secondary" onClick={openModal}>
          <Info size={16} />
          Details
        </button>
      )}

      <dialog
        ref={dialogRef}
        className={styles.dialog}
        aria-labelledby={titleId}
        {...({ closedby: "any" } as any)}
      >
        <div className={styles.modalContent}>
          <button
            type="button"
            className={styles.closeBtn}
            onClick={closeModal}
            aria-label="Close film details"
          >
            <X size={18} />
          </button>

          <div className={styles.modalHeader}>
            {(movie.backdrop_url || movie.poster_url) && (
              <div className={styles.backdropWrapper}>
                <Image
                  src={movie.backdrop_url || movie.poster_url}
                  alt={movie.title}
                  fill
                  style={{ objectFit: "cover" }}
                  unoptimized
                />
                <div className={styles.backdropFade} />
              </div>
            )}

            <div className={styles.headerContent}>
              <div className={styles.headerMeta}>
                {isFree ? (
                  <span className={styles.freePill}>
                    <span className={styles.amberDot} />
                    FREE TO WATCH
                  </span>
                ) : (
                  <span className={styles.ottPill}>PARTNER OTT</span>
                )}
                {movie.release_year && <span>{movie.release_year}</span>}
                {runtime && <span>{runtime}</span>}
                {movie.country && <span>{String(movie.country).toUpperCase()}</span>}
              </div>

              <h2 id={titleId} className={styles.modalTitle}>
                {movie.title}
              </h2>

              <div className={styles.actions}>
                {movie.id && (
                  <Link
                    href={`/watch/${movie.id}`}
                    className="btn-primary"
                    onClick={closeModal}
                    autoFocus
                  >
                    <Play fill="currentColor" size={16} />
                    {isFree ? "Watch Full Film" : "Watch Trailer"}
                  </Link>
                )}
                {!isFree && watchExternalUrl && (
                  <a
                    href={watchExternalUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn-secondary"
                  >
                    Where to Stream <ExternalLink size={14} />
                  </a>
                )}
              </div>
            </div>
          </div>

          <div className={styles.modalBody}>
            <div className={styles.leftCol}>
              {movie.curator_note && (
                <div className={styles.curatorBox}>
                  <span className={styles.curatorLabel}>CURATOR NOTE</span>
                  <p className={styles.curatorText}>“{movie.curator_note}”</p>
                </div>
              )}

              <p className={styles.description}>{movie.description}</p>

              {/* Where to Watch (TMDB Watch Providers) */}
              {!isFree && (
                <div className={styles.providersSection}>
                  <div className={styles.providersHeader}>
                    <span className={styles.sectionLabel}>WHERE TO STREAM</span>
                    <div className={styles.regionTabs} role="tablist" aria-label="Region">
                      {SUPPORTED_REGIONS.map((r) => (
                        <button
                          key={r.code}
                          type="button"
                          onClick={() => setRegion(r.code)}
                          className={`${styles.regionBtn} ${region === r.code ? styles.regionActive : ""}`}
                        >
                          {r.label}
                        </button>
                      ))}
                    </div>
                  </div>

                  {streamProviders.length > 0 ? (
                    <div className={styles.providerGrid}>
                      {streamProviders.map((p) => (
                        <a
                          key={p.provider_id}
                          href={watchExternalUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.providerChip}
                        >
                          {p.logo_path && (
                            <Image
                              src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                              alt={p.provider_name}
                              width={20}
                              height={20}
                              unoptimized
                              className={styles.providerLogo}
                            />
                          )}
                          <span>{p.provider_name}</span>
                        </a>
                      ))}
                    </div>
                  ) : rentBuyProviders.length > 0 ? (
                    <div className={styles.providerGrid}>
                      {rentBuyProviders.slice(0, 6).map((p) => (
                        <a
                          key={p.provider_id}
                          href={watchExternalUrl || "#"}
                          target="_blank"
                          rel="noopener noreferrer"
                          className={styles.providerChip}
                        >
                          {p.logo_path && (
                            <Image
                              src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                              alt={p.provider_name}
                              width={20}
                              height={20}
                              unoptimized
                              className={styles.providerLogo}
                            />
                          )}
                          <span>{p.provider_name} (Rent/Buy)</span>
                        </a>
                      ))}
                    </div>
                  ) : (
                    <p className={styles.noProviders}>
                      No direct subscription listing cached for {region}.{" "}
                      {watchExternalUrl && (
                        <a href={watchExternalUrl} target="_blank" rel="noopener noreferrer">
                          Check TMDB availability ↗
                        </a>
                      )}
                    </p>
                  )}
                </div>
              )}
            </div>

            <div className={styles.rightCol}>
              {movie.director && (
                <div className={styles.creditBlock}>
                  <span className={styles.creditLabel}>DIRECTOR</span>
                  <span className={styles.creditValue}>{movie.director}</span>
                </div>
              )}
              {movie.cast_members && movie.cast_members.length > 0 && (
                <div className={styles.creditBlock}>
                  <span className={styles.creditLabel}>CAST</span>
                  <span className={styles.creditValue}>{movie.cast_members.join(", ")}</span>
                </div>
              )}
              {movie.genres && movie.genres.length > 0 && (
                <div className={styles.creditBlock}>
                  <span className={styles.creditLabel}>GENRES</span>
                  <span className={styles.creditValue}>{movie.genres.join(" · ")}</span>
                </div>
              )}
              {movie.period && (
                <div className={styles.creditBlock}>
                  <span className={styles.creditLabel}>ERA</span>
                  <span className={styles.creditValue}>{movie.period}</span>
                </div>
              )}
              {movie.source_channel && (
                <div className={styles.creditBlock}>
                  <span className={styles.creditLabel}>OFFICIAL SOURCE</span>
                  <span className={styles.creditValue}>{movie.source_channel}</span>
                </div>
              )}
            </div>
          </div>
        </div>
      </dialog>
    </>
  );
}
