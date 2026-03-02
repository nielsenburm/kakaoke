import { useState, useEffect, useCallback, useRef } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { useSongRepository } from '../../context/SongRepositoryContext';
import type { Song } from '../../model/Song';
import type { LyricTimeline } from '../../model/LyricTimeline';
import { lineEndMs } from '../../model/LyricTimeline';
import { useAudioPlayer } from '../../hooks/useAudioPlayer';
import { useMicrophone } from '../../hooks/useMicrophone';
import { useScoring } from '../../hooks/useScoring';
import { useLyricsSync } from '../../components/LyricsRenderer/useLyricsSync';
import { AudioPlayer } from '../../components/AudioPlayer/AudioPlayer';
import { LyricsRenderer } from '../../components/LyricsRenderer/LyricsRenderer';
import { ScoreDisplay } from '../../components/ScoreDisplay/ScoreDisplay';
import { PitchIndicator } from '../../components/PitchIndicator/PitchIndicator';
import { ConnectionError } from '../../components/ConnectionError/ConnectionError';
import { useSettings } from '../../context/SettingsContext';
import styles from './PlayerPage.module.css';

export function PlayerPage() {
  const { songId } = useParams<{ songId: string }>();
  const repo = useSongRepository();
  const [song, setSong] = useState<Song | null>(null);
  const [timeline, setTimeline] = useState<LyricTimeline | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const fetchData = useCallback(() => {
    if (!songId) return;
    setLoading(true);
    setError(null);
    Promise.all([repo.getSongById(songId), repo.getLyricTimeline(songId)])
      .then(([s, t]) => {
        if (!s) {
          setError('Song not found');
          return;
        }
        setSong(s);
        setTimeline(t);
        repo.markPlayed(songId).catch(() => {});
      })
      .catch((e) => setError(e.message))
      .finally(() => setLoading(false));
  }, [songId, repo]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  if (loading) return <div className={styles.status}>Loading...</div>;
  if (error || !song) return <ConnectionError message={error ?? 'Song not found'} onRetry={fetchData} />;

  return <PlayerView song={song} timeline={timeline} />;
}

function PlayerView({ song, timeline }: { song: Song; timeline: LyricTimeline | null }) {
  const navigate = useNavigate();
  const { settings } = useSettings();
  const player = useAudioPlayer(song.audioUrl);
  const mic = useMicrophone(settings.micSensitivity);
  const scoring = useScoring(timeline, player.currentTimeMs, mic.currentPitch, mic.isActive, settings.pitchTolerance);

  const videoRef = useRef<HTMLVideoElement>(null);
  const videoGapSec = song.videoGap ?? 0;

  const showBg = settings.showBackground;
  const bgVideoUrl = showBg ? song.videoUrl : null;
  // Show image as fallback while video loads, or as primary background if no video
  const bgImageUrl = showBg ? (song.backgroundUrl ?? song.coverUrl) : null;
  const hasBg = !!(bgVideoUrl || bgImageUrl);

  // Set simulated duration from timeline if no audio
  useEffect(() => {
    if (timeline && !song.audioUrl) {
      const lastLine = timeline.lines[timeline.lines.length - 1];
      if (lastLine) {
        player.setSimulatedDuration(lineEndMs(lastLine) + 5000);
      }
    }
  }, [timeline, song.audioUrl, player.setSimulatedDuration]);

  // Auto-play and auto-enable mic when mounted (if enabled in settings)
  useEffect(() => {
    if (!settings.autoPlay) return;
    const id = setTimeout(() => {
      player.play();
      mic.requestMic();
    }, 100);
    return () => clearTimeout(id);
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  const sync = useLyricsSync(timeline, player.getCurrentTimeMs, player.isPlaying);

  const handleRestart = useCallback(() => {
    scoring.reset();
    player.seek(0);
    player.play();
  }, [scoring, player]);

  const handleBack = useCallback(() => {
    navigate(`/song/${song.id}`);
  }, [navigate, song.id]);

  const handleMicToggle = useCallback(() => {
    if (mic.isActive) {
      mic.stopMic();
    } else {
      mic.requestMic();
    }
  }, [mic]);

  // Stop video on unmount to free decoder resources
  useEffect(() => {
    return () => {
      videoRef.current?.pause();
      if (videoRef.current) videoRef.current.src = '';
    };
  }, []);

  // Video play/pause sync
  useEffect(() => {
    const video = videoRef.current;
    if (!video) return;

    if (player.isPlaying) {
      video.play().catch(() => {});
    } else {
      video.pause();
    }
  }, [player.isPlaying]);

  // Video drift correction — check periodically, not every frame
  useEffect(() => {
    if (!player.isPlaying) return;
    const video = videoRef.current;
    if (!video) return;

    const id = setInterval(() => {
      const expectedTime = player.getCurrentTimeMs() / 1000 - videoGapSec;
      if (expectedTime < 0) return;
      if (Math.abs(video.currentTime - expectedTime) > 0.5) {
        video.currentTime = expectedTime;
      }
    }, 2000);

    return () => clearInterval(id);
  }, [player.isPlaying, player.getCurrentTimeMs, videoGapSec]);

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <Link to={`/song/${song.id}`} className={styles.back}>&larr; Back</Link>
        <div className={styles.songInfo}>
          <span className={styles.title}>{song.title}</span>
          <span className={styles.artist}>{song.artist}</span>
        </div>
        <button
          className={`${styles.micButton} ${mic.isActive ? styles.micActive : ''}`}
          onClick={handleMicToggle}
          disabled={mic.isRequesting}
          title={mic.isActive ? 'Disable microphone' : 'Enable microphone for scoring'}
        >
          <MicIcon />
        </button>
      </div>

      {mic.error && <div className={styles.micError}>{mic.error}</div>}

      <div className={styles.stageArea}>
        {bgImageUrl && (
          <img
            className={`${styles.bgMedia} ${!song.backgroundUrl ? styles.bgBlurred : ''}`}
            src={bgImageUrl}
            alt=""
          />
        )}
        {bgVideoUrl && (
          <video
            ref={videoRef}
            className={styles.bgMedia}
            src={bgVideoUrl}
            muted
            playsInline
            preload="none"
          />
        )}
        {(bgVideoUrl || bgImageUrl) && <div className={styles.bgDim} />}

        {mic.isActive && settings.showPitchIndicator && (
          <PitchIndicator pitchDiff={scoring.currentPitchDiff} />
        )}

        {timeline ? (
          <div className={
            hasBg
              ? settings.lyricsPosition === 'bottom' ? styles.lyricsBackdrop : styles.lyricsBackdropCenter
              : styles.lyricsFill
          }>
            <LyricsRenderer
              timeline={timeline}
              sync={sync}
              currentTimeMs={player.currentTimeMs}
              tokenScores={mic.isActive ? scoring.currentLineTokenScores : null}
            />
          </div>
        ) : (
          <div className={styles.noLyrics}>No lyrics available for this song.</div>
        )}

        {mic.isActive && (
          <ScoreDisplay
            scoring={scoring}
            onRestart={handleRestart}
            onBack={handleBack}
          />
        )}
      </div>

      <div className={styles.controls}>
        <AudioPlayer audioUrl={song.audioUrl} player={player} />
      </div>
    </div>
  );
}

function MicIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <rect x="9" y="1" width="6" height="12" rx="3" />
      <path d="M19 10v1a7 7 0 0 1-14 0v-1" />
      <line x1="12" y1="19" x2="12" y2="23" />
      <line x1="8" y1="23" x2="16" y2="23" />
    </svg>
  );
}
