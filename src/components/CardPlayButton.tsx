"use client";

import Link from 'next/link';
import { Play } from 'lucide-react';

export default function CardPlayButton({ movieId, className }: { movieId: string, className: string }) {
  return (
    <Link href={`/watch/${movieId}`} onClick={(e) => e.stopPropagation()} className={className}>
      <Play fill="currentColor" size={20} />
    </Link>
  );
}
