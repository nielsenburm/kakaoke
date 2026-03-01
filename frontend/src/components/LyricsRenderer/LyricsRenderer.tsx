import type { LyricTimeline, LyricLine } from '../../model/LyricTimeline';
import { lineEndMs, tokenEndMs } from '../../model/LyricTimeline';
import type { SyncState } from './useLyricsSync';
import styles from './LyricsRenderer.module.css';

interface LyricsRendererProps {
  timeline: LyricTimeline;
  sync: SyncState;
  currentTimeMs: number;
}

export function LyricsRenderer({ timeline, sync, currentTimeMs }: LyricsRendererProps) {
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
          {countdownProgress >= 0 && (
            <div className={styles.countdown}>
              <div className={styles.countdownFill} style={{ transform: `scaleX(${countdownProgress})` }} />
            </div>
          )}
          <div>{renderTokens(timeline.lines[currIdx], sync, currentTimeMs, singing)}</div>
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

function renderTokens(line: LyricLine, sync: SyncState, currentTimeMs: number, singing: boolean) {
  return line.tokens.map((token, tokenIdx) => {
    let tokenClass = styles.token;
    if (singing) {
      if (tokenIdx === sync.activeTokenIndex) {
        tokenClass += ` ${styles.activeToken}`;
      } else if (
        tokenIdx < sync.activeTokenIndex ||
        currentTimeMs > tokenEndMs(token)
      ) {
        tokenClass += ` ${styles.pastToken}`;
      }
    }
    return <span key={tokenIdx} className={tokenClass}>{token.text}</span>;
  });
}
