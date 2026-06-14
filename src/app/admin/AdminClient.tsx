"use client";

import { useState } from "react";
import { addMovie, deleteMovie, updateMovie } from "./actions";
import styles from "./admin.module.css";
import { Trash2, Edit, PlusCircle, Film, ListVideo, Tags } from "lucide-react";

type Tab = 'add_movie' | 'manage_movies' | 'manage_categories';

export default function AdminClient({ initialMovies, initialCategories }: { initialMovies: any[], initialCategories: any[] }) {
  const [activeTab, setActiveTab] = useState<Tab>('add_movie');
  const [editingMovie, setEditingMovie] = useState<any>(null);

  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const [movies, setMovies] = useState(initialMovies);
  const [categories, setCategories] = useState(initialCategories);
  const [catLoading, setCatLoading] = useState(false);

  const clearMessages = () => {
    setMessage("");
    setError("");
  };

  const handleAddMovie = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await addMovie(formData);
      if (res?.success) {
        setMessage(`Success! Added "${res.title}" to the database. Refresh page to see it in the list.`);
        (e.target as HTMLFormElement).reset();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditMovie = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    clearMessages();

    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await updateMovie(editingMovie.id, formData);
      if (res?.success) {
        setMessage(`Success! Updated "${res.title}".`);
        // Update local state
        setMovies(movies.map(m => m.id === editingMovie.id ? { ...m, ...res.movie } : m));
        setEditingMovie(null);
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
    clearMessages();

    const formData = new FormData(e.currentTarget);
    
    try {
      const res = await (await import("./actions")).addCategory(formData);
      if (res?.success) {
        setMessage(`Success! Added category "${res.name}".`);
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
    clearMessages();
    try {
      await (await import("./actions")).deleteCategory(id);
      setCategories(categories.filter(c => c.id !== id));
      setMessage(`Deleted category "${name}"`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteMovie = async (id: string, title: string) => {
    if (!confirm(`Are you sure you want to delete "${title}"?`)) return;
    clearMessages();
    try {
      await deleteMovie(id);
      setMovies(movies.filter(m => m.id !== id));
      setMessage(`Deleted "${title}"`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.dashboard}>
      {/* Sidebar */}
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <Film size={28} />
          Screen9 Admin
        </div>

        <button 
          className={`${styles.tabButton} ${activeTab === 'add_movie' ? styles.activeTab : ''}`}
          onClick={() => { setActiveTab('add_movie'); clearMessages(); setEditingMovie(null); }}
        >
          <PlusCircle size={20} /> Add Movie
        </button>

        <button 
          className={`${styles.tabButton} ${activeTab === 'manage_movies' ? styles.activeTab : ''}`}
          onClick={() => { setActiveTab('manage_movies'); clearMessages(); }}
        >
          <ListVideo size={20} /> Manage Movies
        </button>

        <button 
          className={`${styles.tabButton} ${activeTab === 'manage_categories' ? styles.activeTab : ''}`}
          onClick={() => { setActiveTab('manage_categories'); clearMessages(); }}
        >
          <Tags size={20} /> Manage Categories
        </button>
      </aside>

      {/* Main Content Area */}
      <main className={styles.mainContent}>
        {message && <div className={styles.success}>{message}</div>}
        {error && <div className={styles.error}>{error}</div>}

        {/* ADD MOVIE TAB */}
        {activeTab === 'add_movie' && (
          <div className={styles.card} style={{ marginTop: message || error ? '20px' : '0' }}>
            <h1 className={styles.title}>Add Movie</h1>
            <p className={styles.subtitle}>Add a new movie by providing its TMDB link and Video source.</p>
            
            <form onSubmit={handleAddMovie} className={styles.form}>
              <div className={styles.inputGroup}>
                <label>TMDB Movie Link</label>
                <input name="tmdbUrl" type="url" placeholder="e.g. https://www.themoviedb.org/movie/245842-ugly" required />
              </div>

              <div className={styles.inputGroup}>
                <label>Video URL (YouTube, Vimeo, MP4)</label>
                <input name="videoUrl" type="url" placeholder="e.g. https://www.youtube.com/watch?v=hot7JzF2JYs" required />
              </div>
              
              <div className={styles.inputGroup}>
                <label>Trailer URL (Optional)</label>
                <input name="trailerUrl" type="url" placeholder="e.g. https://www.youtube.com/watch?v=trailer123" />
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

              <div style={{ display: 'flex', gap: '10px' }}>
                <div className={styles.inputGroup} style={{ flex: 1 }}>
                  <label>Start Time (seconds) - Optional</label>
                  <input name="start_time" type="number" min="0" placeholder="e.g. 10" />
                </div>
                <div className={styles.inputGroup} style={{ flex: 1 }}>
                  <label>End Time (seconds) - Optional</label>
                  <input name="end_time" type="number" min="0" placeholder="e.g. 120" />
                </div>
              </div>

              <button type="submit" disabled={loading} className={styles.button}>
                {loading ? "Processing via TMDB..." : "Add Movie"}
              </button>
            </form>
          </div>
        )}

        {/* MANAGE MOVIES TAB */}
        {activeTab === 'manage_movies' && !editingMovie && (
          <div style={{ marginTop: message || error ? '20px' : '0' }}>
            <h1 className={styles.title}>Manage Movies</h1>
            <p className={styles.subtitle}>Edit or delete existing movies.</p>
            
            {movies.length === 0 ? (
              <p style={{ color: '#888' }}>No movies in database.</p>
            ) : (
              <div className={styles.movieList}>
                {movies.map(movie => (
                  <div key={movie.id} className={styles.movieItem}>
                    <div>
                      <strong style={{ fontSize: '1.1rem' }}>{movie.title}</strong>
                      <span style={{ color: '#888', marginLeft: '10px' }}>({movie.release_year})</span>
                      <div style={{ fontSize: '0.85rem', color: '#aaa', marginTop: '4px' }}>
                        Category: {movie.category}
                      </div>
                    </div>
                    <div className={styles.movieItemActions}>
                      <button 
                        onClick={() => { setEditingMovie(movie); clearMessages(); }}
                        className={styles.editBtn}
                        title="Edit Movie"
                      >
                        <Edit size={18} />
                      </button>
                      <button 
                        onClick={() => handleDeleteMovie(movie.id, movie.title)}
                        className={styles.deleteBtn}
                        title="Delete Movie"
                      >
                        <Trash2 size={18} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* EDIT MOVIE SUB-VIEW */}
        {activeTab === 'manage_movies' && editingMovie && (
          <div className={styles.card} style={{ marginTop: message || error ? '20px' : '0', maxWidth: '800px' }}>
            <h1 className={styles.title}>Edit Movie: {editingMovie.title}</h1>
            <p className={styles.subtitle}>Update the parameters below. TMDB IDs and basic info cannot be modified here.</p>
            
            <form onSubmit={handleEditMovie} className={styles.form}>
              <div className={styles.inputGroup}>
                <label>Title (Override)</label>
                <input name="title" type="text" defaultValue={editingMovie.title} required />
              </div>

              <div className={styles.inputGroup}>
                <label>Video URL</label>
                <input name="videoUrl" type="url" defaultValue={editingMovie.video_url} required />
              </div>
              
              <div className={styles.inputGroup}>
                <label>Trailer URL (Optional)</label>
                <input name="trailerUrl" type="url" defaultValue={editingMovie.trailer_url || ""} />
              </div>
              
              <div className={styles.inputGroup}>
                <label>Category</label>
                <select name="category" defaultValue={editingMovie.category}>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.name}>{cat.name}</option>
                  ))}
                </select>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <div className={styles.inputGroup} style={{ flex: 1 }}>
                  <label>Start Time (seconds) - Optional</label>
                  <input name="start_time" type="number" min="0" defaultValue={editingMovie.start_time || ""} />
                </div>
                <div className={styles.inputGroup} style={{ flex: 1 }}>
                  <label>End Time (seconds) - Optional</label>
                  <input name="end_time" type="number" min="0" defaultValue={editingMovie.end_time || ""} />
                </div>
              </div>

              <div style={{ display: 'flex', gap: '10px' }}>
                <button type="button" onClick={() => setEditingMovie(null)} className={styles.secondaryButton} style={{ flex: 1 }}>
                  Cancel
                </button>
                <button type="submit" disabled={loading} className={styles.button} style={{ flex: 1 }}>
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}

        {/* MANAGE CATEGORIES TAB */}
        {activeTab === 'manage_categories' && (
          <div style={{ marginTop: message || error ? '20px' : '0' }}>
            <h1 className={styles.title}>Manage Categories</h1>
            <p className={styles.subtitle}>Add or delete movie categories.</p>
            
            <form onSubmit={handleAddCategory} className={styles.form} style={{ marginBottom: '30px', flexDirection: 'row', alignItems: 'flex-end', gap: '10px', maxWidth: '600px' }}>
              <div className={styles.inputGroup} style={{ flex: 1, margin: 0 }}>
                <label>New Category Name</label>
                <input name="name" type="text" placeholder="e.g. Action Blockbusters" required />
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
                  <div key={cat.id} className={styles.movieItem} style={{ maxWidth: '600px' }}>
                    <div>
                      <strong style={{ fontSize: '1.1rem' }}>{cat.name}</strong>
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
        )}

      </main>
    </div>
  );
}
