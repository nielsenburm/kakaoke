export interface Song {
  id: string;
  title: string;
  artist: string;
  genre: string | null;
  edition: string | null;
  creator: string | null;
  year: number | null;
  bpm: number;
  gap: number;
  language: string | null;
  duet: boolean;
  voiceNames: string[] | null;
  previewStart: number | null;
  coverUrl: string | null;
  backgroundUrl: string | null;
  audioUrl: string | null;
}
