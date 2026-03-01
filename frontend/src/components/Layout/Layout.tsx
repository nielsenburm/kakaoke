import { Link, Outlet, useLocation } from 'react-router-dom';
import styles from './Layout.module.css';

export function Layout() {
  const { pathname } = useLocation();
  const isLibrary = pathname === '/';

  return (
    <div className={styles.layout}>
      <nav className={styles.nav}>
        <Link to="/" className={styles.logo}>
            <img src="/logo.png" alt="KAKAoke" className={styles.logoImg} />
        </Link>
        {isLibrary && <Link to="/import" className={styles.navLink}>Import</Link>}
      </nav>
      <main className={styles.content}>
        <Outlet />
      </main>
    </div>
  );
}
