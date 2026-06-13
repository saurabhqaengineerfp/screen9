import { login, signup } from './actions';
import styles from './login.module.css';

export default function LoginPage() {
  return (
    <div className={styles.container}>
      <div className={`glass-panel animate-fade-in ${styles.formCard}`}>
        <h1 className={styles.title}>Welcome Back</h1>
        <p className={styles.subtitle}>Sign in to continue to Screen9</p>
        
        <form className={styles.form}>
          <div className={styles.inputGroup}>
            <label htmlFor="email">Email Address</label>
            <input
              className="input-field"
              id="email"
              name="email"
              type="email"
              placeholder="you@example.com"
              required
            />
          </div>
          
          <div className={styles.inputGroup}>
            <label htmlFor="password">Password</label>
            <input
              className="input-field"
              id="password"
              name="password"
              type="password"
              placeholder="••••••••"
              required
            />
          </div>
          
          <div className={styles.actions}>
            <button formAction={login} className="btn-primary" style={{ width: '100%' }}>
              Log In
            </button>
            
            <div className={styles.divider}>
              <span>or</span>
            </div>
            
            <button formAction={signup} className={styles.secondaryBtn}>
              Create an Account
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
