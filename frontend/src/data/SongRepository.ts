import type { Song } from '../model/Song';
import type { LyricTimeline } from '../model/LyricTimeline';

export interface SongQuery {
  search?: string;
  genre?: string;
  language?: string;
  year?: number;
  sortBy?: 'title' | 'artist' | 'year';
  sortOrder?: 'asc' | 'desc';
  page?: number;
  size?: number;
}

export interface SongPage {
  content: Song[];
  totalElements: number;
  totalPages: number;
  page: number;
  size: number;
}

export interface SongRepository {
  getSongs(query?: SongQuery): Promise<SongPage>;
  getSongById(id: string): Promise<Song | null>;
  getLyricTimeline(songId: string): Promise<LyricTimeline | null>;
  getGenres(): Promise<string[]>;
  getLanguages(): Promise<string[]>;
  addSong(file: File): Promise<Song>;
}
