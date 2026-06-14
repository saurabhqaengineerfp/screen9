"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Play, Pause, FastForward, Rewind, Maximize, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./watch.module.css";

// Extend window to include YouTube IFrame API types
declare global {
  interface Window {
    YT: any;
    onYouTubeIframeAPIReady: (() => void) | undefined;
  }
}

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  if (url.includes("/embed/")) return url.split("/embed/")[1].split("?")[0];
  if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
  if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split("?")[0];
  return null;
}

export default function WatchClient({ movie }: { movie: any }) {
  const router = useRouter();
  const containerRef = useRef<HTMLDivElement>(null);
  const playerRef = useRef<any>(null);
  const intervalRef = useRef<NodeJS.Timeout | null>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [ready, setReady] = useState(false);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showDetails, setShowDetails] = useState(true);

  const [showUI, setShowUI] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const videoId = extractYouTubeId(movie.video_url || "");

  // Load YouTube IFrame API and create player
  useEffect(() => {
    if (!videoId) return;

    const createPlayer = () => {
      const vars: any = {
        controls: 0,
        modestbranding: 1,
        rel: 0,
        showinfo: 0,
        disablekb: 1,
        iv_load_policy: 3,
        fs: 0,
        autoplay: 1,
        playsinline: 1,
        origin: window.location.origin,
      };

      if (movie.start_time) vars.start = movie.start_time;
      if (movie.end_time) vars.end = movie.end_time;

      playerRef.current = new window.YT.Player("yt-player", {
        videoId,
        playerVars: vars,
        events: {
          onReady: (event: any) => {
            setReady(true);
            setDuration(event.target.getDuration());
            event.target.setVolume(100);
            event.target.playVideo();
            // Do NOT set playing to true here! Wait for onStateChange to confirm it actually started playing.
            // On iOS Safari, playVideo() is blocked silently, so playing should remain false.

            // Show movie details for 20 seconds on start, then fade out
            setTimeout(() => setShowDetails(false), 20000);
          },
          onStateChange: (event: any) => {
            // YT.PlayerState: PLAYING=1, PAUSED=2, ENDED=0, BUFFERING=3, UNSTARTED=-1
            if (event.data === 1) {
              setPlaying(true);
              // If YouTube internally muted the video as an autoplay fallback, unmute it when the user starts playback
              if (event.target.isMuted()) {
                event.target.unMute();
                event.target.setVolume(100);
                setMuted(false);
                setVolume(100);
              }
            } else if (event.data === 2 || event.data === -1) {
              setPlaying(false);
            } else if (event.data === 0) {
              setPlaying(false);
              setPlayed(1);
            }
          },
        },
      });
    };

    if (window.YT && window.YT.Player) {
      createPlayer();
    } else {
      // Load the API script
      const tag = document.createElement("script");
      tag.src = "https://www.youtube.com/iframe_api";
      document.head.appendChild(tag);
      window.onYouTubeIframeAPIReady = createPlayer;
    }

    return () => {
      if (playerRef.current?.destroy) {
        playerRef.current.destroy();
      }
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [videoId]);

  // Track progress while playing
  useEffect(() => {
    if (playing && ready) {
      intervalRef.current = setInterval(() => {
        if (playerRef.current?.getCurrentTime && playerRef.current?.getDuration) {
          const current = playerRef.current.getCurrentTime();
          const total = playerRef.current.getDuration();
          if (total > 0) setPlayed(current / total);
        }
      }, 500);
    } else {
      if (intervalRef.current) clearInterval(intervalRef.current);
    }
    return () => {
      if (intervalRef.current) clearInterval(intervalRef.current);
    };
  }, [playing, ready]);

  // Auto-hide UI
  const handleMouseMove = useCallback(() => {
    setShowUI(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (playing) setShowUI(false);
    }, 3000);
  }, [playing]);

  useEffect(() => {
    if (!playing) {
      setShowUI(true);
      if (timeoutRef.current) clearTimeout(timeoutRef.current);
    } else {
      handleMouseMove();
    }
  }, [playing, handleMouseMove]);

  // Player control handlers
  const togglePlay = () => {
    if (!playerRef.current) return;
    if (playing) {
      playerRef.current.pauseVideo();
    } else {
      playerRef.current.playVideo();
    }
  };

  const handlePlayPause = (e: React.MouseEvent) => {
    e.stopPropagation();
    togglePlay();
  };

  const handleSeekChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setPlayed(val);
  };

  const handleSeekMouseUp = (e: React.MouseEvent<HTMLInputElement>) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    if (playerRef.current?.seekTo) {
      playerRef.current.seekTo(val * duration, true);
    }
  };

  const handleRewind = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerRef.current?.getCurrentTime) return;
    const cur = playerRef.current.getCurrentTime();
    playerRef.current.seekTo(Math.max(0, cur - 10), true);
  };

  const handleFastForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerRef.current?.getCurrentTime) return;
    const cur = playerRef.current.getCurrentTime();
    playerRef.current.seekTo(cur + 10, true);
  };



  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!playerRef.current) return;
    if (muted) {
      playerRef.current.unMute();
      playerRef.current.setVolume(volume);
      setMuted(false);
    } else {
      playerRef.current.mute();
      setMuted(true);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (playerRef.current) {
      playerRef.current.setVolume(val);
      if (val === 0) {
        playerRef.current.mute();
        setMuted(true);
      } else if (muted) {
        playerRef.current.unMute();
        setMuted(false);
      }
    }
  };

  const handlePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newRate = playbackRate === 1 ? 1.5 : 1;
    setPlaybackRate(newRate);
    if (playerRef.current?.setPlaybackRate) {
      playerRef.current.setPlaybackRate(newRate);
    }
  };

  const toggleFullscreen = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (!document.fullscreenElement) {
      containerRef.current?.requestFullscreen();
    } else {
      document.exitFullscreen();
    }
  };

  // Format time for display
  const formatTime = (seconds: number) => {
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const currentTime = played * duration;

  return (
    <div
      className={styles.playerContainer}
      ref={containerRef}
      onMouseMove={handleMouseMove}
    >
      {/* YouTube player renders into this div */}
      <div 
        className={styles.playerWrapper}
        style={{ pointerEvents: playing ? 'none' : 'auto' }}
      >
        <div id="yt-player" className={styles.ytPlayer} />
      </div>

      {/* Click-to-play/pause area */}
      <div 
        className={styles.clickArea} 
        onClick={togglePlay} 
        style={{ pointerEvents: playing ? 'auto' : 'none' }}
      />

      {/* Overlay UI */}
      <div className={`${styles.overlay} ${showUI ? styles.visible : styles.hidden}`}>
        <div className={styles.topBar}>
          <button onClick={(e) => { e.stopPropagation(); router.back(); }} className={styles.backBtn}>
            <ArrowLeft size={32} />
          </button>
        </div>

        {(showDetails || !playing) && ready && (
          <div className={`${styles.centerDetails} ${showDetails && playing ? styles.detailsFadeOut : ''}`}>
            <h1 className={styles.movieTitle}>{movie.title}</h1>
            
            {(movie.director || (movie.cast_members && movie.cast_members.length > 0)) && (
              <div className={styles.creditsContainer}>
                {movie.director && <p className={styles.creditLine}><strong>Director:</strong> {movie.director}</p>}
                {movie.cast_members && movie.cast_members.length > 0 && (
                  <p className={styles.creditLine}><strong>Starring:</strong> {movie.cast_members.join(', ')}</p>
                )}
              </div>
            )}
            
            <p className={styles.movieDesc}>{movie.description}</p>
            {!playing && (
              <button className={styles.bigPlayBtn} onClick={handlePlayPause}>
                <Play fill="white" size={48} />
              </button>
            )}
          </div>
        )}

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
              <button onClick={handlePlayPause} className={styles.iconBtn}>
                {playing ? <Pause fill="currentColor" size={28} /> : <Play fill="currentColor" size={28} />}
              </button>
              <button onClick={handleRewind} className={styles.iconBtn}>
                <Rewind fill="currentColor" size={24} />
              </button>
              <button onClick={handleFastForward} className={styles.iconBtn}>
                <FastForward fill="currentColor" size={24} />
              </button>
              <div className={styles.volumeGroup}>
                <button onClick={toggleMute} className={styles.iconBtn}>
                  {muted ? <VolumeX size={24} /> : <Volume2 size={24} />}
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
              <span className={styles.titleText}>{movie.title}</span>
            </div>

            <div className={styles.rightControls}>
              <button className={styles.textBtn} onClick={handlePlaybackRate}>
                {playbackRate}x
              </button>
              <button onClick={toggleFullscreen} className={styles.iconBtn}>
                <Maximize size={24} />
              </button>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
