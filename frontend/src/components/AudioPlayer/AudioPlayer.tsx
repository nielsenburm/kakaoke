import type { AudioPlayerState } from '../../hooks/useAudioPlayer';
import styles from './AudioPlayer.module.css';

interface AudioPlayerProps {
  audioUrl: string | null;
  player: AudioPlayerState;
}

function formatTime(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function AudioPlayer({ audioUrl, player }: AudioPlayerProps) {
  const { currentTimeMs, durationMs, isPlaying, setAudioElement, play, pause, seek } = player;

  return (
    <div className={styles.player}>
      {audioUrl && <audio ref={setAudioElement} src={audioUrl} preload="auto" />}

      <button className={styles.playPause} onClick={isPlaying ? pause : play}>
        {isPlaying ? '\u275A\u275A' : '\u25B6'}
      </button>

      <span className={styles.time}>{formatTime(currentTimeMs)}</span>

      <input
        type="range"
        className={styles.slider}
        min={0}
        max={durationMs || 1}
        value={currentTimeMs}
        onChange={(e) => seek(Number(e.target.value))}
      />

      <span className={styles.time}>{formatTime(durationMs)}</span>

      {!audioUrl && (
        <span className={styles.badge}>Simulated</span>
      )}
    </div>
  );
}
