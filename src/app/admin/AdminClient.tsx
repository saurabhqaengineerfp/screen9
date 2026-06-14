"use client";

import { useState } from "react";
import { addMovie, deleteMovie } from "./actions";
import styles from "./admin.module.css";
import { Trash2 } from "lucide-react";

export default function AdminClient({ initialMovies, initialCategories }: { initialMovies: any[], initialCategories: any[] }) {
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [movies, setMovies] = useState(initialMovies);
  const [categories, setCategories] = useState(initialCategories);
  const [catLoading, setCatLoading] = useState(false);

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

  const handleAddCategory = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setCatLoading(true);
    setMessage("");
    setError("");

    const formData = new FormData(e.currentTarget);
    const name = formData.get("name") as string;
    
    try {
      const res = await (await import("./actions")).addCategory(formData);
      if (res?.success) {
        setMessage(`Success! Added category "${res.name}".`);
        // We'll optimistically add it. But we don't have the UUID. A full refresh or fetching it back is better.
        // For now just ask to refresh, or just reload the page for simplicity:
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCatLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to delete category "${name}"?`)) return;
    
    try {
      await (await import("./actions")).deleteCategory(id);
      setCategories(categories.filter(c => c.id !== id));
      setMessage(`Deleted category "${name}"`);
    } catch (err: any) {
      setError(err.message);
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
              {categories.length === 0 ? (
                <option value="Trending">Trending (Fallback)</option>
              ) : (
                categories.map(cat => (
                  <option key={cat.id} value={cat.name}>{cat.name}</option>
                ))
              )}
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

        <hr style={{ borderColor: 'rgba(255,255,255,0.1)', margin: '40px 0' }} />

        <h2 className={styles.title} style={{ fontSize: '1.5rem', marginBottom: '20px' }}>Manage Categories</h2>
        
        <form onSubmit={handleAddCategory} className={styles.form} style={{ marginBottom: '20px', flexDirection: 'row', alignItems: 'flex-end', gap: '10px' }}>
          <div className={styles.inputGroup} style={{ flex: 1, margin: 0 }}>
            <label>New Category Name</label>
            <input 
              name="name" 
              type="text" 
              placeholder="e.g. Action Blockbusters" 
              required 
            />
          </div>
          <button type="submit" disabled={catLoading} className={styles.button} style={{ padding: '12px 24px', width: 'auto' }}>
            {catLoading ? "Adding..." : "Add"}
          </button>
        </form>

        {categories.length === 0 ? (
          <p style={{ color: '#888' }}>No categories in database.</p>
        ) : (
          <div className={styles.movieList}>
            {categories.map(cat => (
              <div key={cat.id} className={styles.movieItem}>
                <div>
                  <strong>{cat.name}</strong>
                </div>
                <button 
                  onClick={() => handleDeleteCategory(cat.id, cat.name)}
                  className={styles.deleteBtn}
                  title="Delete Category"
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
