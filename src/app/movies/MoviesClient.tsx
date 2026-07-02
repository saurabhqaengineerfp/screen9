"use client";

import { useState, useMemo } from 'react';
import Image from 'next/image';
import Link from 'next/link';
import { useRouter, useSearchParams } from 'next/navigation';
import { Filter } from 'lucide-react';
import styles from './movies.module.css';
import MoreInfoModal from '@/components/MoreInfoModal';
import CustomSelect from '@/components/CustomSelect';

export default function MoviesClient({ initialMovies }: { initialMovies: any[] }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  
  // Extract unique values for filters
  const categories = useMemo(() => Array.from(new Set(initialMovies.map(m => m.category).filter(Boolean))), [initialMovies]);
  const countries = useMemo(() => Array.from(new Set(initialMovies.map(m => m.country).filter(Boolean))), [initialMovies]);
  const periods = useMemo(() => Array.from(new Set(initialMovies.map(m => m.period).filter(Boolean))), [initialMovies]);
  
  // Flatten tags and get unique
  const tags = useMemo(() => {
    const allTags = initialMovies.flatMap(m => m.tags || []);
    return Array.from(new Set(allTags));
  }, [initialMovies]);

  // Current filters from URL
  const currentCategory = searchParams.get('category') || '';
  const currentCountry = searchParams.get('country') || '';
  const currentPeriod = searchParams.get('period') || '';
  const currentTag = searchParams.get('tag') || '';

  // Filter movies
  const filteredMovies = useMemo(() => {
    return initialMovies.filter(m => {
      if (currentCategory && m.category !== currentCategory) return false;
      if (currentCountry && m.country !== currentCountry) return false;
      if (currentPeriod && m.period !== currentPeriod) return false;
      if (currentTag && !(m.tags || []).includes(currentTag)) return false;
      return true;
    });
  }, [initialMovies, currentCategory, currentCountry, currentPeriod, currentTag]);

  const updateFilter = (key: string, value: string) => {
    const params = new URLSearchParams(searchParams.toString());
    if (value) params.set(key, value);
    else params.delete(key);
    router.push(`/movies?${params.toString()}`);
  };

  const hasFilters = currentCategory || currentCountry || currentPeriod || currentTag;

  return (
    <div className={styles.browseLayout}>
      <aside className={styles.filterSidebar}>
        <div className={styles.filterHeader}>
          <Filter size={18} />
          <h3>Discover</h3>
        </div>
        
        <div className={styles.filterGroup}>
          <label>Category</label>
          <CustomSelect 
            value={currentCategory} 
            onChange={(val) => updateFilter('category', val)} 
            options={[
              { value: "", label: "All Categories" },
              ...categories.filter(Boolean).map(c => ({ value: c as string, label: c as string }))
            ]}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Country</label>
          <CustomSelect 
            value={currentCountry} 
            onChange={(val) => updateFilter('country', val)} 
            options={[
              { value: "", label: "All Countries" },
              ...countries.filter(Boolean).map(c => ({ value: c as string, label: c as string }))
            ]}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Period</label>
          <CustomSelect 
            value={currentPeriod} 
            onChange={(val) => updateFilter('period', val)} 
            options={[
              { value: "", label: "All Periods" },
              ...periods.filter(Boolean).map(c => ({ value: c as string, label: c as string }))
            ]}
          />
        </div>

        <div className={styles.filterGroup}>
          <label>Tag / Collection</label>
          <CustomSelect 
            value={currentTag} 
            onChange={(val) => updateFilter('tag', val)} 
            options={[
              { value: "", label: "All Tags" },
              ...tags.filter(Boolean).map(c => ({ value: c as string, label: c as string }))
            ]}
          />
        </div>
        
        {hasFilters && (
          <button 
            className={styles.clearFiltersBtn}
            onClick={() => router.push('/movies')}
          >
            Clear All
          </button>
        )}
      </aside>

      <div className={styles.browseContent}>
        <div className={styles.headerArea}>
           <h1 className={styles.title}>
             {hasFilters ? 'Filtered Movies' : 'All Movies'}
             <span className={styles.countBadge}>{filteredMovies.length}</span>
           </h1>
        </div>

        {filteredMovies.length === 0 ? (
          <p className={styles.emptyState}>No movies match your filters.</p>
        ) : (
          <div className={styles.flatGrid}>
            {filteredMovies.map(movie => (
              <MoreInfoModal movie={movie} key={movie.id}>
                <div className={styles.movieCard}>
                  {movie.poster_url ? (
                    <Image 
                      src={movie.poster_url} 
                      alt={movie.title} 
                      fill
                      className={styles.moviePoster}
                      unoptimized
                    />
                  ) : (
                    <div className={styles.moviePlaceholder}>{movie.title}</div>
                  )}
                  <div className={styles.movieOverlay}>
                    <h3>{movie.title}</h3>
                    <div className={styles.movieMeta}>
                      {movie.category && <span>{movie.category}</span>}
                      {movie.period && <span>{movie.period}</span>}
                    </div>
                  </div>
                </div>
              </MoreInfoModal>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
