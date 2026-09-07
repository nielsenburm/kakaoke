import { useState, useEffect, useRef } from 'react';
import type { ScoringState, LineScore } from '../../hooks/useScoring';
import styles from './ScoreDisplay.module.css';

interface ScoreDisplayProps {
  scoring: ScoringState;
  onRestart: () => void;
  onBack: () => void;
}

function ratingLabel(pct: number): string {
  if (pct >= 95) return 'Perfect!';
  if (pct >= 80) return 'Great!';
  if (pct >= 60) return 'Good';
  if (pct >= 40) return 'OK';
  return 'Miss';
}

function ratingClass(pct: number): string {
  if (pct >= 80) return styles.ratingGood;
  if (pct >= 40) return styles.ratingOk;
  return styles.ratingMiss;
}

export function ScoreDisplay({ scoring, onRestart, onBack }: ScoreDisplayProps) {
  if (scoring.isFinished) {
    return <EndScreen scoring={scoring} onRestart={onRestart} onBack={onBack} />;
  }

  return <LiveHUD scoring={scoring} />;
}

function LiveHUD({ scoring }: { scoring: ScoringState }) {
  return (
    <div className={styles.hud}>
      <div className={styles.totalScore}>{scoring.totalPoints.toLocaleString()}</div>
      {scoring.totalPossible > 0 && (
        <div className={styles.percentage}>{scoring.totalPercentage}%</div>
      )}
      <LineNotification lastLineScore={scoring.lastLineScore} />
    </div>
  );
}

function LineNotification({ lastLineScore }: { lastLineScore: LineScore | null }) {
  const [visible, setVisible] = useState<LineScore | null>(null);
  const prevRef = useRef<LineScore | null>(null);

  useEffect(() => {
    if (lastLineScore && lastLineScore !== prevRef.current) {
      prevRef.current = lastLineScore;
      setVisible(lastLineScore);
      const id = setTimeout(() => setVisible(null), 2000);
      return () => clearTimeout(id);
    }
  }, [lastLineScore]);

  if (!visible) return null;

  return (
    <div key={visible.lineIndex} className={`${styles.lineNotification} ${ratingClass(visible.percentage)}`}>
      {ratingLabel(visible.percentage)} {visible.percentage}%
    </div>
  );
}

function EndScreen({ scoring, onRestart, onBack }: { scoring: ScoringState; onRestart: () => void; onBack: () => void }) {
  const pct = scoring.totalPercentage;

  return (
    <div className={styles.endScreen}>
      <div className={styles.endLabel}>Final Score</div>
      <div className={styles.endScore}>{scoring.totalPoints.toLocaleString()}</div>
      <div className={styles.endPossible}>/ {scoring.totalPossible.toLocaleString()}</div>
      <div className={`${styles.endPercentage} ${ratingClass(pct)}`}>{pct}%</div>
      <div className={`${styles.endRating} ${ratingClass(pct)}`}>{ratingLabel(pct)}</div>
      <div className={styles.endActions}>
        <button className={styles.btnPrimary} onClick={onRestart}>Sing Again</button>
        <button className={styles.btnSecondary} onClick={onBack}>Return to Library</button>
      </div>
    </div>
  );
}
