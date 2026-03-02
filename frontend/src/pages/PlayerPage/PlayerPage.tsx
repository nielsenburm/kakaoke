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
  const bgImageSrc = showBg ? (song.backgroundUrl ?? song.coverUrl) : null;

  // ── Media readiness gates ──

  // Image: decode off main thread
  const [bgImageReady, setBgImageReady] = useState(!bgImageSrc);
  useEffect(() => {
    if (!bgImageSrc) { setBgImageReady(true); return; }
    setBgImageReady(false);
    const img = new Image();
    img.src = bgImageSrc;
    img.decode()
      .then(() => setBgImageReady(true))
      .catch(() => setBgImageReady(true));
  }, [bgImageSrc]);

  // Video: wait for enough data to start playback
  const [videoReady, setVideoReady] = useState(!bgVideoUrl);
  useEffect(() => {
    const video = videoRef.current;
    if (!bgVideoUrl || !video) { setVideoReady(true); return; }
    setVideoReady(false);
    video.preload = 'auto';
    video.load();
    const onCanPlay = () => setVideoReady(true);
    video.addEventListener('canplay', onCanPlay, { once: true });
    const timeout = setTimeout(() => setVideoReady(true), 5000);
    return () => {
      video.removeEventListener('canplay', onCanPlay);
      clearTimeout(timeout);
    };
  }, [bgVideoUrl]);

  // Microphone: request access during loading so AudioContext creation doesn't freeze the player UI
  const [micReady, setMicReady] = useState(!settings.autoPlay);
  const micRequestedRef = useRef(false);
  useEffect(() => {
    if (!settings.autoPlay || micRequestedRef.current) return;
    micRequestedRef.current = true;
    mic.requestMic().finally(() => setMicReady(true));
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // All resources loaded — safe to show player without freezing
  const allReady = bgImageReady && videoReady && micReady;
  const bgImageUrl = bgImageReady ? bgImageSrc : null;
  const hasBg = !!(bgVideoUrl || bgImageSrc);

  // Set simulated duration from timeline if no audio
  useEffect(() => {
    if (timeline && !song.audioUrl) {
      const lastLine = timeline.lines[timeline.lines.length - 1];
      if (lastLine) {
        player.setSimulatedDuration(lineEndMs(lastLine) + 5000);
      }
    }
  }, [timeline, song.audioUrl, player.setSimulatedDuration]);

  // Auto-play — only after all resources are ready (mic already acquired during loading)
  const autoPlayFired = useRef(false);
  useEffect(() => {
    if (!settings.autoPlay || autoPlayFired.current || !allReady) return;
    autoPlayFired.current = true;
    player.play();
  }, [settings.autoPlay, allReady]); // eslint-disable-line react-hooks/exhaustive-deps

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

  // Single return — keeps video/audio elements mounted so they retain buffered data
  return (
    <div className={styles.page}>
      {/* Loading overlay — shown until all resources are buffered */}
      {!allReady && (
        <div className={styles.loadingScreen}>
          <img className={styles.loadingImage} src="/loading.png" alt="Loading song" />
        </div>
      )}

      <div className={styles.header} style={allReady ? undefined : { display: 'none' }}>
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

      {allReady && mic.error && <div className={styles.micError}>{mic.error}</div>}

      <div className={styles.stageArea} style={allReady ? undefined : { display: 'none' }}>
        {bgImageUrl && (
          <img
            className={styles.bgMedia}
            src={bgImageUrl}
            alt=""
            decoding="async"
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

      {/* Controls — always mounted so audio can buffer.
          Use visibility:hidden (not display:none) so the browser still loads the <audio> element. */}
      <div className={styles.controls} style={allReady ? undefined : { visibility: 'hidden', position: 'absolute' }}>
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
