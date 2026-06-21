"use client";

import { useState, useEffect, useRef, useCallback } from "react";
import { ArrowLeft, Play, Pause, FastForward, Rewind, Maximize, Volume2, VolumeX } from "lucide-react";
import { useRouter } from "next/navigation";
import styles from "./watch.module.css";

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
  const videoRef = useRef<HTMLVideoElement>(null);

  const [playing, setPlaying] = useState(false);
  const [muted, setMuted] = useState(false);
  const [volume, setVolume] = useState(100);
  const [played, setPlayed] = useState(0);
  const [duration, setDuration] = useState(0);
  const [playbackRate, setPlaybackRate] = useState(1);
  const [showDetails, setShowDetails] = useState(true);
  const [showUI, setShowUI] = useState(true);
  const timeoutRef = useRef<NodeJS.Timeout | null>(null);

  const videoId = extractYouTubeId(movie.video_url || "");
  const isYouTube = !!videoId;

  // Auto-hide UI (for HTML5 video)
  const handleMouseMove = useCallback(() => {
    setShowUI(true);
    if (timeoutRef.current) clearTimeout(timeoutRef.current);
    timeoutRef.current = setTimeout(() => {
      if (playing) setShowUI(false);
    }, 3000);
  }, [playing]);

  useEffect(() => {
    if (!isYouTube) {
      if (!playing) {
        setShowUI(true);
        if (timeoutRef.current) clearTimeout(timeoutRef.current);
      } else {
        handleMouseMove();
      }
    }
  }, [playing, handleMouseMove, isYouTube]);

  // Hide details after 20 seconds
  useEffect(() => {
    const timer = setTimeout(() => setShowDetails(false), 20000);
    return () => clearTimeout(timer);
  }, []);

  // HTML5 Video Event Handlers
  const handleTimeUpdate = () => {
    if (videoRef.current) {
      setPlayed(videoRef.current.currentTime / (videoRef.current.duration || 1));
    }
  };

  const handleLoadedMetadata = () => {
    if (videoRef.current) {
      setDuration(videoRef.current.duration);
      // Auto-play might be blocked by browser policy without mute, but we try:
      videoRef.current.play().catch(() => {
        setPlaying(false);
      });
    }
  };

  const handleVideoPlay = () => setPlaying(true);
  const handleVideoPause = () => setPlaying(false);
  const handleVideoEnded = () => {
    setPlaying(false);
    setPlayed(1);
  };

  // Player control handlers
  const togglePlay = () => {
    if (videoRef.current) {
      if (playing) {
        videoRef.current.pause();
      } else {
        videoRef.current.play();
      }
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
    if (videoRef.current) {
      videoRef.current.currentTime = val * duration;
    }
  };

  const handleRewind = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = Math.max(0, videoRef.current.currentTime - 10);
    }
  };

  const handleFastForward = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.currentTime = Math.min(duration, videoRef.current.currentTime + 10);
    }
  };

  const toggleMute = (e: React.MouseEvent) => {
    e.stopPropagation();
    if (videoRef.current) {
      videoRef.current.muted = !muted;
      setMuted(!muted);
    }
  };

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = parseFloat(e.target.value);
    setVolume(val);
    if (videoRef.current) {
      videoRef.current.volume = val / 100;
      if (val === 0) {
        videoRef.current.muted = true;
        setMuted(true);
      } else if (muted) {
        videoRef.current.muted = false;
        setMuted(false);
      }
    }
  };

  const handlePlaybackRate = (e: React.MouseEvent) => {
    e.stopPropagation();
    const newRate = playbackRate === 1 ? 1.5 : 1;
    setPlaybackRate(newRate);
    if (videoRef.current) {
      videoRef.current.playbackRate = newRate;
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

  const formatTime = (seconds: number) => {
    if (isNaN(seconds)) return "0:00";
    const h = Math.floor(seconds / 3600);
    const m = Math.floor((seconds % 3600) / 60);
    const s = Math.floor(seconds % 60);
    if (h > 0) return `${h}:${m.toString().padStart(2, "0")}:${s.toString().padStart(2, "0")}`;
    return `${m}:${s.toString().padStart(2, "0")}`;
  };

  const currentTime = played * duration;

  // Render simple YouTube iframe
  if (isYouTube) {
    return (
      <div className={styles.playerContainer} ref={containerRef}>
        <div className={styles.youtubeTopBar}>
          <button onClick={() => router.back()} className={styles.backBtn}>
            <ArrowLeft size={32} />
          </button>
        </div>
        <iframe
          src={`https://www.youtube.com/embed/${videoId}?autoplay=1&controls=1&rel=0&modestbranding=1`}
          allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
          allowFullScreen
          className={styles.nativeYoutubeIframe}
        />
      </div>
    );
  }

  // Render custom HTML5 player
  return (
    <div
      className={styles.playerContainer}
      ref={containerRef}
      onMouseMove={handleMouseMove}
    >
      <div className={styles.playerWrapper} style={{ pointerEvents: playing ? 'none' : 'auto' }}>
        <video
          ref={videoRef}
          src={movie.video_url}
          className={styles.htmlVideo}
          onTimeUpdate={handleTimeUpdate}
          onLoadedMetadata={handleLoadedMetadata}
          onPlay={handleVideoPlay}
          onPause={handleVideoPause}
          onEnded={handleVideoEnded}
          autoPlay
          playsInline
        />
      </div>

      <div 
        className={styles.clickArea} 
        onClick={togglePlay} 
        style={{ pointerEvents: playing ? 'auto' : 'none' }}
      />

      <div className={`${styles.overlay} ${showUI ? styles.visible : styles.hidden}`}>
        <div className={styles.topBar}>
          <button onClick={(e) => { e.stopPropagation(); router.back(); }} className={styles.backBtn}>
            <ArrowLeft size={32} />
          </button>
        </div>

        {(showDetails || !playing) && (
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
