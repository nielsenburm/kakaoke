import type { NoteType } from './NoteType';

export interface LyricToken {
  text: string;
  startMs: number;
  durationMs: number;
  pitch: number;
  noteType: NoteType;
}

export interface LyricLine {
  tokens: LyricToken[];
  startMs: number;
}

export interface LyricTimeline {
  songId: string;
  lines: LyricLine[];
}

export function tokenEndMs(token: LyricToken): number {
  return token.startMs + token.durationMs;
}

export function lineEndMs(line: LyricLine): number {
  const last = line.tokens[line.tokens.length - 1];
  return last ? tokenEndMs(last) : line.startMs;
}
