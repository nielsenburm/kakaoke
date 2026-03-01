import type { Song } from '../model/Song';
import type { LyricTimeline } from '../model/LyricTimeline';
import type { SongRepository, SongQuery, SongPage } from './SongRepository';
import type { UltraStarFile } from './ultrastar/parseUltraStarTxt';
import { parseUltraStarTxt } from './ultrastar/parseUltraStarTxt';
import { ultrastarToSong, ultrastarToTimeline } from './ultrastar/ultrastarToModels';
import JSZip from 'jszip';

function slugify(dirName: string): string {
  return dirName
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/(^-|-$)/g, '');
}

function decodeText(buffer: ArrayBuffer): string {
  try {
    return new TextDecoder('utf-8', { fatal: true }).decode(buffer);
  } catch {
    return new TextDecoder('iso-8859-1').decode(buffer);
  }
}

interface ParsedEntry {
  song: Song;
  file: UltraStarFile;
}

const DEFAULT_PAGE_SIZE = 50;

export class LocalSongRepository implements SongRepository {
  private songsCache: Song[] | null = null;
  private parsedCache = new Map<string, ParsedEntry>();
  private dirMap = new Map<string, string>();

  private async loadManifest(): Promise<string[]> {
    const res = await fetch('/songs-manifest.json');
    const data = await res.json();
    return data.songDirs as string[];
  }

  private async fetchAndParse(dirName: string): Promise<ParsedEntry> {
    const id = slugify(dirName);
    const cached = this.parsedCache.get(id);
    if (cached) return cached;

    const encodedDir = encodeURIComponent(dirName);
    const encodedTxt = encodeURIComponent(`${dirName}.txt`);
    const url = `/songs/${encodedDir}/${encodedTxt}`;

    const res = await fetch(url);
    const buffer = await res.arrayBuffer();

    let text: string;
    try {
      text = new TextDecoder('utf-8', { fatal: true }).decode(buffer);
    } catch {
      text = new TextDecoder('iso-8859-1').decode(buffer);
    }

    const file = parseUltraStarTxt(text);
    const baseUrl = `/songs/${encodedDir}`;
    const song = ultrastarToSong(id, file, baseUrl);

    const entry = { song, file };
    this.parsedCache.set(id, entry);
    return entry;
  }

  private async loadAllSongs(): Promise<Song[]> {
    if (this.songsCache) return this.songsCache;

    const dirs = await this.loadManifest();
    const songs: Song[] = [];

    for (const dirName of dirs) {
      this.dirMap.set(slugify(dirName), dirName);
      try {
        const { song } = await this.fetchAndParse(dirName);
        songs.push(song);
      } catch (err) {
        console.warn(`Failed to load song from "${dirName}":`, err);
      }
    }

    this.songsCache = songs;
    return songs;
  }

  async getSongs(query?: SongQuery): Promise<SongPage> {
    const allSongs = await this.loadAllSongs();
    let filtered = [...allSongs];

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
    await this.loadAllSongs();
    return this.songsCache?.find((s) => s.id === id) ?? null;
  }

  async getLyricTimeline(songId: string): Promise<LyricTimeline | null> {
    const cached = this.parsedCache.get(songId);
    if (cached) return ultrastarToTimeline(songId, cached.file);

    const dirName = this.dirMap.get(songId);
    if (!dirName) {
      await this.loadAllSongs();
      const retryDir = this.dirMap.get(songId);
      if (!retryDir) return null;
      return this.getLyricTimeline(songId);
    }

    const { file } = await this.fetchAndParse(dirName);
    return ultrastarToTimeline(songId, file);
  }

  async getGenres(): Promise<string[]> {
    const songs = await this.loadAllSongs();
    const genres = new Set<string>();
    for (const s of songs) {
      if (s.genre) genres.add(s.genre);
    }
    return [...genres].sort();
  }

  async getLanguages(): Promise<string[]> {
    const songs = await this.loadAllSongs();
    const languages = new Set<string>();
    for (const s of songs) {
      if (s.language) languages.add(s.language);
    }
    return [...languages].sort();
  }

  async addSong(file: File): Promise<Song> {
    const zip = await JSZip.loadAsync(file);

    let txtPath: string | null = null;
    let txtFile: JSZip.JSZipObject | null = null;

    zip.forEach((relativePath, entry) => {
      if (!entry.dir && relativePath.toLowerCase().endsWith('.txt')) {
        if (!txtPath) {
          txtPath = relativePath;
          txtFile = entry;
        }
      }
    });

    if (!txtFile || !txtPath) {
      throw new Error('No UltraStar .txt file found in the zip.');
    }

    const folderPrefix = txtPath.includes('/')
      ? txtPath.substring(0, txtPath.lastIndexOf('/') + 1)
      : '';

    const txtBuffer = await (txtFile as JSZip.JSZipObject).async('arraybuffer');
    const txtContent = decodeText(txtBuffer);
    const parsed = parseUltraStarTxt(txtContent);
    const id = slugify(`${parsed.headers.artist} - ${parsed.headers.title}`);

    const assetLower = new Map<string, Blob>();
    const entries: [string, JSZip.JSZipObject][] = [];
    zip.forEach((relativePath, entry) => {
      if (!entry.dir && relativePath !== txtPath) {
        entries.push([relativePath, entry]);
      }
    });

    for (const [relativePath, entry] of entries) {
      const blob = await entry.async('blob');
      const fileName = relativePath.startsWith(folderPrefix)
        ? relativePath.substring(folderPrefix.length)
        : relativePath.substring(relativePath.lastIndexOf('/') + 1);
      assetLower.set(fileName.toLowerCase(), blob);
    }

    function blobUrlFor(headerVal: string | null): string | null {
      if (!headerVal) return null;
      const blob = assetLower.get(headerVal.toLowerCase());
      return blob ? URL.createObjectURL(blob) : null;
    }

    const song: Song = {
      id,
      title: parsed.headers.title,
      artist: parsed.headers.artist,
      genre: parsed.headers.genre,
      edition: parsed.headers.edition,
      creator: parsed.headers.creator,
      year: parsed.headers.year,
      bpm: parsed.headers.bpm,
      gap: parsed.headers.gap,
      language: parsed.headers.language,
      duet: false,
      voiceNames: null,
      previewStart: null,
      coverUrl: blobUrlFor(parsed.headers.cover),
      backgroundUrl:
        parsed.headers.background && !parsed.headers.background.startsWith('..')
          ? blobUrlFor(parsed.headers.background)
          : null,
      audioUrl: blobUrlFor(parsed.headers.mp3),
    };

    const entry: ParsedEntry = { song, file: parsed };
    this.parsedCache.set(id, entry);

    await this.loadAllSongs();
    this.songsCache!.push(song);

    return song;
  }
}
