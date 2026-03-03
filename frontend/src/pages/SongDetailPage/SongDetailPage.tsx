import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSongRepository } from '../../context/SongRepositoryContext';
import { useSettings } from '../../context/SettingsContext';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { AudioPlayer } from '../../components/AudioPlayer/AudioPlayer';
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
  const [song, setSong] = useState<Song | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [deleting, setDeleting] = useState(false);
  const [confirmDelete, setConfirmDelete] = useState(false);
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [form, setForm] = useState<EditForm | null>(null);
  const [favorite, setFavorite] = useState(false);

  const fetchSong = useCallback(() => {
    if (!songId) return;
    setLoading(true);
    setError(null);
    repo
      .getSongById(songId)
      .then((s) => {
        if (!s) setError('Song not found');
        else { setSong(s); setFavorite(s.favorite); }
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [songId, repo]);

  useEffect(() => {
    fetchSong();
  }, [fetchSong]);

  if (loading) return <div className={styles.status}>Loading...</div>;
  if (!song && !error) return <div className={styles.status}>Song not found</div>;
  if (!song) return <ConnectionError message={error!} onRetry={fetchSong} />;

  return (
    <SongDetailView
      song={song}
      setSong={setSong}
      error={error}
      setError={setError}
      editing={editing}
      setEditing={setEditing}
      form={form}
      setForm={setForm}
      saving={saving}
      setSaving={setSaving}
      deleting={deleting}
      setDeleting={setDeleting}
      confirmDelete={confirmDelete}
      setConfirmDelete={setConfirmDelete}
      favorite={favorite}
      setFavorite={setFavorite}
    />
  );
}

interface SongDetailViewProps {
  song: Song;
  setSong: (s: Song) => void;
  error: string | null;
  setError: (e: string | null) => void;
  editing: boolean;
  setEditing: (v: boolean) => void;
  form: EditForm | null;
  setForm: (f: EditForm | null) => void;
  saving: boolean;
  setSaving: (v: boolean) => void;
  deleting: boolean;
  setDeleting: (v: boolean) => void;
  confirmDelete: boolean;
  setConfirmDelete: (v: boolean) => void;
  favorite: boolean;
  setFavorite: (v: boolean) => void;
}

function SongDetailView({
  song, setSong, error, setError,
  editing, setEditing, form, setForm,
  saving, setSaving, deleting, setDeleting,
  confirmDelete, setConfirmDelete,
  favorite, setFavorite,
}: SongDetailViewProps) {
  const { songId } = useParams<{ songId: string }>();
  const repo = useSongRepository();
  const navigate = useNavigate();
  const { settings } = useSettings();

  const audioUrl = song.status === 'ready' ? song.audioUrl : null;
  const player = useAudioPlayer(audioUrl);
  const previewStarted = useRef(false);

  // Auto-play preview from previewStart
  useEffect(() => {
    if (previewStarted.current) return;
    if (!settings.autoPreview || !audioUrl) return;
    if (player.durationMs <= 0) return;
    previewStarted.current = true;
    if (song.previewStart != null && song.previewStart > 0) {
      player.seek(song.previewStart * 1000);
    }
    player.play();
  }, [settings.autoPreview, audioUrl, player.durationMs, song.previewStart, player]);

  const startEditing = () => {
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
      const updated = await repo.updateSong(songId!, update);
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

  const toggleFavorite = async () => {
    const next = !favorite;
    setFavorite(next);
    try {
      await repo.setFavorite(song.id, next);
    } catch {
      setFavorite(!next);
    }
  };

  const updateField = (field: keyof EditForm, value: string) => {
    setForm(form ? { ...form, [field]: value } : form);
  };

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6" /></svg>
        Library
      </Link>

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
          {audioUrl && (
            <div className={styles.previewPlayer}>
              <AudioPlayer audioUrl={audioUrl} player={player} />
            </div>
          )}
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
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" stroke="none">
                      <polygon points="5 3 19 12 5 21 5 3" />
                    </svg>
                    Play
                  </Link>
                ) : (
                  <span className={styles.playBtnDisabled}>
                    {song.status === 'processing' ? 'Processing...' : 'Unavailable'}
                  </span>
                )}

                <div className={styles.secondaryActions}>
                  <button
                    className={`${styles.iconBtn} ${favorite ? styles.iconBtnFavoriteActive : ''}`}
                    onClick={toggleFavorite}
                    title={favorite ? 'Remove from favorites' : 'Add to favorites'}
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill={favorite ? 'currentColor' : 'none'} stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M20.84 4.61a5.5 5.5 0 0 0-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 0 0-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 0 0 0-7.78z" />
                    </svg>
                  </button>
                  <button
                    className={styles.iconBtn}
                    onClick={startEditing}
                    title="Edit song details"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <path d="M11 4H4a2 2 0 0 0-2 2v14a2 2 0 0 0 2 2h14a2 2 0 0 0 2-2v-7" />
                      <path d="M18.5 2.5a2.121 2.121 0 0 1 3 3L12 15l-4 1 1-4 9.5-9.5z" />
                    </svg>
                  </button>
                  <button
                    className={`${styles.iconBtn} ${styles.iconBtnDanger}`}
                    onClick={() => setConfirmDelete(true)}
                    title="Delete song"
                  >
                    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <polyline points="3 6 5 6 21 6" />
                      <path d="M19 6v14a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2V6m3 0V4a2 2 0 0 1 2-2h4a2 2 0 0 1 2 2v2" />
                    </svg>
                  </button>
                </div>
              </div>

              {confirmDelete && (
                <div className={styles.confirmOverlay}>
                  <div className={styles.confirmCard}>
                    <svg className={styles.confirmIcon} width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                      <circle cx="12" cy="12" r="10" />
                      <line x1="12" y1="8" x2="12" y2="12" />
                      <line x1="12" y1="16" x2="12.01" y2="16" />
                    </svg>
                    <p className={styles.confirmText}>
                      Remove <strong>{song.title}</strong> from your library?
                    </p>
                    <div className={styles.confirmButtons}>
                      <button
                        className={styles.confirmNo}
                        onClick={() => setConfirmDelete(false)}
                        disabled={deleting}
                      >
                        Cancel
                      </button>
                      <button
                        className={styles.confirmYes}
                        onClick={handleDelete}
                        disabled={deleting}
                      >
                        {deleting ? 'Deleting...' : 'Delete'}
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </>
          )}
        </div>
      </div>
    </div>
  );
}
