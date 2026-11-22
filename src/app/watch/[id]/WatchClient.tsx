"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import {
  ArrowLeft,
  Play,
  Pause,
  FastForward,
  Rewind,
  Maximize,
  Volume2,
  VolumeX,
  ExternalLink,
} from "lucide-react";
import { useRouter, useSearchParams } from "next/navigation";
import Image from "next/image";
import styles from "./watch.module.css";
import {
  buildOfficialEmbedUrl,
  formatRuntime,
  getProviderDirectUrl,
  getRegionProviders,
  getTmdbWatchUrl,
  getWatchMode,
  SUPPORTED_REGIONS,
} from "@/utils/movieHelpers";

export default function WatchClient({ movie }: { movie: any }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const containerRef = useRef<HTMLDivElement>(null);
  const videoRef = useRef<HTMLVideoElement>(null);

  const [embedView, setEmbedView] = useState<"full" | "trailer">(
    searchParams.get("view") === "trailer" ? "trailer" : "full"
  );

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showUI, setShowUI] = useState(true);
  const [region, setRegion] = useState<string>("US");
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const mode = getWatchMode(movie);
  const runtime = formatRuntime(movie);

  const fullEmbed =
    mode === "embed"
      ? buildOfficialEmbedUrl(movie.video_url, {
          autoplay: true,
          start: movie.start_time,
          end: movie.end_time,
        })
      : null;

  const trailerEmbed = buildOfficialEmbedUrl(movie.trailer_url, { autoplay: true });

  // Auto-hide UI for native HTML5 player
  const handleMouseMove = useCallback(() => {
    setShowUI(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (playing) setShowUI(false);
    }, 3000);
  }, [playing]);

  useEffect(() => {
    if (mode === "native") {
      if (!playing) {
        setShowUI(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else {
        handleMouseMove();
      }
    }
  }, [playing, handleMouseMove, mode]);

  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setPlayed(videoRef.current.currentTime / (videoRef.current.duration || 1));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      if (movie.start_time) videoRef.current.currentTime = movie.start_time;
      setDuration(videoRef.current.duration);
      videoRef.current.play().catch(() => setPlaying(false));
    }
  };

  const togglePlay = () => {
    if (!videoRef.current) return;
    if (playing) videoRef.current.pause();
    else videoRef.current.play();
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setPlayed(parseFloat(e.target.value));
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (videoRef.current) videoRef.current.currentTime = val * duration;
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val / 100;
      videoRef.current.muted = val === 0;
      setMuted(val === 0);
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    const doc = document as any;
    if (!doc.fullscreenElement && !doc.webkitFullscreenElement) {
      if (containerRef.current?.requestFullscreen) {
        containerRef.current.requestFullscreen().catch(() => {});
      } else if ((videoRef.current as any)?.webkitEnterFullscreen) {
        (videoRef.current as any).webkitEnterFullscreen();
      }
    } else if (document.exitFullscreen) {
      document.exitFullscreen();
    }
  };

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  // MODE 1: Official YouTube / Vimeo full-movie embed (100% ToS-compliant, uncropped)
  if (mode === "embed" && fullEmbed && fullEmbed.type !== "native") {
    const hasTrailer = Boolean(trailerEmbed && trailerEmbed.type !== "native");
    const trailerAutoplayEmbed = hasTrailer
      ? buildOfficialEmbedUrl(movie.trailer_url, { autoplay: true })
      : null;
    const showingTrailer = embedView === "trailer" && Boolean(trailerAutoplayEmbed);
    const activeSrc = showingTrailer ? trailerAutoplayEmbed!.embedUrl : fullEmbed.embedUrl;

    return (
      <div className={styles.embedShell}>
        <header className={styles.cinemaBar}>
          <button type="button" onClick={() => router.back()} className={styles.backLink}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>

          <div className={styles.cinemaTitleGroup}>
            <span className={styles.amberDot} />
            <h1 className={styles.cinemaTitle}>{movie.title}</h1>
            <span className={styles.cinemaMeta}>
              {movie.release_year || ""}
              {runtime ? ` · ${runtime}` : ""}
              {movie.source_channel && !showingTrailer ? ` · ${movie.source_channel}` : ""}
            </span>
          </div>

          {hasTrailer ? (
            <div className={styles.viewToggle} role="tablist" aria-label="Playback view">
              <button
                type="button"
                role="tab"
                aria-selected={!showingTrailer}
                onClick={() => setEmbedView("full")}
                className={`${styles.viewToggleBtn} ${!showingTrailer ? styles.viewToggleActive : ""}`}
              >
                Full Film
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={showingTrailer}
                onClick={() => setEmbedView("trailer")}
                className={`${styles.viewToggleBtn} ${showingTrailer ? styles.viewToggleActive : ""}`}
              >
                Trailer
              </button>
            </div>
          ) : (
            <span className={styles.modeTag}>OFFICIAL EMBED</span>
          )}
        </header>

        {showingTrailer ? (
          <div className={styles.ottLayout}>
            <div className={styles.trailerStage}>
              <iframe
                key="trailer"
                src={activeSrc}
                title={`${movie.title} — Official Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className={styles.officialIframe}
              />
            </div>

            <aside className={styles.ottSidebar}>
              <div className={styles.providersCard}>
                <span className={styles.label}>FREE TO WATCH ON SCREEN9</span>
                <button
                  type="button"
                  onClick={() => setEmbedView("full")}
                  className={`btn-primary ${styles.tmdbWatchBtn}`}
                >
                  <Play fill="currentColor" size={14} />
                  Watch Full Film Free
                </button>
              </div>

              {movie.curator_note && (
                <div className={styles.curatorCard}>
                  <span className={styles.label}>CURATOR NOTE</span>
                  <p className={styles.curatorQuote}>“{movie.curator_note}”</p>
                </div>
              )}

              <div className={styles.synopsisCard}>
                <span className={styles.label}>SYNOPSIS</span>
                <p className={styles.synopsisText}>{movie.description}</p>
                {movie.director && (
                  <div className={styles.metaLine}>
                    <span>DIRECTOR</span>
                    <strong>{movie.director}</strong>
                  </div>
                )}
                {movie.cast_members && movie.cast_members.length > 0 && (
                  <div className={styles.metaLine}>
                    <span>CAST</span>
                    <strong>{movie.cast_members.join(", ")}</strong>
                  </div>
                )}
              </div>
            </aside>
          </div>
        ) : (
          <div className={styles.iframeStage}>
            <iframe
              key="full"
              src={activeSrc}
              title={movie.title}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
              referrerPolicy="strict-origin-when-cross-origin"
              allowFullScreen
              className={styles.officialIframe}
            />
          </div>
        )}
      </div>
    );
  }

  // MODE 2: Partner OTT film (official trailer + Where to Stream providers)
  if (mode === "ott" || !movie.video_url) {
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
      <div className={styles.ottPage}>
        <header className={styles.cinemaBar}>
          <button type="button" onClick={() => router.back()} className={styles.backLink}>
            <ArrowLeft size={16} />
            <span>Back</span>
          </button>
          <div className={styles.cinemaTitleGroup}>
            <h1 className={styles.cinemaTitle}>{movie.title}</h1>
            <span className={styles.cinemaMeta}>
              {movie.release_year || ""}
              {movie.country ? ` · ${String(movie.country).toUpperCase()}` : ""}
              {runtime ? ` · ${runtime}` : ""}
            </span>
          </div>
          <span className={styles.modeTag}>TRAILER + OTT</span>
        </header>

        <div className={styles.ottLayout}>
          <div className={styles.trailerStage}>
            {trailerEmbed && trailerEmbed.type !== "native" ? (
              <iframe
                src={trailerEmbed.embedUrl}
                title={`${movie.title} — Official Trailer`}
                allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
                referrerPolicy="strict-origin-when-cross-origin"
                allowFullScreen
                className={styles.officialIframe}
              />
            ) : movie.backdrop_url ? (
              <div className={styles.stillFallback}>
                <Image
                  src={movie.backdrop_url}
                  alt={movie.title}
                  fill
                  unoptimized
                  style={{ objectFit: "cover" }}
                />
              </div>
            ) : (
              <div className={styles.noTrailer}>NO OFFICIAL TRAILER AVAILABLE</div>
            )}
          </div>

          <aside className={styles.ottSidebar}>
            {movie.curator_note && (
              <div className={styles.curatorCard}>
                <span className={styles.label}>CURATOR NOTE</span>
                <p className={styles.curatorQuote}>“{movie.curator_note}”</p>
              </div>
            )}

            <div className={styles.providersCard}>
              <div className={styles.providersTop}>
                <span className={styles.label}>WHERE TO STREAM</span>
                <div className={styles.regionRow}>
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
                <div className={styles.providerList}>
                  {streamProviders.map((p) => (
                    <a
                      key={p.provider_id}
                      href={p.web_url || watchExternalUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.providerRow}
                    >
                      <div className={styles.providerLeft}>
                        {p.logo_path && (
                          <Image
                            src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                            alt={p.provider_name}
                            width={24}
                            height={24}
                            unoptimized
                            className={styles.providerLogo}
                          />
                        )}
                        <span>{p.provider_name}</span>
                      </div>
                      <ExternalLink size={14} className={styles.extIcon} />
                    </a>
                  ))}
                </div>
              ) : rentBuyProviders.length > 0 ? (
                <div className={styles.providerList}>
                  {rentBuyProviders.slice(0, 6).map((p) => (
                    <a
                      key={p.provider_id}
                      href={p.web_url || watchExternalUrl || "#"}
                      target="_blank"
                      rel="noopener noreferrer"
                      className={styles.providerRow}
                    >
                      <div className={styles.providerLeft}>
                        {p.logo_path && (
                          <Image
                            src={`https://image.tmdb.org/t/p/w45${p.logo_path}`}
                            alt={p.provider_name}
                            width={24}
                            height={24}
                            unoptimized
                            className={styles.providerLogo}
                          />
                        )}
                        <span>{p.provider_name} (Rent/Buy)</span>
                      </div>
                      <ExternalLink size={14} className={styles.extIcon} />
                    </a>
                  ))}
                </div>
              ) : (
                <p className={styles.emptyProviders}>
                  No subscription provider cached for {region}.
                </p>
              )}

              {watchExternalUrl && (
                <a
                  href={watchExternalUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className={`btn-primary ${styles.tmdbWatchBtn}`}
                >
                  Open All Streaming Options <ExternalLink size={14} />
                </a>
              )}
            </div>

            <div className={styles.synopsisCard}>
              <span className={styles.label}>SYNOPSIS</span>
              <p className={styles.synopsisText}>{movie.description}</p>
              {movie.director && (
                <div className={styles.metaLine}>
                  <span>DIRECTOR</span>
                  <strong>{movie.director}</strong>
                </div>
              )}
              {movie.cast_members && movie.cast_members.length > 0 && (
                <div className={styles.metaLine}>
                  <span>CAST</span>
                  <strong>{movie.cast_members.join(", ")}</strong>
                </div>
              )}
            </div>
          </aside>
        </div>
      </div>
    );
  }

  // MODE 3: Native HTML5 video player (future Step 2 Bunny Stream HLS / direct MP4)
  const currentTime = played * duration;

  return (
    <div className={styles.playerContainer} ref={containerRef} onMouseMove={handleMouseMove}>
      <div className={styles.playerWrapper} style={{ pointerEvents: playing ? "none" : "auto" }}>
        <video
          ref={videoRef}
          src={movie.video_url}
          className={styles.htmlVideo}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={() => setPlaying(true)}
          onPause={() => setPlaying(false)}
          onEnded={() => {
            setPlaying(false);
            setPlayed(1);
          }}
          autoPlay
          playsInline
        />
      </div>

      <div
        className={styles.clickArea}
        onClick={togglePlay}
        style={{ pointerEvents: playing ? "auto" : "none" }}
      />

      <div className={`${styles.overlay} ${showUI ? styles.visible : styles.hidden}`}>
        <div className={styles.topBar}>
          <button
            type="button"
            onClick={(e) => {
              e.stopPropagation();
              router.back();
            }}
            className={styles.backLink}
          >
            <ArrowLeft size={18} />
            <span>Back</span>
          </button>
          <span className={styles.titleText}>{movie.title}</span>
        </div>

        <div className={styles.bottomControls} onClick={(e) => e.stopPropagation()}>
          <div className={styles.progressBarContainer}>
            <input
              type="range"
              min={0}
              max={1}
              step="any"
              value={played}
              onChange={handleSeekChange}
              onMouseUp={handleSeekMouseUp}
              className={styles.seekSlider}
            />
            <span className={styles.timeDisplay}>
              {formatTime(currentTime)} / {formatTime(duration)}
            </span>
          </div>

          <div className={styles.controlsRow}>
            <div className={styles.leftControls}>
              <button type="button" onClick={togglePlay} className={styles.iconBtn}>
                {playing ? <Pause fill="currentColor" size={22} /> : <Play fill="currentColor" size={22} />}
              </button>
              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
                }}
                className={styles.iconBtn}
              >
                <Rewind size={20} />
              </button>
              <button
                type="button"
                onClick={() => {
                  if (videoRef.current) videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
                }}
                className={styles.iconBtn}
              >
                <FastForward size={20} />
              </button>
              <div className={styles.volumeGroup}>
                <button
                  type="button"
                  onClick={() => {
                    if (videoRef.current) {
                      videoRef.current.muted = !muted;
                      setMuted(!muted);
                    }
                  }}
                  className={styles.iconBtn}
                >
                  {muted ? <VolumeX size={20} /> : <Volume2 size={20} />}
                </button>
                <input
                  type="range"
                  min={0}
                  max={100}
                  step="1"
                  value={muted ? 0 : volume}
                  onChange={handleVolumeChange}
                  className={styles.volumeSlider}
                />
              </div>
            </div>

            <div className={styles.rightControls}>
              <button
                type="button"
                className={styles.textBtn}
                onClick={() => {
                  const newRate = playbackRate === 1 ? 1.5 : 1;
                  setPlaybackRate(newRate);
                  if (videoRef.current) videoRef.current.playbackRate = newRate;
                }}
              >
                {playbackRate}x
              </button>
              <button type="button" onClick={toggleFullscreen} className={styles.iconBtn}>
                <Maximize size={20} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
