"use client";

import { useEffect, useRef, useState } from "react";
import Image from "next/image";
import { Volume2, VolumeX } from "lucide-react";
import styles from "@/app/page.module.css";
import { extractYouTubeId } from "@/utils/movieHelpers";

declare global {
  interface Window {
    YT?: any;
    onYouTubeIframeAPIReady?: () => void;
    __ytApiCallbacks?: Array<() => void>;
  }
}

function loadYouTubeIframeAPI(onReady: () => void) {
  if (typeof window === "undefined") return;
  if (window.YT && window.YT.Player) {
    onReady();
    return;
  }

  if (!window.__ytApiCallbacks) {
    window.__ytApiCallbacks = [];
  }
  window.__ytApiCallbacks.push(onReady);

  if (!document.querySelector('script[src="https://www.youtube.com/iframe_api"]')) {
    const prev = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      if (prev) prev();
      const cbs = window.__ytApiCallbacks || [];
      window.__ytApiCallbacks = [];
      cbs.forEach((cb) => cb());
    };
    const tag = document.createElement("script");
    tag.src = "https://www.youtube.com/iframe_api";
    document.head.appendChild(tag);
  }
}

export default function HeroVideo({ movie }: { movie?: any }) {
  const backdrop = movie?.backdrop_url || movie?.poster_url || null;
  const trailerYtId = extractYouTubeId(movie?.trailer_url);

  const bgRef = useRef<HTMLDivElement>(null);
  const playerMountRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);

  const [videoReady, setVideoReady] = useState(false);
  const [isMuted, setIsMuted] = useState(true);

  useEffect(() => {
    if (!trailerYtId || !playerMountRef.current) return;

    let cancelled = false;

    loadYouTubeIframeAPI(() => {
      if (cancelled || !playerMountRef.current || !window.YT?.Player) return;

      playerRef.current = new window.YT.Player(playerMountRef.current, {
        videoId: trailerYtId,
        playerVars: {
          autoplay: 1,
          mute: 1,
          controls: 0,
          disablekb: 1,
          fs: 0,
          rel: 0,
          modestbranding: 1,
          playsinline: 1,
          loop: 1,
          playlist: trailerYtId,
          iv_load_policy: 3,
        },
        events: {
          onReady: (event: any) => {
            if (cancelled) return;
            try {
              event.target.mute();
              if (typeof event.target.setPlaybackQuality === "function") {
                event.target.setPlaybackQuality("hd1080");
              }
              event.target.playVideo();
            } catch {
              // ignore autoplay restrictions
            }
          },
          onStateChange: (event: any) => {
            if (cancelled) return;
            if (event.data === window.YT?.PlayerState?.PLAYING) {
              setVideoReady(true);
            } else if (event.data === window.YT?.PlayerState?.ENDED) {
              try {
                event.target.playVideo();
              } catch {
                // ignore
              }
            }
          },
        },
      });
    });

    return () => {
      cancelled = true;
      if (playerRef.current) {
        try {
          playerRef.current.destroy();
        } catch {
          // ignore
        }
        playerRef.current = null;
      }
    };
  }, [trailerYtId]);

  // Auto-mute when the user scrolls down past the hero banner
  useEffect(() => {
    if (!trailerYtId || !bgRef.current) return;

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (entry && !entry.isIntersecting && playerRef.current) {
          try {
            if (typeof playerRef.current.isMuted === "function" && !playerRef.current.isMuted()) {
              playerRef.current.mute();
              setIsMuted(true);
            }
          } catch {
            // ignore
          }
        }
      },
      { threshold: 0.35 }
    );

    observer.observe(bgRef.current);
    return () => observer.disconnect();
  }, [trailerYtId]);

  const toggleMute = () => {
    const player = playerRef.current;
    if (!player) return;
    try {
      if (isMuted) {
        player.unMute();
        if (typeof player.setVolume === "function") player.setVolume(80);
        setIsMuted(false);
      } else {
        player.mute();
        setIsMuted(true);
      }
    } catch {
      // ignore
    }
  };

  return (
    <>
      <div className={styles.heroBackground} ref={bgRef}>
        {backdrop ? (
          <Image
            src={backdrop}
            alt={movie?.title || "Featured film"}
            fill
            priority
            unoptimized
            className={styles.backdropImage}
          />
        ) : (
          <div className={styles.backdropFallback} />
        )}

        {trailerYtId && (
          <div
            className={`${styles.heroVideoLayer} ${videoReady ? styles.heroVideoVisible : ""}`}
            aria-hidden="true"
          >
            <div className={styles.heroVideoScale}>
              <div ref={playerMountRef} className={styles.heroVideoIframe} />
            </div>
          </div>
        )}

        <div className={styles.overlay} />
      </div>

      {trailerYtId && videoReady && (
        <button
          type="button"
          onClick={toggleMute}
          className={styles.heroMuteBtn}
          aria-label={isMuted ? "Unmute hero trailer" : "Mute hero trailer"}
          title={isMuted ? "Unmute trailer" : "Mute trailer"}
        >
          {isMuted ? <VolumeX size={18} /> : <Volume2 size={18} />}
          <span>{isMuted ? "Unmute" : "Mute"}</span>
        </button>
      )}
    </>
  );
}
