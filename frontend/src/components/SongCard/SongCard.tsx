import { useState, useCallback, type MouseEvent } from 'react';
import { Link } from 'react-router-dom';
import type { Song } from '../../model/Song';
import { useSongRepository } from '../../context/SongRepositoryContext';
import { CoverImage } from '../CoverImage/CoverImage';
import styles from './SongCard.module.css';

interface SongCardProps {
  song: Song;
}

export function SongCard({ song }: SongCardProps) {
  const repo = useSongRepository();
  const imageUrl = song.thumbnailUrl ?? song.coverUrl;
  const [imageBroken, setImageBroken] = useState(false);
  const [favorite, setFavorite] = useState(song.favorite);
  const handleLoadError = useCallback(() => setImageBroken(true), []);

  const status = imageBroken && song.status === 'ready' ? 'broken' : song.status;

  const toggleFavorite = useCallback((e: MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    const next = !favorite;
    setFavorite(next);
    repo.setFavorite(song.id, next).catch(() => setFavorite(!next));
  }, [favorite, repo, song.id]);

  return (
    <Link to={`/song/${song.id}`} className={styles.card}>
      <CoverImage url={imageUrl} alt={song.title} onLoadError={handleLoadError}>
        {status === 'processing' && (
          <div className={styles.processingOverlay}>
            <div className={styles.spinner} />
          </div>
        )}
        {status === 'broken' && (
          <div className={styles.brokenOverlay}>
            <span className={styles.brokenIcon}>!</span>
          </div>
        )}
        {!song.played && status === 'ready' && (
          <span className={styles.newBadge}>New</span>
        )}
        {status === 'ready' && (
          <button
            className={`${styles.heartBtn} ${favorite ? styles.heartActive : ''}`}
            onClick={toggleFavorite}
            aria-label={favorite ? 'Remove from favorites' : 'Add to favorites'}
          >
            <HeartIcon filled={favorite} />
          </button>
        )}
      </CoverImage>
      <div className={styles.info}>
        <span className={styles.title}>{song.title}</span>
        <span className={styles.artist}>{song.artist}</span>
      </div>
    </Link>
  );
}

function HeartIcon({ filled }: { filled: boolean }) {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill={filled ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
    </svg>
  );
}
