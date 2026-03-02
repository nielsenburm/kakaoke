import { useState, useRef, useCallback } from 'react';
import type { LyricTimeline } from '../model/LyricTimeline';
import { lineEndMs, tokenEndMs } from '../model/LyricTimeline';
import { NoteType } from '../model/NoteType';

export interface LineScore {
  lineIndex: number;
  pointsEarned: number;
  pointsPossible: number;
  percentage: number; // 0-100
}

export interface ScoringState {
  lastLineScore: LineScore | null;
  lineScores: LineScore[];
  totalPoints: number;
  totalPossible: number;
  totalPercentage: number;
  isFinished: boolean;
  /** Signed semitone difference for current token (-6 to +6), null if not singing or silent */
  currentPitchDiff: number | null;
  /** Per-token accuracy (0-100) for the currently accumulating line */
  currentLineTokenScores: Map<number, number>;
  /** Call to reset all scoring state (e.g. on restart) */
  reset: () => void;
}

/** Points-per-ms multiplier by note type. Freestyle = 0 (not scored). */
function noteWeight(noteType: NoteType): number {
  switch (noteType) {
    case NoteType.Golden:
    case NoteType.RapGolden:
      return 2;
    case NoteType.Normal:
    case NoteType.Rap:
      return 1;
    case NoteType.Freestyle:
      return 0;
  }
}

/** Whether this note type requires pitch accuracy (vs just detecting sound). */
function requiresPitch(noteType: NoteType): boolean {
  return noteType === NoteType.Normal || noteType === NoteType.Golden;
}

/**
 * Signed semitone difference between detected and expected pitch (pitch class mod 12).
 * Positive = singer is sharp, negative = singer is flat. Range: -6 to +6.
 */
export function pitchDiffSemitones(detected: number, expected: number): number {
  const detectedClass = ((detected % 12) + 12) % 12;
  const expectedClass = ((expected % 12) + 12) % 12;
  const raw = detectedClass - expectedClass;
  // Wrap to range -6..+5 (shortest distance around the pitch-class circle)
  return ((raw + 6) % 12 + 12) % 12 - 6;
}

/**
 * Compare detected and expected pitch using pitch class (mod 12).
 * This naturally handles octave errors from autocorrelation.
 */
function isPitchMatch(detected: number, expected: number, tolerance = 2): boolean {
  return Math.abs(pitchDiffSemitones(detected, expected)) <= tolerance;
}

interface TokenAccum {
  hits: number;
  total: number;
}

interface Accumulator {
  lineIndex: number;
  tokens: Map<number, TokenAccum>;
}

export function useScoring(
  timeline: LyricTimeline | null,
  currentTimeMs: number,
  detectedPitch: number | null,
  isMicActive: boolean,
  pitchTolerance = 2,
): ScoringState {
  const [lineScores, setLineScores] = useState<LineScore[]>([]);
  const [lastLineScore, setLastLineScore] = useState<LineScore | null>(null);

  const accumRef = useRef<Accumulator>({ lineIndex: -1, tokens: new Map() });
  const scoredLinesRef = useRef<Set<number>>(new Set());
  const prevTimeRef = useRef(0);

  const reset = useCallback(() => {
    setLineScores([]);
    setLastLineScore(null);
    accumRef.current = { lineIndex: -1, tokens: new Map() };
    scoredLinesRef.current = new Set();
    prevTimeRef.current = 0;
  }, []);

  // Detect seek backward → reset affected lines
  if (currentTimeMs < prevTimeRef.current - 500 && timeline) {
    // Jumped backward significantly — reset scores for lines after the new position
    const newScored = new Set<number>();
    const kept: LineScore[] = [];
    for (const ls of lineScores) {
      const line = timeline.lines[ls.lineIndex];
      if (line && lineEndMs(line) <= currentTimeMs) {
        newScored.add(ls.lineIndex);
        kept.push(ls);
      }
    }
    if (kept.length !== lineScores.length) {
      scoredLinesRef.current = newScored;
      setLineScores(kept);
      setLastLineScore(kept.length > 0 ? kept[kept.length - 1] : null);
    }
    accumRef.current = { lineIndex: -1, tokens: new Map() };
  }
  prevTimeRef.current = currentTimeMs;

  // Main scoring logic — runs on every render (driven by currentTimeMs updates ~60fps)
  if (timeline && isMicActive) {
    // Find which line and token we're currently in
    let currLineIdx = -1;
    let currTokenIdx = -1;

    for (let i = 0; i < timeline.lines.length; i++) {
      const line = timeline.lines[i];
      const end = lineEndMs(line);
      if (currentTimeMs >= line.startMs && currentTimeMs <= end) {
        currLineIdx = i;
        for (let j = 0; j < line.tokens.length; j++) {
          if (currentTimeMs >= line.tokens[j].startMs && currentTimeMs < tokenEndMs(line.tokens[j])) {
            currTokenIdx = j;
            break;
          }
        }
        break;
      }
      if (currentTimeMs < line.startMs) break;
    }

    // If we moved to a new line, score the previous line first
    const accum = accumRef.current;
    if (accum.lineIndex >= 0 && accum.lineIndex !== currLineIdx && !scoredLinesRef.current.has(accum.lineIndex)) {
      const scoredLine = timeline.lines[accum.lineIndex];
      if (scoredLine) {
        let earned = 0;
        let possible = 0;
        for (let j = 0; j < scoredLine.tokens.length; j++) {
          const token = scoredLine.tokens[j];
          const w = noteWeight(token.noteType);
          if (w === 0) continue;
          const tokenPossible = w * token.durationMs;
          possible += tokenPossible;
          const ta = accum.tokens.get(j);
          if (ta && ta.total > 0) {
            earned += tokenPossible * (ta.hits / ta.total);
          }
        }
        const ls: LineScore = {
          lineIndex: accum.lineIndex,
          pointsEarned: Math.round(earned),
          pointsPossible: Math.round(possible),
          percentage: possible > 0 ? Math.round((earned / possible) * 100) : 100,
        };
        scoredLinesRef.current.add(accum.lineIndex);
        setLineScores((prev) => [...prev, ls]);
        setLastLineScore(ls);
      }
    }

    // Reset accumulator if we changed lines
    if (accum.lineIndex !== currLineIdx) {
      accumRef.current = { lineIndex: currLineIdx, tokens: new Map() };
    }

    // Sample the current token — only count frames where we actually detected pitch.
    // This avoids penalising the singer for frames where autocorrelation returned null
    // (silence between syllables, breathing, detection dropout).
    if (currLineIdx >= 0 && currTokenIdx >= 0 && detectedPitch !== null) {
      const token = timeline.lines[currLineIdx].tokens[currTokenIdx];
      const w = noteWeight(token.noteType);
      if (w > 0) {
        const acc = accumRef.current;
        let ta = acc.tokens.get(currTokenIdx);
        if (!ta) {
          ta = { hits: 0, total: 0 };
          acc.tokens.set(currTokenIdx, ta);
        }
        ta.total++;
        if (requiresPitch(token.noteType)) {
          if (isPitchMatch(detectedPitch, token.pitch, pitchTolerance)) {
            ta.hits++;
          }
        } else {
          // Rap notes: any sound = hit
          ta.hits++;
        }
      }
    }
  }

  // Compute current pitch difference for the live indicator
  let currentPitchDiff: number | null = null;
  if (timeline && isMicActive && detectedPitch !== null) {
    // Find the current token to compare against
    for (let i = 0; i < timeline.lines.length; i++) {
      const line = timeline.lines[i];
      const end = lineEndMs(line);
      if (currentTimeMs >= line.startMs && currentTimeMs <= end) {
        for (let j = 0; j < line.tokens.length; j++) {
          const token = line.tokens[j];
          if (currentTimeMs >= token.startMs && currentTimeMs < tokenEndMs(token)) {
            if (requiresPitch(token.noteType)) {
              currentPitchDiff = pitchDiffSemitones(detectedPitch, token.pitch);
            }
            break;
          }
        }
        break;
      }
      if (currentTimeMs < line.startMs) break;
    }
  }

  // Build per-token accuracy map for the current accumulating line
  const currentLineTokenScores = new Map<number, number>();
  const currAccum = accumRef.current;
  if (currAccum.lineIndex >= 0) {
    currAccum.tokens.forEach((ta, tokenIdx) => {
      if (ta.total > 0) {
        currentLineTokenScores.set(tokenIdx, Math.round((ta.hits / ta.total) * 100));
      }
    });
  }

  // Compute totals
  const totalPoints = lineScores.reduce((s, l) => s + l.pointsEarned, 0);
  const totalPossible = lineScores.reduce((s, l) => s + l.pointsPossible, 0);
  const totalPercentage = totalPossible > 0 ? Math.round((totalPoints / totalPossible) * 100) : 0;

  // Check if finished: all lines that have scoreable notes have been scored
  let isFinished = false;
  if (timeline && isMicActive && timeline.lines.length > 0) {
    const lastLine = timeline.lines[timeline.lines.length - 1];
    isFinished = currentTimeMs > lineEndMs(lastLine) && scoredLinesRef.current.size > 0;
  }

  return {
    lastLineScore, lineScores, totalPoints, totalPossible, totalPercentage, isFinished,
    currentPitchDiff, currentLineTokenScores, reset,
  };
}
