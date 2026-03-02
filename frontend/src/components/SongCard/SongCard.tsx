import { useState, useCallback } from 'react';
import { Link } from 'react-router-dom';
import type { Song } from '../../model/Song';
import { CoverImage } from '../CoverImage/CoverImage';
import styles from './SongCard.module.css';

interface SongCardProps {
  song: Song;
}

export function SongCard({ song }: SongCardProps) {
  const imageUrl = song.thumbnailUrl ?? song.coverUrl;
  const [imageBroken, setImageBroken] = useState(false);
  const handleLoadError = useCallback(() => setImageBroken(true), []);

  const status = imageBroken && song.status === 'ready' ? 'broken' : song.status;

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
      </CoverImage>
      <div className={styles.info}>
        <span className={styles.title}>{song.title}</span>
        <span className={styles.artist}>{song.artist}</span>
      </div>
    </Link>
  );
}
