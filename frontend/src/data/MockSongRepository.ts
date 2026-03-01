import type { Song } from '../model/Song';
import type { LyricTimeline } from '../model/LyricTimeline';
import type { SongRepository, SongQuery, SongPage } from './SongRepository';
import songsData from './mock/songs.json';
import bohemianRhapsodyLyrics from './mock/lyrics/bohemian-rhapsody.json';

const songs: Song[] = songsData as Song[];

const lyricTimelines: Record<string, LyricTimeline> = {
  'bohemian-rhapsody': bohemianRhapsodyLyrics as LyricTimeline,
};

const DEFAULT_PAGE_SIZE = 50;

export class MockSongRepository implements SongRepository {
  async getSongs(query?: SongQuery): Promise<SongPage> {
    let filtered = [...songs];

    if (query?.search) {
      const q = query.search.toLowerCase();
      filtered = filtered.filter(
        (s) =>
          s.title.toLowerCase().includes(q) ||
          s.artist.toLowerCase().includes(q),
      );
    }

    if (query?.genre) {
      const g = query.genre.toLowerCase();
      filtered = filtered.filter((s) => s.genre?.toLowerCase() === g);
    }

    if (query?.language) {
      const l = query.language.toLowerCase();
      filtered = filtered.filter((s) => s.language?.toLowerCase() === l);
    }

    if (query?.year) {
      filtered = filtered.filter((s) => s.year === query.year);
    }

    const sortBy = query?.sortBy ?? 'title';
    const sortOrder = query?.sortOrder ?? 'asc';
    filtered.sort((a, b) => {
      let cmp = 0;
      if (sortBy === 'title') {
        cmp = a.title.localeCompare(b.title);
      } else if (sortBy === 'artist') {
        cmp = a.artist.localeCompare(b.artist);
      } else if (sortBy === 'year') {
        cmp = (a.year ?? 0) - (b.year ?? 0);
      }
      return sortOrder === 'desc' ? -cmp : cmp;
    });

    const page = query?.page ?? 0;
    const size = query?.size ?? DEFAULT_PAGE_SIZE;
    const totalElements = filtered.length;
    const totalPages = Math.max(1, Math.ceil(totalElements / size));
    const content = filtered.slice(page * size, (page + 1) * size);

    return { content, totalElements, totalPages, page, size };
  }

  async getSongById(id: string): Promise<Song | null> {
    return songs.find((s) => s.id === id) ?? null;
  }

  async getLyricTimeline(songId: string): Promise<LyricTimeline | null> {
    return lyricTimelines[songId] ?? null;
  }

  async getGenres(): Promise<string[]> {
    const genres = new Set<string>();
    for (const s of songs) {
      if (s.genre) genres.add(s.genre);
    }
    return [...genres].sort();
  }

  async getLanguages(): Promise<string[]> {
    const languages = new Set<string>();
    for (const s of songs) {
      if (s.language) languages.add(s.language);
    }
    return [...languages].sort();
  }

  async addSong(): Promise<Song> {
    throw new Error('Import not supported in mock repository');
  }
}
