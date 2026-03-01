import { useState, useEffect, useCallback } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSongRepository } from '../../context/SongRepositoryContext';
import type { Song } from '../../model/Song';
import type { LyricTimeline } from '../../model/LyricTimeline';
import { lineEndMs } from '../../model/LyricTimeline';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { useLyricsSync } from '../../components/LyricsRenderer/useLyricsSync';
import { AudioPlayer } from '../../components/AudioPlayer/AudioPlayer';
import { LyricsRenderer } from '../../components/LyricsRenderer/LyricsRenderer';
import styles from './PlayerPage.module.css';

export function PlayerPage() {
  const { songId } = useParams<{ songId: string }>();
  const repo = useSongRepository();
  const [song, setSong] = useState<Song | null>(null);
  const [timeline, setTimeline] = useState<LyricTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!songId) return;
    Promise.all([repo.getSongById(songId), repo.getLyricTimeline(songId)])
      .then(([s, t]) => {
        if (!s) {
          setError('Song not found');
          return;
        }
        setSong(s);
        setTimeline(t);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [songId, repo]);

  if (loading) return <div className={styles.status}>Loading...</div>;
  if (error || !song) return <div className={styles.status}>{error ?? 'Song not found'}</div>;

  return <PlayerView song={song} timeline={timeline} />;
}

function PlayerView({ song, timeline }: { song: Song; timeline: LyricTimeline | null }) {
  const player = useAudioPlayer(song.audioUrl);

  // Set simulated duration from timeline if no audio
  useEffect(() => {
    if (timeline && !song.audioUrl) {
      const lastLine = timeline.lines[timeline.lines.length - 1];
      if (lastLine) {
        player.setSimulatedDuration(lineEndMs(lastLine) + 5000);
      }
    }
  }, [timeline, song.audioUrl, player.setSimulatedDuration]);

  // Auto-play when mounted
  useEffect(() => {
    // Small delay to ensure the <audio> element is attached to the ref
    const id = setTimeout(() => player.play(), 100);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const getCurrentTimeMs = useCallback(() => player.currentTimeMs, [player.currentTimeMs]);
  const sync = useLyricsSync(timeline, getCurrentTimeMs, player.isPlaying);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to={`/song/${song.id}`} className={styles.back}>&larr; Back</Link>
        <div className={styles.songInfo}>
          <span className={styles.title}>{song.title}</span>
          <span className={styles.artist}>{song.artist}</span>
        </div>
      </div>

      {timeline ? (
        <LyricsRenderer
          timeline={timeline}
          sync={sync}
          currentTimeMs={player.currentTimeMs}
        />
      ) : (
        <div className={styles.noLyrics}>No lyrics available for this song.</div>
      )}

      <div className={styles.controls}>
        <AudioPlayer audioUrl={song.audioUrl} player={player} />
      </div>
    </div>
  );
}
