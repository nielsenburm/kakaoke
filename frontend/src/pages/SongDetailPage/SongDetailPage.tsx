import { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import { useSongRepository } from '../../context/SongRepositoryContext';
import type { Song } from '../../model/Song';
import { CoverImage } from '../../components/CoverImage/CoverImage';
import styles from './SongDetailPage.module.css';

export function SongDetailPage() {
  const { songId } = useParams<{ songId: string }>();
  const repo = useSongRepository();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!songId) return;
    repo
      .getSongById(songId)
      .then((s) => {
        if (!s) setError('Song not found');
        else setSong(s);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [songId, repo]);

  if (loading) return <div className={styles.status}>Loading...</div>;
  if (error || !song) return <div className={styles.status}>{error ?? 'Song not found'}</div>;

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>&larr; Back to Library</Link>
      <div className={styles.layout}>
        <div className={styles.coverWrap}>
          <CoverImage url={song.coverUrl} alt={song.title} size={280} />
        </div>
        <div className={styles.info}>
          <h1 className={styles.title}>{song.title}</h1>
          <p className={styles.artist}>{song.artist}</p>
          <dl className={styles.meta}>
            {song.genre && (
              <>
                <dt>Genre</dt>
                <dd>{song.genre}</dd>
              </>
            )}
            {song.edition && (
              <>
                <dt>Edition</dt>
                <dd>{song.edition}</dd>
              </>
            )}
            {song.year && (
              <>
                <dt>Year</dt>
                <dd>{song.year}</dd>
              </>
            )}
            {song.language && (
              <>
                <dt>Language</dt>
                <dd>{song.language}</dd>
              </>
            )}
            <dt>BPM</dt>
            <dd>{song.bpm}</dd>
          </dl>
          <Link to={`/play/${song.id}`} className={styles.playBtn}>
            Play
          </Link>
        </div>
      </div>
    </div>
  );
}
