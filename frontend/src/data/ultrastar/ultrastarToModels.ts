import type { Song } from '../../model/Song';
import type { LyricTimeline, LyricLine, LyricToken } from '../../model/LyricTimeline';
import type { NoteType } from '../../model/NoteType';
import type { UltraStarFile } from './parseUltraStarTxt';
import { beatToMs, beatDurationToMs } from './parseUltraStarTxt';

export function ultrastarToSong(
  id: string,
  file: UltraStarFile,
  baseUrl: string,
): Song {
  const h = file.headers;
  return {
    id,
    title: h.title,
    artist: h.artist,
    genre: h.genre,
    edition: h.edition,
    creator: h.creator,
    year: h.year,
    bpm: h.bpm,
    gap: h.gap,
    language: h.language,
    duet: false,
    voiceNames: null,
    previewStart: null,
    coverUrl: h.cover ? `${baseUrl}/${encodeURIComponent(h.cover)}` : null,
    backgroundUrl:
      h.background && !h.background.startsWith('..')
        ? `${baseUrl}/${encodeURIComponent(h.background)}`
        : null,
    audioUrl: h.mp3 ? `${baseUrl}/${encodeURIComponent(h.mp3)}` : null,
  };
}

export function ultrastarToTimeline(
  songId: string,
  file: UltraStarFile,
): LyricTimeline {
  const { bpm, gap } = file.headers;
  const lines: LyricLine[] = [];
  let currentTokens: LyricToken[] = [];

  for (const event of file.events) {
    if (event.kind === 'note') {
      const n = event.note;
      currentTokens.push({
        text: n.text,
        startMs: beatToMs(n.beat, bpm, gap),
        durationMs: beatDurationToMs(n.duration, bpm),
        pitch: n.pitch,
        noteType: n.noteType as NoteType,
      });
    } else if (event.kind === 'lineBreak' || event.kind === 'end') {
      if (currentTokens.length > 0) {
        lines.push({
          tokens: currentTokens,
          startMs: currentTokens[0].startMs,
        });
        currentTokens = [];
      }
    }
  }

  return { songId, lines };
}
