"use client";

import { useState } from "react";
import { addMovie, deleteMovie } from "./actions";
import styles from "./admin.module.css";
import { Trash2 } from "lucide-react";

export default function AdminClient({ initialMovies }: { initialMovies: any[] }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [movies, setMovies] = useState(initialMovies);

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await addMovie(formData);
      if (res?.success) {
        setMessage(`Success! Added "${res.title}" to the database. Refresh page to see it in the list.`);
        (e.target as HTMLFormElement).reset();
        // Optimistically we could add it to `movies`, but we don't have the full DB object easily.
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    
    try {
      await deleteMovie(id);
      setMovies(movies.filter(m => m.id !== id));
      setMessage(`Deleted "${title}"`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card}>
        <h1 className={styles.title}>Admin Panel</h1>
        <p className={styles.subtitle}>Add a new movie by providing its TMDB link and Video source.</p>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>TMDB Movie Link</label>
            <input 
              name="tmdbUrl" 
              type="url" 
              placeholder="e.g. https://www.themoviedb.org/movie/245842-ugly" 
              required 
            />
          </div>

          <div className={styles.inputGroup}>
            <label>Video URL (YouTube, Vimeo, MP4)</label>
            <input 
              name="videoUrl" 
              type="url" 
              placeholder="e.g. https://www.youtube.com/watch?v=hot7JzF2JYs" 
              required 
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label>Category</label>
            <select name="category">
              <option value="Trending">Trending</option>
              <option value="Sci-Fi Essentials">Sci-Fi Essentials</option>
              <option value="Action Blockbusters">Action Blockbusters</option>
              <option value="Indian Masterpieces">Indian Masterpieces</option>
            </select>
          </div>

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? "Processing via TMDB..." : "Add Movie"}
          </button>
        </form>

        {message && <div className={styles.success}>{message}</div>}
        {error && <div className={styles.error}>{error}</div>}

        <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '40px 0' }} />

        <h2 className={styles.title} style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Manage Movies</h2>
        {movies.length === 0 ? (
          <p style={{ color: '#888' }}>No movies in database.</p>
        ) : (
          <div className={styles.movieList}>
            {movies.map(movie => (
              <div key={movie.id} className={styles.movieItem}>
                <div>
                  <strong>{movie.title}</strong>
                  <span style={{ color: '#888', marginLeft: '10px' }}>({movie.release_year})</span>
                </div>
                <button 
                  onClick={() => handleDelete(movie.id, movie.title)}
                  className={styles.deleteBtn}
                  title="Delete Movie"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
