"use client";

import { useState } from "react";
import { loginAdmin } from "./actions";
import styles from "./admin.module.css";

export default function AdminLogin() {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    const formData = new FormData(e.currentTarget);
    const password = formData.get("password") as string;
    
    try {
      await loginAdmin(password);
      // Reload page to re-check cookies on server
      window.location.reload();
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className={styles.container}>
      <div className={styles.card} style={{ maxWidth: '400px' }}>
        <h1 className={styles.title}>Admin Login</h1>
        
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputGroup}>
            <label>Password</label>
            <input 
              name="password" 
              type="password" 
              required 
            />
          </div>

          <button type="submit" disabled={loading} className={styles.button}>
            {loading ? "Verifying..." : "Login"}
          </button>
        </form>
        {error && <div className={styles.error}>{error}</div>}
      </div>
    </div>
  );
}
