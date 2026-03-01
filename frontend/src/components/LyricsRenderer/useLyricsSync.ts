import { useState, useEffect, useRef, useCallback } from 'react';
import type { LyricTimeline } from '../../model/LyricTimeline';
import { lineEndMs, tokenEndMs } from '../../model/LyricTimeline';

export interface SyncState {
  activeLineIndex: number;
  activeTokenIndex: number;
  isSinging: boolean;
}

export function useLyricsSync(
  timeline: LyricTimeline | null,
  getCurrentTimeMs: () => number,
  isPlaying: boolean,
): SyncState {
  const [state, setState] = useState<SyncState>({
    activeLineIndex: -1,
    activeTokenIndex: -1,
    isSinging: false,
  });
  const rafRef = useRef<number>(0);
  const prevRef = useRef<SyncState>({ activeLineIndex: -1, activeTokenIndex: -1, isSinging: false });

  const tick = useCallback(() => {
    if (!timeline) {
      rafRef.current = requestAnimationFrame(tick);
      return;
    }

    const t = getCurrentTimeMs();
    let lineIdx = -1;
    let tokenIdx = -1;
    let singing = false;

    for (let i = 0; i < timeline.lines.length; i++) {
      const line = timeline.lines[i];
      const end = lineEndMs(line);
      if (t >= line.startMs && t <= end) {
        lineIdx = i;
        singing = true;
        for (let j = 0; j < line.tokens.length; j++) {
          const token = line.tokens[j];
          if (t >= token.startMs && t < tokenEndMs(token)) {
            tokenIdx = j;
            break;
          }
        }
        break;
      }
      // If we're between lines, show the upcoming line
      if (t < line.startMs) {
        lineIdx = i;
        break;
      }
    }

    // Only update state if something changed (avoids re-renders)
    const prev = prevRef.current;
    if (prev.activeLineIndex !== lineIdx || prev.activeTokenIndex !== tokenIdx || prev.isSinging !== singing) {
      const next = { activeLineIndex: lineIdx, activeTokenIndex: tokenIdx, isSinging: singing };
      prevRef.current = next;
      setState(next);
    }

    rafRef.current = requestAnimationFrame(tick);
  }, [timeline, getCurrentTimeMs]);

  useEffect(() => {
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [tick]);

  return state;
}
