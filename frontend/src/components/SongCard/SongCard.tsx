import { Link } from 'react-router-dom';
import type { Song } from '../../model/Song';
import { CoverImage } from '../CoverImage/CoverImage';
import styles from './SongCard.module.css';

interface SongCardProps {
  song: Song;
}

export function SongCard({ song }: SongCardProps) {
  return (
    <Link to={`/song/${song.id}`} className={styles.card}>
      <CoverImage url={song.coverUrl} alt={song.title} />
      <div className={styles.info}>
        <span className={styles.title}>{song.title}</span>
        <span className={styles.artist}>{song.artist}</span>
      </div>
    </Link>
  );
}
