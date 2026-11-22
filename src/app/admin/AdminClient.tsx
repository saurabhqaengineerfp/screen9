"use client";

import { useState } from "react";
import { addMovie, deleteMovie, updateMovie } from "./actions";
import styles from "./admin.module.css";
import { Trash2, Edit, PlusCircle, ListVideo, Tags } from "lucide-react";
import { getWatchMode } from "@/utils/movieHelpers";

type Tab = "add_movie" | "manage_movies" | "manage_categories";

export default function AdminClient({
  initialMovies,
  initialCategories,
}: {
  initialMovies: any[];
  initialCategories: any[];
}) {
  const [activeTab, setActiveTab] = useState<Tab>("add_movie");
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
        setMessage(
          `Added "${res.title}" (${res.watchMode === "ott" ? "Partner OTT + Trailer" : "Free Official Embed"}). Refresh to see it in Manage.`
        );
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
        setMessage(`Updated "${res.title}".`);
        setMovies(movies.map((m) => (m.id === editingMovie.id ? { ...m, ...res.movie } : m)));
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
        setMessage(`Added category "${res.name}".`);
        window.location.reload();
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setCatLoading(false);
    }
  };

  const handleDeleteCategory = async (id: string, name: string) => {
    if (!confirm(`Delete category "${name}"?`)) return;
    clearMessages();
    try {
      await (await import("./actions")).deleteCategory(id);
      setCategories(categories.filter((c) => c.id !== id));
      setMessage(`Deleted category "${name}".`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  const handleDeleteMovie = async (id: string, title: string) => {
    if (!confirm(`Delete "${title}"?`)) return;
    clearMessages();
    try {
      await deleteMovie(id);
      setMovies(movies.filter((m) => m.id !== id));
      setMessage(`Deleted "${title}".`);
    } catch (err: any) {
      setError(err.message);
    }
  };

  return (
    <div className={styles.dashboard}>
      <aside className={styles.sidebar}>
        <div className={styles.brand}>
          <span className={styles.brandDot} />
          <span>
            SCREEN<span className={styles.brandAccent}>9</span> / ADMIN
          </span>
        </div>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "add_movie" ? styles.activeTab : ""}`}
          onClick={() => {
            setActiveTab("add_movie");
            clearMessages();
            setEditingMovie(null);
          }}
        >
          <PlusCircle size={16} /> Add Film
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "manage_movies" ? styles.activeTab : ""}`}
          onClick={() => {
            setActiveTab("manage_movies");
            clearMessages();
          }}
        >
          <ListVideo size={16} /> Manage Catalog ({movies.length})
        </button>

        <button
          type="button"
          className={`${styles.tabButton} ${activeTab === "manage_categories" ? styles.activeTab : ""}`}
          onClick={() => {
            setActiveTab("manage_categories");
            clearMessages();
          }}
        >
          <Tags size={16} /> Categories ({categories.length})
        </button>
      </aside>

      <main className={styles.mainContent}>
        {message && <div className={styles.success}>{message}</div>}
        {error && <div className={styles.error}>{error}</div>}

        {activeTab === "add_movie" && (
          <div className={styles.card}>
            <h1 className={styles.title}>Curate a Film</h1>
            <p className={styles.subtitle}>
              Paste a TMDB link to auto-fetch metadata, official trailer, and multi-region Watch Providers. Leave the Full-Movie URL blank for Partner OTT titles.
            </p>

            <form onSubmit={handleAddMovie} className={styles.form}>
              <div className={styles.inputGroup}>
                <label>TMDB Movie URL *</label>
                <input
                  name="tmdbUrl"
                  type="url"
                  placeholder="https://www.themoviedb.org/movie/496243-parasite"
                  required
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Official Full-Movie URL (Optional — YouTube / Vimeo)</label>
                <input
                  name="videoUrl"
                  type="url"
                  placeholder="Leave blank for OTT-only films; paste official free YouTube/Vimeo link if available"
                />
              </div>

              <div className={styles.rowTwo}>
                <div className={styles.inputGroup}>
                  <label>Official Source Channel (Optional)</label>
                  <input
                    name="source_channel"
                    type="text"
                    placeholder="e.g. Shemaroo, NFDC, Director Channel"
                  />
                </div>
                <div className={styles.inputGroup}>
                  <label>Trailer URL Override (Auto-fetched from TMDB)</label>
                  <input
                    name="trailerUrl"
                    type="url"
                    placeholder="Optional override"
                  />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Curator Note (Why this film made the cut)</label>
                <textarea
                  name="curator_note"
                  rows={2}
                  placeholder="A razor-sharp 1–2 line editorial note shown in the hero and film details..."
                />
              </div>

              <div className={styles.inputGroup}>
                <label>Category (Auto-assigned from TMDB if blank)</label>
                <select name="category" defaultValue="">
                  <option value="">-- Auto-Assign --</option>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.rowTwo}>
                <div className={styles.inputGroup}>
                  <label>Country Override (Auto-fetched)</label>
                  <input name="country" type="text" placeholder="e.g. Japan, France, India" />
                </div>
                <div className={styles.inputGroup}>
                  <label>Era Override (Auto-fetched)</label>
                  <input name="period" type="text" placeholder="e.g. 1990s" />
                </div>
              </div>

              <div className={styles.rowTwo}>
                <div className={styles.inputGroup}>
                  <label>Start Time (sec)</label>
                  <input name="start_time" type="number" min="0" placeholder="Optional" />
                </div>
                <div className={styles.inputGroup}>
                  <label>End Time (sec)</label>
                  <input name="end_time" type="number" min="0" placeholder="Optional" />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Extra Tags (Comma separated)</label>
                <input name="tags" type="text" placeholder="e.g. Neo-Noir, Palme d'Or, Slow Burn" />
              </div>

              <button type="submit" disabled={loading} className={styles.button}>
                {loading ? "Fetching from TMDB..." : "Add Film to Screen9"}
              </button>
            </form>
          </div>
        )}

        {activeTab === "manage_movies" && !editingMovie && (
          <div>
            <h1 className={styles.title}>Manage Catalog</h1>
            <p className={styles.subtitle}>Edit curator notes, official embed links, or remove titles.</p>

            {movies.length === 0 ? (
              <p className={styles.empty}>No films in database yet.</p>
            ) : (
              <div className={styles.movieList}>
                {movies.map((movie) => {
                  const mode = getWatchMode(movie);
                  const isFree = mode === "embed" || mode === "native";
                  return (
                    <div key={movie.id} className={styles.movieItem}>
                      <div>
                        <div className={styles.movieItemTop}>
                          <strong>{movie.title}</strong>
                          <span className={styles.monoMeta}>({movie.release_year || "—"})</span>
                          <span className={isFree ? styles.pillFree : styles.pillOtt}>
                            {isFree ? "● FREE" : "OTT"}
                          </span>
                        </div>
                        <div className={styles.monoSub}>
                          {movie.category || "Uncategorized"}
                          {movie.country ? ` · ${movie.country}` : ""}
                          {movie.source_channel ? ` · ${movie.source_channel}` : ""}
                        </div>
                      </div>
                      <div className={styles.movieItemActions}>
                        <button
                          type="button"
                          onClick={() => {
                            setEditingMovie(movie);
                            clearMessages();
                          }}
                          className={styles.editBtn}
                          title="Edit Film"
                        >
                          <Edit size={16} />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteMovie(movie.id, movie.title)}
                          className={styles.deleteBtn}
                          title="Delete Film"
                        >
                          <Trash2 size={16} />
                        </button>
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>
        )}

        {activeTab === "manage_movies" && editingMovie && (
          <div className={styles.card}>
            <h1 className={styles.title}>Edit: {editingMovie.title}</h1>
            <p className={styles.subtitle}>Update playback source, curator note, or metadata.</p>

            <form onSubmit={handleEditMovie} className={styles.form}>
              <div className={styles.inputGroup}>
                <label>Title</label>
                <input name="title" type="text" defaultValue={editingMovie.title} required />
              </div>

              <div className={styles.inputGroup}>
                <label>Official Full-Movie URL (Leave blank for OTT-only)</label>
                <input name="videoUrl" type="url" defaultValue={editingMovie.video_url || ""} />
              </div>

              <div className={styles.rowTwo}>
                <div className={styles.inputGroup}>
                  <label>Official Source Channel</label>
                  <input name="source_channel" type="text" defaultValue={editingMovie.source_channel || ""} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Trailer URL</label>
                  <input name="trailerUrl" type="url" defaultValue={editingMovie.trailer_url || ""} />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Curator Note</label>
                <textarea name="curator_note" rows={2} defaultValue={editingMovie.curator_note || ""} />
              </div>

              <div className={styles.inputGroup}>
                <label>Category</label>
                <select name="category" defaultValue={editingMovie.category || ""}>
                  {categories.map((cat) => (
                    <option key={cat.id} value={cat.name}>
                      {cat.name}
                    </option>
                  ))}
                </select>
              </div>

              <div className={styles.rowTwo}>
                <div className={styles.inputGroup}>
                  <label>Country</label>
                  <input name="country" type="text" defaultValue={editingMovie.country || ""} />
                </div>
                <div className={styles.inputGroup}>
                  <label>Era</label>
                  <input name="period" type="text" defaultValue={editingMovie.period || ""} />
                </div>
              </div>

              <div className={styles.rowTwo}>
                <div className={styles.inputGroup}>
                  <label>Start Time (sec)</label>
                  <input name="start_time" type="number" min="0" defaultValue={editingMovie.start_time || ""} />
                </div>
                <div className={styles.inputGroup}>
                  <label>End Time (sec)</label>
                  <input name="end_time" type="number" min="0" defaultValue={editingMovie.end_time || ""} />
                </div>
              </div>

              <div className={styles.inputGroup}>
                <label>Tags (Comma separated)</label>
                <input
                  name="tags"
                  type="text"
                  defaultValue={editingMovie.tags ? editingMovie.tags.join(", ") : ""}
                />
              </div>

              <div className={styles.rowTwo}>
                <button
                  type="button"
                  onClick={() => setEditingMovie(null)}
                  className={styles.secondaryButton}
                >
                  Cancel
                </button>
                <button type="submit" disabled={loading} className={styles.button}>
                  {loading ? "Saving..." : "Save Changes"}
                </button>
              </div>
            </form>
          </div>
        )}

        {activeTab === "manage_categories" && (
          <div>
            <h1 className={styles.title}>Categories</h1>
            <p className={styles.subtitle}>Create or remove curated categories.</p>

            <form onSubmit={handleAddCategory} className={styles.catForm}>
              <input name="name" type="text" placeholder="e.g. World Cinema Classics" required />
              <button type="submit" disabled={catLoading} className={styles.button}>
                {catLoading ? "Adding..." : "Add"}
              </button>
            </form>

            <div className={styles.movieList}>
              {categories.map((cat) => (
                <div key={cat.id} className={styles.movieItem}>
                  <strong>{cat.name}</strong>
                  <button
                    type="button"
                    onClick={() => handleDeleteCategory(cat.id, cat.name)}
                    className={styles.deleteBtn}
                    title="Delete Category"
                  >
                    <Trash2 size={16} />
                  </button>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
