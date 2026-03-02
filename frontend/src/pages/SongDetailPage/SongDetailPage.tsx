import { useState, useEffect, useCallback } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSongRepository } from '../../context/SongRepositoryContext';
import type { Song } from '../../model/Song';
import type { SongUpdate } from '../../data/SongRepository';
import { CoverImage } from '../../components/CoverImage/CoverImage';
import { ConnectionError } from '../../components/ConnectionError/ConnectionError';
import styles from './SongDetailPage.module.css';

interface EditForm {
  title: string;
  artist: string;
  genre: string;
  edition: string;
  creator: string;
  year: string;
  language: string;
  tags: string;
}

function songToForm(song: Song): EditForm {
  return {
    title: song.title,
    artist: song.artist,
    genre: song.genre ?? '',
    edition: song.edition ?? '',
    creator: song.creator ?? '',
    year: song.year != null ? String(song.year) : '',
    language: song.language ?? '',
    tags: song.tags?.join(', ') ?? '',
  };
}

export function SongDetailPage() {
  const { songId } = useParams<{ songId: string }>();
  const repo = useSongRepository();
  const navigate = useNavigate();
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);

  const fetchSong = useCallback(() => {
    if (!songId) return;
    setLoading(true);
    setError(null);
    repo
      .getSongById(songId)
      .then((s) => {
        if (!s) setError('Song not found');
        else setSong(s);
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [songId, repo]);

  useEffect(() => {
    fetchSong();
  }, [fetchSong]);

  const startEditing = () => {
    if (!song) return;
    setForm(songToForm(song));
    setEditing(true);
    setError(null);
  };

  const cancelEditing = () => {
    setEditing(false);
    setForm(null);
    setError(null);
  };

  const handleSave = async () => {
    if (!songId || !form) return;
    setSaving(true);
    setError(null);
    try {
      const update: SongUpdate = {
        title: form.title.trim() || undefined,
        artist: form.artist.trim() || undefined,
        genre: form.genre.trim(),
        edition: form.edition.trim(),
        creator: form.creator.trim(),
        year: form.year.trim() ? Number(form.year.trim()) : null,
        language: form.language.trim(),
        tags: form.tags.trim()
          ? form.tags.split(',').map((t) => t.trim()).filter(Boolean)
          : [],
      };
      const updated = await repo.updateSong(songId, update);
      setSong(updated);
      setEditing(false);
      setForm(null);
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Save failed');
    } finally {
      setSaving(false);
    }
  };

  const handleDelete = async () => {
    if (!songId) return;
    setDeleting(true);
    try {
      await repo.deleteSong(songId);
      navigate('/');
    } catch (e: unknown) {
      setError(e instanceof Error ? e.message : 'Delete failed');
      setDeleting(false);
      setConfirmDelete(false);
    }
  };

  const updateField = (field: keyof EditForm, value: string) => {
    setForm((prev) => prev ? { ...prev, [field]: value } : prev);
  };

  if (loading) return <div className={styles.status}>Loading...</div>;
  if (!song && !error) return <div className={styles.status}>Song not found</div>;
  if (!song) return <ConnectionError message={error!} onRetry={fetchSong} />;

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>&larr; Back to Library</Link>

      {song.status === 'processing' && (
        <div className={styles.processingBanner}>
          <div className={styles.processingSpinner} />
          <span>This song is still being processed — files are uploading.</span>
        </div>
      )}

      {song.status === 'broken' && (
        <div className={styles.brokenBanner}>
          <span>This song is broken — essential files are missing or corrupt.</span>
          <Link to="/import" className={styles.brokenUploadLink}>Re-upload to repair</Link>
        </div>
      )}

      {error && (
        <div className={styles.error}>
          <span>{error}</span>
          <button className={styles.errorDismiss} onClick={() => setError(null)}>&times;</button>
        </div>
      )}

      <div className={styles.layout}>
        <div className={styles.coverWrap}>
          <CoverImage url={song.coverUrl} alt={song.title} size={280} />
        </div>

        <div className={styles.info}>
          {editing && form ? (
            <>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Title</label>
                <input
                  className={styles.input}
                  value={form.title}
                  onChange={(e) => updateField('title', e.target.value)}
                />
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Artist</label>
                <input
                  className={styles.input}
                  value={form.artist}
                  onChange={(e) => updateField('artist', e.target.value)}
                />
              </div>
              <div className={styles.formGrid}>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Genre</label>
                  <input
                    className={styles.input}
                    value={form.genre}
                    onChange={(e) => updateField('genre', e.target.value)}
                    placeholder="e.g. Rock, Pop"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Edition</label>
                  <input
                    className={styles.input}
                    value={form.edition}
                    onChange={(e) => updateField('edition', e.target.value)}
                    placeholder="e.g. Charts, Party"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Year</label>
                  <input
                    className={styles.input}
                    type="number"
                    value={form.year}
                    onChange={(e) => updateField('year', e.target.value)}
                    placeholder="e.g. 1975"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Language</label>
                  <input
                    className={styles.input}
                    value={form.language}
                    onChange={(e) => updateField('language', e.target.value)}
                    placeholder="e.g. English"
                  />
                </div>
                <div className={styles.fieldGroup}>
                  <label className={styles.label}>Creator</label>
                  <input
                    className={styles.input}
                    value={form.creator}
                    onChange={(e) => updateField('creator', e.target.value)}
                    placeholder="UltraStar file creator"
                  />
                </div>
              </div>
              <div className={styles.fieldGroup}>
                <label className={styles.label}>Tags</label>
                <input
                  className={styles.input}
                  value={form.tags}
                  onChange={(e) => updateField('tags', e.target.value)}
                  placeholder="Comma-separated, e.g. classic, favorite, duet"
                />
                <span className={styles.hint}>Separate tags with commas</span>
              </div>
              <div className={styles.actions}>
                <button
                  className={styles.saveBtn}
                  onClick={handleSave}
                  disabled={saving || !form.title.trim() || !form.artist.trim()}
                >
                  {saving ? 'Saving...' : 'Save'}
                </button>
                <button
                  className={styles.cancelBtn}
                  onClick={cancelEditing}
                  disabled={saving}
                >
                  Cancel
                </button>
              </div>
            </>
          ) : (
            <>
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
                {song.creator && (
                  <>
                    <dt>Creator</dt>
                    <dd>{song.creator}</dd>
                  </>
                )}
                <dt>BPM</dt>
                <dd>{song.bpm}</dd>
              </dl>

              {song.tags && song.tags.length > 0 && (
                <div className={styles.tagList}>
                  {song.tags.map((tag) => (
                    <span key={tag} className={styles.tag}>{tag}</span>
                  ))}
                </div>
              )}

              <div className={styles.actions}>
                {song.status === 'ready' ? (
                  <Link to={`/play/${song.id}`} className={styles.playBtn}>
                    Play
                  </Link>
                ) : (
                  <span className={styles.playBtnDisabled}>
                    {song.status === 'processing' ? 'Processing...' : 'Unavailable'}
                  </span>
                )}
                <button className={styles.editBtn} onClick={startEditing}>
                  Edit
                </button>
                {!confirmDelete ? (
                  <button
                    className={styles.deleteBtn}
                    onClick={() => setConfirmDelete(true)}
                  >
                    Delete
                  </button>
                ) : (
                  <div className={styles.confirmRow}>
                    <span className={styles.confirmText}>Delete this song?</span>
                    <button
                      className={styles.confirmYes}
                      onClick={handleDelete}
                      disabled={deleting}
                    >
                      {deleting ? 'Deleting...' : 'Yes, delete'}
                    </button>
                    <button
                      className={styles.confirmNo}
                      onClick={() => setConfirmDelete(false)}
                      disabled={deleting}
                    >
                      Cancel
                    </button>
                  </div>
                )}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
