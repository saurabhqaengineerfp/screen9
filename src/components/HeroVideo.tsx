"use client";

import { useState, useRef } from 'react';
import { Volume2, VolumeX } from 'lucide-react';
import styles from '@/app/page.module.css';

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

  const defaultVideo = "https://www.youtube.com/embed/U2Qp5pL3ovA?autoplay=1&mute=1&controls=0&loop=1&playlist=U2Qp5pL3ovA&showinfo=0&modestbranding=1&playsinline=1&enablejsapi=1";
  
  // ensure JS API is enabled on whatever URL is passed
  let finalUrl = videoUrl || defaultVideo;
  if (finalUrl !== defaultVideo && !finalUrl.includes('enablejsapi=1')) {
    finalUrl += finalUrl.includes('?') ? '&enablejsapi=1' : '?enablejsapi=1';
  }

  return (
    <>
      <iframe
        ref={iframeRef}
        className={styles.backdropVideo}
        src={finalUrl}
        allow="autoplay; encrypted-media"
        title="Dune Part Two Trailer"
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
