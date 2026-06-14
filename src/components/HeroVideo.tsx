"use client";

import { useState, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import styles from '@/app/page.module.css';

function extractYouTubeId(url: string): string | null {
  if (!url) return null;
  if (url.includes("/embed/")) return url.split("/embed/")[1].split("?")[0];
  if (url.includes("v=")) return url.split("v=")[1].split("&")[0];
  if (url.includes("youtu.be/")) return url.split("youtu.be/")[1].split("?")[0];
  return null;
}

export default function HeroVideo({ videoUrl }: { videoUrl?: string }) {
  const [isMuted, setIsMuted] = useState(true);
  const iframeRef = useRef<HTMLIFrameElement>(null);

  const toggleMute = () => {
    if (iframeRef.current && iframeRef.current.contentWindow) {
      const command = isMuted ? 'unMute' : 'mute';
      iframeRef.current.contentWindow.postMessage(
        JSON.stringify({ event: 'command', func: command, args: [] }),
        '*'
      );
      setIsMuted(!isMuted);
    }
  };

  // Build a proper embed URL with mute=1 for autoplay compliance
  const fallbackId = "U2Qp5pL3ovA";
  const videoId = videoUrl ? extractYouTubeId(videoUrl) : fallbackId;
  const id = videoId || fallbackId;

  const embedUrl = `https://www.youtube.com/embed/${id}?autoplay=1&mute=1&controls=0&loop=1&playlist=${id}&showinfo=0&modestbranding=1&playsinline=1&enablejsapi=1`;

  return (
    <>
      <iframe
        ref={iframeRef}
        className={styles.backdropVideo}
        src={embedUrl}
        allow="autoplay; encrypted-media"
        title="Hero Video"
      ></iframe>
      <div className={styles.overlay} />
      
      <button 
        onClick={toggleMute}
        className={styles.muteButton}
        aria-label={isMuted ? "Unmute" : "Mute"}
      >
        {isMuted ? <VolumeX size={24} /> : <Volume2 size={24} />}
      </button>
    </>
  );
}
