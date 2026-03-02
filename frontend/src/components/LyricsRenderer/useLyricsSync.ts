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
  _isPlaying: boolean,
): SyncState {
  const [state, setState] = useState<SyncState>({
    activeLineIndex: -1,
    activeTokenIndex: -1,
    isSinging: false,
  });
  const rafRef = useRef<number>(0);
  const prevRef = useRef<SyncState>({ activeLineIndex: -1, activeTokenIndex: -1, isSinging: false });
  // Use refs for values read inside rAF to keep the tick callback stable
  const timelineRef = useRef(timeline);
  timelineRef.current = timeline;
  const getTimeMsRef = useRef(getCurrentTimeMs);
  getTimeMsRef.current = getCurrentTimeMs;

  useEffect(() => {
    let active = true;

    function tick() {
      if (!active) return;

      const tl = timelineRef.current;
      if (!tl) {
        rafRef.current = requestAnimationFrame(tick);
        return;
      }

      const t = getTimeMsRef.current();
      let lineIdx = -1;
      let tokenIdx = -1;
      let singing = false;

      for (let i = 0; i < tl.lines.length; i++) {
        const line = tl.lines[i];
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
        if (t < line.startMs) {
          lineIdx = i;
          break;
        }
      }

      const prev = prevRef.current;
      if (prev.activeLineIndex !== lineIdx || prev.activeTokenIndex !== tokenIdx || prev.isSinging !== singing) {
        const next = { activeLineIndex: lineIdx, activeTokenIndex: tokenIdx, isSinging: singing };
        prevRef.current = next;
        setState(next);
      }

      rafRef.current = requestAnimationFrame(tick);
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      active = false;
      cancelAnimationFrame(rafRef.current);
    };
  }, []); // stable — reads timeline and getTimeMs from refs

  return state;
}
