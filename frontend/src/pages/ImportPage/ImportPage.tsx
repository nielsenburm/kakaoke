import { useState, useRef, useCallback } from 'react';
import { Link } from 'react-router-dom';
import { useSongRepository } from '../../context/SongRepositoryContext';
import type { Song } from '../../model/Song';
import styles from './ImportPage.module.css';

interface ImportResult {
  song: Song;
}

export function ImportPage() {
  const repo = useSongRepository();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<ImportResult | null>(null);

  const handleFile = useCallback(
    async (file: File) => {
      setError(null);
      setResult(null);
      setImporting(true);

      try {
        const song = await repo.addSong(file);
        setResult({ song });
      } catch (e) {
        setError(e instanceof Error ? e.message : 'Failed to import song.');
      } finally {
        setImporting(false);
      }
    },
    [repo],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const file = e.dataTransfer.files[0];
      if (file) handleFile(file);
    },
    [handleFile],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const file = e.target.files?.[0];
      if (file) handleFile(file);
      e.target.value = '';
    },
    [handleFile],
  );

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>
        &larr; Back to Library
      </Link>
      <h1 className={styles.heading}>Import Song</h1>
      <p className={styles.description}>
        Upload a zip file containing an UltraStar song folder (.txt, .mp3, .jpg).
        The song will be available in your library for this session.
      </p>

      <div
        className={`${styles.dropZone} ${dragging ? styles.dropZoneActive : ''}`}
        onDragOver={(e) => {
          e.preventDefault();
          setDragging(true);
        }}
        onDragLeave={() => setDragging(false)}
        onDrop={onDrop}
        onClick={() => fileInputRef.current?.click()}
      >
        <input
          ref={fileInputRef}
          type="file"
          accept=".zip"
          className={styles.hiddenInput}
          onChange={onFileChange}
        />
        {importing ? (
          <span className={styles.dropText}>Importing...</span>
        ) : (
          <>
            <span className={styles.dropIcon}>&#128230;</span>
            <span className={styles.dropText}>
              Drop a .zip file here or click to browse
            </span>
          </>
        )}
      </div>

      {error && <div className={styles.error}>{error}</div>}

      {result && (
        <div className={styles.success}>
          <p>
            Imported <strong>{result.song.title}</strong> by{' '}
            <strong>{result.song.artist}</strong>
          </p>
          <div className={styles.links}>
            <Link to={`/song/${result.song.id}`} className={styles.link}>
              View Song
            </Link>
            <Link to={`/play/${result.song.id}`} className={styles.link}>
              Play Now
            </Link>
          </div>
        </div>
      )}
    </div>
  );
}
