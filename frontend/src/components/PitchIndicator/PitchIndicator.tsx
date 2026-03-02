import { useRef, useState, useEffect } from 'react';
import styles from './PitchIndicator.module.css';

interface PitchIndicatorProps {
  /** Signed semitone diff from useScoring: negative = flat, positive = sharp */
  pitchDiff: number | null;
}

function diffToColorClass(absDiff: number): string {
  if (absDiff <= 0.5) return styles.dotPerfect;
  if (absDiff <= 1.5) return styles.dotClose;
  if (absDiff <= 2.5) return styles.dotMiss;
  return styles.dotWrong;
}

/** Grace period (ms) — dot stays visible after pitch drops out */
const HIDE_DELAY = 200;

export function PitchIndicator({ pitchDiff }: PitchIndicatorProps) {
  const smoothedRef = useRef(0);
  const [visible, setVisible] = useState(false);
  const hideTimer = useRef<ReturnType<typeof setTimeout>>();

  const hasPitch = pitchDiff !== null;

  // Show immediately when pitch arrives, hide after grace period when it drops
  useEffect(() => {
    if (hasPitch) {
      clearTimeout(hideTimer.current);
      setVisible(true);
    } else {
      hideTimer.current = setTimeout(() => setVisible(false), HIDE_DELAY);
    }
    return () => clearTimeout(hideTimer.current);
  }, [hasPitch]);

  if (hasPitch) {
    // Lerp toward the new value — 0.2 keeps it smooth and dampens jitter
    smoothedRef.current += (pitchDiff - smoothedRef.current) * 0.2;
  }

  const displayDiff = smoothedRef.current;
  const colorClass = diffToColorClass(Math.abs(displayDiff));

  // Map pitch diff to vertical offset: 0 = center, ±4 semitones = top/bottom
  // Gauge is 300px tall, ±4 semitone range → 37.5px per semitone
  const clampedDiff = Math.max(-4, Math.min(4, displayDiff));
  const dotOffset = -clampedDiff * 37.5;

  return (
    <div className={styles.gauge}>
      {/* Colored zone bands */}
      <div className={styles.zones}>
        <div className={`${styles.zone} ${styles.zoneDim}`} />
        <div className={`${styles.zone} ${styles.zoneMiss}`} />
        <div className={`${styles.zone} ${styles.zoneClose}`} />
        <div className={`${styles.zone} ${styles.zonePerfect}`} />
        <div className={`${styles.zone} ${styles.zoneClose}`} />
        <div className={`${styles.zone} ${styles.zoneMiss}`} />
        <div className={`${styles.zone} ${styles.zoneDim}`} />
      </div>

      {/* Center target line */}
      <div className={styles.targetLine} />

      {/* Singer's pitch dot — always mounted, opacity-driven visibility */}
      <div
        className={`${styles.dot} ${colorClass}`}
        style={{
          transform: `translate(-50%, -50%) translateY(${dotOffset}px)`,
          opacity: visible ? 1 : 0,
        }}
      />
    </div>
  );
}
