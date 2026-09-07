import { useState, useRef, useCallback } from 'react';
import { Link, useNavigate } from 'react-router-dom';
import { useSongRepository } from '../../context/SongRepositoryContext';
import type { Song } from '../../model/Song';
import styles from './ImportPage.module.css';

interface ResultEntry {
  song: Song | null;
  error: string | null;
  fileName: string;
}

const MAX_FILE_SIZE = 1024 * 1024 * 1024; // 1 GB

function formatSize(bytes: number): string {
  if (bytes >= 1024 * 1024 * 1024) return `${(bytes / (1024 * 1024 * 1024)).toFixed(1)} GB`;
  if (bytes >= 1024 * 1024) return `${(bytes / (1024 * 1024)).toFixed(0)} MB`;
  return `${(bytes / 1024).toFixed(0)} KB`;
}

export function ImportPage() {
  const repo = useSongRepository();
  const navigate = useNavigate();
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [importing, setImporting] = useState(false);
  const [progress, setProgress] = useState({ current: 0, total: 0 });
  const [errors, setErrors] = useState<ResultEntry[]>([]);
  const [sizeErrors, setSizeErrors] = useState<string[]>([]);

  const handleFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const tooLarge = files.filter((f) => f.size > MAX_FILE_SIZE);
      if (tooLarge.length > 0) {
        setSizeErrors(
          tooLarge.map((f) => `${f.name} (${formatSize(f.size)}) exceeds the 1 GB limit`),
        );
        return;
      }
      setSizeErrors([]);
      setErrors([]);
      setImporting(true);
      setProgress({ current: 0, total: files.length });

      const successes: Song[] = [];
      const failures: ResultEntry[] = [];

      for (let i = 0; i < files.length; i++) {
        const file = files[i];
        setProgress({ current: i + 1, total: files.length });

        try {
          const importResult = await repo.addSong(file);
          for (const entry of importResult.results) {
            if (entry.song) {
              successes.push(entry.song);
            } else if (entry.error) {
              failures.push({ song: null, error: entry.error, fileName: file.name });
            }
          }
        } catch (e) {
          failures.push({
            song: null,
            error: e instanceof Error ? e.message : 'Failed to import',
            fileName: file.name,
          });
        }
      }

      setImporting(false);

      if (successes.length === 1 && failures.length === 0) {
        navigate(`/song/${successes[0].id}`);
      } else if (successes.length > 1 && failures.length === 0) {
        navigate('/');
      } else if (successes.length > 0 && failures.length > 0) {
        // Some failed — stay on page to show errors, but still navigable
        setErrors(failures);
      } else {
        // All failed
        setErrors(failures);
      }
    },
    [repo, navigate],
  );

  const onDrop = useCallback(
    (e: React.DragEvent) => {
      e.preventDefault();
      setDragging(false);
      const files = Array.from(e.dataTransfer.files).filter(
        (f) => f.name.toLowerCase().endsWith('.zip'),
      );
      if (files.length > 0) handleFiles(files);
    },
    [handleFiles],
  );

  const onFileChange = useCallback(
    (e: React.ChangeEvent<HTMLInputElement>) => {
      const files = Array.from(e.target.files ?? []);
      if (files.length > 0) handleFiles(files);
      e.target.value = '';
    },
    [handleFiles],
  );

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Library
      </Link>
      <h1 className={styles.heading}>Import Songs</h1>
      <p className={styles.description}>
        Upload one or more zip files containing UltraStar song folders.
        A single zip can contain multiple song folders.
      </p>

      {sizeErrors.length > 0 && (
        <div className={styles.sizeErrors}>
          {sizeErrors.map((msg, i) => (
            <div key={i} className={styles.error}>{msg}</div>
          ))}
        </div>
      )}

      {errors.length > 0 && (
        <div className={styles.resultsList}>
          {errors.map((r, i) => (
            <div key={i} className={styles.error}>
              {errors.length > 1 && <strong>{r.fileName}: </strong>}
              {r.error}
            </div>
          ))}
        </div>
      )}

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
          multiple
          className={styles.hiddenInput}
          onChange={onFileChange}
        />
        {importing ? (
          <span className={styles.dropText}>
            Importing file {progress.current} of {progress.total}...
          </span>
        ) : (
          <>
            <span className={styles.dropIcon}>
              <svg width="40" height="40" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4" /><polyline points="17 8 12 3 7 8" /><line x1="12" y1="3" x2="12" y2="15" /></svg>
            </span>
            <span className={styles.dropText}>
              Drop .zip files here or click to browse
            </span>
            <span className={styles.dropHint}>Max file size: 1 GB</span>
          </>
        )}
      </div>
    </div>
  );
}
