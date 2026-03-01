export interface UltraStarHeaders {
  title: string;
  artist: string;
  bpm: number;
  gap: number;
  mp3: string | null;
  video: string | null;
  cover: string | null;
  background: string | null;
  year: number | null;
  language: string | null;
  genre: string | null;
  edition: string | null;
  creator: string | null;
  encoding: string | null;
}

export interface UltraStarNote {
  noteType: string;
  beat: number;
  duration: number;
  pitch: number;
  text: string;
}

export type UltraStarEvent =
  | { kind: 'note'; note: UltraStarNote }
  | { kind: 'lineBreak'; beat: number }
  | { kind: 'end' };

export interface UltraStarFile {
  headers: UltraStarHeaders;
  events: UltraStarEvent[];
}

/** UltraStar BPM is quarter-notes per minute. One beat = 15000/BPM ms. */
export function beatToMs(beat: number, bpm: number, gap: number): number {
  return beat * (15000 / bpm) + gap;
}

export function beatDurationToMs(duration: number, bpm: number): number {
  return duration * (15000 / bpm);
}

/** Parse a European decimal string like "168,7" into a number. */
function parseEuropeanFloat(s: string): number {
  return parseFloat(s.replace(',', '.'));
}

export function parseUltraStarTxt(text: string): UltraStarFile {
  const lines = text.split('\n');

  const rawHeaders: Record<string, string> = {};
  const events: UltraStarEvent[] = [];

  for (const rawLine of lines) {
    const line = rawLine.replace(/\r$/, '');
    if (!line) continue;

    if (line.startsWith('#')) {
      const colonIdx = line.indexOf(':');
      if (colonIdx !== -1) {
        const key = line.substring(1, colonIdx).toUpperCase();
        const value = line.substring(colonIdx + 1);
        rawHeaders[key] = value;
      }
      continue;
    }

    if (line === 'E') {
      events.push({ kind: 'end' });
      continue;
    }

    const type = line[0];

    if (type === '-') {
      const beat = parseInt(line.substring(1).trim().split(/\s+/)[0], 10);
      events.push({ kind: 'lineBreak', beat });
      continue;
    }

    // Note line: TYPE BEAT DURATION PITCH TEXT
    if (':*FRG'.includes(type)) {
      // Match the 3 numeric fields, then preserve the rest (including leading spaces) as text
      const match = line.match(/^.\s*(-?\d+)\s+(-?\d+)\s+(-?\d+)\s(.*)/);
      if (match) {
        const beat = parseInt(match[1], 10);
        const duration = parseInt(match[2], 10);
        const pitch = parseInt(match[3], 10);
        const noteText = match[4];
        events.push({
          kind: 'note',
          note: { noteType: type, beat, duration, pitch, text: noteText },
        });
      }
    }
  }

  const headers: UltraStarHeaders = {
    title: rawHeaders['TITLE'] ?? 'Unknown',
    artist: rawHeaders['ARTIST'] ?? 'Unknown',
    bpm: rawHeaders['BPM'] ? parseEuropeanFloat(rawHeaders['BPM']) : 120,
    gap: rawHeaders['GAP'] ? parseEuropeanFloat(rawHeaders['GAP']) : 0,
    mp3: rawHeaders['MP3'] ?? null,
    video: rawHeaders['VIDEO'] ?? null,
    cover: rawHeaders['COVER'] ?? null,
    background: rawHeaders['BACKGROUND'] ?? null,
    year: rawHeaders['YEAR'] ? parseInt(rawHeaders['YEAR'], 10) || null : null,
    language: rawHeaders['LANGUAGE'] || null,
    genre: rawHeaders['GENRE'] || null,
    edition: rawHeaders['EDITION'] || null,
    creator: rawHeaders['CREATOR'] || null,
    encoding: rawHeaders['ENCODING'] ?? null,
  };

  return { headers, events };
}
