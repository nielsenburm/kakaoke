import type { LyricTimeline, LyricLine } from '../../model/LyricTimeline';
import { lineEndMs, tokenEndMs } from '../../model/LyricTimeline';
import type { SyncState } from './useLyricsSync';
import styles from './LyricsRenderer.module.css';

interface LyricsRendererProps {
  timeline: LyricTimeline;
  sync: SyncState;
  currentTimeMs: number;
  /** Per-token accuracy (0-100) for the current line, from useScoring */
  tokenScores?: Map<number, number> | null;
}

export function LyricsRenderer({ timeline, sync, currentTimeMs, tokenScores }: LyricsRendererProps) {
  const currIdx = sync.activeLineIndex;
  const nextIdx = currIdx >= 0 && currIdx < timeline.lines.length - 1 ? currIdx + 1 : -1;

  // Compute whether we're singing directly from currentTimeMs (avoids rAF timing lag)
  const currLine = currIdx >= 0 ? timeline.lines[currIdx] : null;
  const singing = currLine ? currentTimeMs >= currLine.startMs && currentTimeMs <= lineEndMs(currLine) : false;

  // Compute countdown progress (0→1) during the gap before a line starts
  let countdownProgress = -1;
  if (currIdx >= 0 && !singing) {
    const line = timeline.lines[currIdx];
    const prevEnd = currIdx > 0 ? lineEndMs(timeline.lines[currIdx - 1]) : Math.max(0, line.startMs - 3000);
    const gapMs = line.startMs - prevEnd;
    if (gapMs > 0) {
      countdownProgress = Math.max(0, Math.min(1, (currentTimeMs - prevEnd) / gapMs));
    }
  }

  return (
    <div className={styles.stage}>
      {currIdx >= 0 && (
        <div key={`line-${currIdx}`} className={styles.currentLine}>
          <div className={styles.countdown} style={countdownProgress >= 0 ? undefined : { visibility: 'hidden' }}>
            <div className={styles.countdownFill} style={{ transform: `scaleX(${Math.max(0, countdownProgress)})` }} />
          </div>
          <div>{renderTokens(timeline.lines[currIdx], sync, currentTimeMs, singing, tokenScores)}</div>
        </div>
      )}
      {nextIdx >= 0 && (
        <div key={`line-${nextIdx}`} className={styles.nextLine}>{timeline.lines[nextIdx].tokens.map((t, i) => (
            <span key={i} className={styles.token}>{t.text}</span>
          ))}</div>
      )}
    </div>
  );
}

function scoreClass(pct: number): string {
  if (pct >= 70) return styles.tokenGood;
  if (pct >= 40) return styles.tokenClose;
  return styles.tokenMiss;
}

function renderTokens(
  line: LyricLine,
  sync: SyncState,
  currentTimeMs: number,
  singing: boolean,
  tokenScores?: Map<number, number> | null,
) {
  return line.tokens.map((token, tokenIdx) => {
    let tokenClass = styles.token;
    if (singing) {
      if (tokenIdx === sync.activeTokenIndex) {
        tokenClass += ` ${styles.activeToken}`;
      } else if (
        tokenIdx < sync.activeTokenIndex ||
        currentTimeMs > tokenEndMs(token)
      ) {
        // Past token: use score-based color if available
        const score = tokenScores?.get(tokenIdx);
        if (score !== undefined) {
          tokenClass += ` ${scoreClass(score)}`;
        } else {
          tokenClass += ` ${styles.pastToken}`;
        }
      }
    }
    return <span key={tokenIdx} className={tokenClass}>{token.text}</span>;
  });
}
