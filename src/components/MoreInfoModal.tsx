"use client";

import { useState, useEffect } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import Link from "next/link";
import { Play, Info, X } from "lucide-react";
import styles from "./MoreInfoModal.module.css";

export default function MoreInfoButton({ movie }: { movie: any }) {
  const [isOpen, setIsOpen] = useState(false);
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
    if (isOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [isOpen]);

  return (
    <>
      <button className={styles.infoBtn} onClick={() => setIsOpen(true)}>
        <Info size={20} />
        More Info
      </button>

      {isOpen && mounted && createPortal(
        <div className={styles.modalOverlay} onClick={() => setIsOpen(false)}>
          <div className={styles.modalContent} onClick={(e) => e.stopPropagation()}>
            <button className={styles.closeBtn} onClick={() => setIsOpen(false)}>
              <X size={24} />
            </button>
            
            <div className={styles.modalHeader}>
              {movie.backdrop_url && (
                <div className={styles.backdropWrapper}>
                  <Image 
                    src={movie.backdrop_url} 
                    alt={movie.title}
                    fill
                    style={{ objectFit: 'cover' }}
                    unoptimized
                  />
                  <div className={styles.backdropFade} />
                </div>
              )}
              
              <div className={styles.headerContent}>
                <h2 className={styles.modalTitle}>{movie.title}</h2>
                <div className={styles.actions}>
                  <Link href={`/watch/${movie.id}`} className="btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <Play fill="currentColor" size={20} />
                    Play Now
                  </Link>
                </div>
              </div>
            </div>

            <div className={styles.modalBody}>
              <div className={styles.leftCol}>
                <div className={styles.meta}>
                  <span className={styles.match}>Trending Now</span>
                  <span>{movie.release_year}</span>
                  {movie.runtime && <span>{Math.floor(movie.runtime / 60)}h {movie.runtime % 60}m</span>}
                </div>
                <p className={styles.description}>{movie.description}</p>
              </div>
              <div className={styles.rightCol}>
                {movie.cast_members && movie.cast_members.length > 0 && (
                  <div className={styles.creditBlock}>
                    <span className={styles.creditLabel}>Cast:</span>
                    <span className={styles.creditValue}>{movie.cast_members.join(', ')}</span>
                  </div>
                )}
                {movie.genres && movie.genres.length > 0 && (
                  <div className={styles.creditBlock}>
                    <span className={styles.creditLabel}>Genres:</span>
                    <span className={styles.creditValue}>{movie.genres.join(', ')}</span>
                  </div>
                )}
                {movie.director && (
                  <div className={styles.creditBlock}>
                    <span className={styles.creditLabel}>Director:</span>
                    <span className={styles.creditValue}>{movie.director}</span>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      , document.body)}
    </>
  );
}
