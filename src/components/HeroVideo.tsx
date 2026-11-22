import Image from "next/image";
import styles from "@/app/page.module.css";

export default function HeroVideo({ movie }: { movie?: any }) {
  const backdrop = movie?.backdrop_url || movie?.poster_url || null;

  return (
    <>
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
      <div className={styles.overlay} />
    </>
  );
}
