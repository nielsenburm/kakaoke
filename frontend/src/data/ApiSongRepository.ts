import type { Song } from '../model/Song';
import type { LyricTimeline } from '../model/LyricTimeline';
import type { SongRepository, SongQuery, SongPage, SongUpdate, ImportResult } from './SongRepository';
import { apiFetch, getApiBase } from './apiClient';

export class ApiSongRepository implements SongRepository {
  async getSongs(query?: SongQuery): Promise<SongPage> {
    const params = new URLSearchParams();
    if (query?.search) params.set('search', query.search);
    if (query?.genre) params.set('genre', query.genre);
    if (query?.language) params.set('language', query.language);
    if (query?.year != null) params.set('year', String(query.year));
    if (query?.favorite) params.set('favorite', 'true');
    if (query?.sortBy) params.set('sortBy', query.sortBy);
    if (query?.sortOrder) params.set('sortOrder', query.sortOrder);
    if (query?.page != null) params.set('page', String(query.page));
    if (query?.size != null) params.set('size', String(query.size));

    const qs = params.toString();
    const res = await apiFetch(`/api/songs${qs ? '?' + qs : ''}`);
    if (!res.ok) throw new Error(`Failed to fetch songs: ${res.status}`);

    const page: SongPage = await res.json();
    page.content = page.content.map(s => this.prefixAssetUrls(s));
    return page;
  }

  async getSongById(id: string): Promise<Song | null> {
    const res = await apiFetch(`/api/songs/${encodeURIComponent(id)}`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch song: ${res.status}`);
    return this.prefixAssetUrls(await res.json());
  }

  async getLyricTimeline(songId: string): Promise<LyricTimeline | null> {
    const res = await apiFetch(`/api/songs/${encodeURIComponent(songId)}/lyrics`);
    if (res.status === 404) return null;
    if (!res.ok) throw new Error(`Failed to fetch lyrics: ${res.status}`);
    return res.json();
  }

  async getGenres(): Promise<string[]> {
    const res = await apiFetch('/api/filters/genres');
    if (!res.ok) throw new Error(`Failed to fetch genres: ${res.status}`);
    return res.json();
  }

  async getLanguages(): Promise<string[]> {
    const res = await apiFetch('/api/filters/languages');
    if (!res.ok) throw new Error(`Failed to fetch languages: ${res.status}`);
    return res.json();
  }

  async addSong(file: File): Promise<ImportResult> {
    const formData = new FormData();
    formData.append('file', file);

    const res = await apiFetch('/api/songs/import', {
      method: 'POST',
      body: formData,
    });

    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Import failed' }));
      throw new Error(err.message ?? `Import failed: ${res.status}`);
    }

    const result: ImportResult = await res.json();
    result.results = result.results.map(entry => ({
      ...entry,
      song: entry.song ? this.prefixAssetUrls(entry.song) : null,
    }));
    return result;
  }

  async updateSong(id: string, update: SongUpdate): Promise<Song> {
    const res = await apiFetch(`/api/songs/${encodeURIComponent(id)}`, {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(update),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({ message: 'Update failed' }));
      throw new Error(err.message ?? `Update failed: ${res.status}`);
    }
    return this.prefixAssetUrls(await res.json());
  }

  async deleteSong(id: string): Promise<void> {
    const res = await apiFetch(`/api/songs/${encodeURIComponent(id)}`, {
      method: 'DELETE',
    });
    if (!res.ok) {
      const err = await res.json().catch(() => null);
      throw new Error(err?.message ?? `Failed to delete song (${res.status})`);
    }
  }

  async markPlayed(id: string): Promise<void> {
    await apiFetch(`/api/songs/${encodeURIComponent(id)}/played`, {
      method: 'POST',
    });
  }

  async setFavorite(id: string, favorite: boolean): Promise<void> {
    const res = await apiFetch(`/api/songs/${encodeURIComponent(id)}/favorite`, {
      method: favorite ? 'POST' : 'DELETE',
    });
    if (!res.ok) throw new Error(`Failed to update favorite: ${res.status}`);
  }

  private prefixAssetUrls(song: Song): Song {
    const base = getApiBase();
    return {
      ...song,
      coverUrl: song.coverUrl ? `${base}${song.coverUrl}` : null,
      thumbnailUrl: song.thumbnailUrl ? `${base}${song.thumbnailUrl}` : null,
      backgroundUrl: song.backgroundUrl ? `${base}${song.backgroundUrl}` : null,
      audioUrl: song.audioUrl ? `${base}${song.audioUrl}` : null,
      videoUrl: song.videoUrl ? `${base}${song.videoUrl}` : null,
    };
  }
}
