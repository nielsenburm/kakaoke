import type { Song } from '../model/Song';
import type { LyricTimeline } from '../model/LyricTimeline';

export interface SongUpdate {
  title?: string;
  artist?: string;
  genre?: string;
  edition?: string;
  creator?: string;
  year?: number | null;
  language?: string;
  tags?: string[];
}

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
  updateSong(id: string, update: SongUpdate): Promise<Song>;
  deleteSong(id: string): Promise<void>;
  markPlayed(id: string): Promise<void>;
}
