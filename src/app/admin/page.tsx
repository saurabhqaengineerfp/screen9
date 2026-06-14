"use client";

import { useState } from "react";
import { addMovie } from "./actions";
import styles from "./admin.module.css";

export default function AdminPage() {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await addMovie(formData);
      if (res?.success) {
        setMessage(`Success! Added "${res.title}" to the database.`);
        (e.target as HTMLFormElement).reset();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
      </div>
    </div>
  );
}
