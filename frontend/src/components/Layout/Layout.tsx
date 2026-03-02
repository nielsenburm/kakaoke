import { Link, Outlet, useLocation } from 'react-router-dom';
import { useAuth } from '../../context/AuthContext';
import styles from './Layout.module.css';

export function Layout() {
  const { pathname } = useLocation();
  const { user, logout } = useAuth();
  const isLibrary = pathname === '/';

  return (
    <div className={styles.layout}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.logo}>
            <img src="/logo.png" alt="KAKAoke" className={styles.logoImg} />
        </Link>
        <div className={styles.navLinks}>
          {isLibrary && <Link to="/import" className={styles.navLink}>Import</Link>}
          <Link to="/settings" className={styles.navLink} title="Settings">
            <GearIcon />
          </Link>
          {user && (
            <div className={styles.userArea}>
              <span className={styles.username}>{user.username}</span>
              <button className={styles.logoutBtn} onClick={logout}>Logout</button>
            </div>
          )}
        </div>
      </nav>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}

function GearIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 1 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 1 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 1 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 1 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1z" />
    </svg>
  );
}
