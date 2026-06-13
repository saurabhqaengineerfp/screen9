import styles from './movies.module.css';

export default function MoviesPage() {
  const categories = [
    { name: "Trending", id: "trending" },
    { name: "Action", id: "action" },
    { name: "Sci-Fi", id: "scifi" },
  ];

  return (
    <div className={styles.container}>
      <h1 className={styles.title}>All Movies</h1>
      
      {categories.map(category => (
        <div key={category.id} className={styles.categoryRow}>
          <h2 className={styles.categoryTitle}>{category.name}</h2>
          <div className={styles.grid}>
             {/* Placeholders for movies */}
             {[1, 2, 3, 4, 5, 6].map((i) => (
               <div key={i} className={styles.placeholderCard}>
                 <span>Movie {i}</span>
               </div>
             ))}
          </div>
        </div>
      ))}
    </div>
  );
}
