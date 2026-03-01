import { useEffect, useState } from 'react';
import styles from './SplashScreen.module.css';

type Phase = 'visible' | 'shrinking' | 'hidden';

export function SplashScreen() {
  const [phase, setPhase] = useState<Phase>('visible');

  useEffect(() => {
    const shrinkTimer = setTimeout(() => setPhase('shrinking'), 1500);
    const hideTimer = setTimeout(() => setPhase('hidden'), 2300);
    return () => {
      clearTimeout(shrinkTimer);
      clearTimeout(hideTimer);
    };
  }, []);

  if (phase === 'hidden') return null;

  const isShrinking = phase === 'shrinking';

  return (
    <>
      <div className={`${styles.overlay} ${isShrinking ? styles.overlayFading : ''}`} />
      <img
        src="/logo.png"
        alt="KAKAoke"
        className={`${styles.logo} ${isShrinking ? styles.logoShrinking : ''}`}
      />
    </>
  );
}
