import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioPlayerState {
  currentTimeMs: number;
  durationMs: number;
  isPlaying: boolean;
  setAudioElement: (el: HTMLAudioElement | null) => void;
  play: () => void;
  pause: () => void;
  seek: (ms: number) => void;
  setSimulatedDuration: (ms: number) => void;
}

export function useAudioPlayer(audioUrl: string | null): AudioPlayerState {
  const audioElRef = useRef<HTMLAudioElement | null>(null);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const rafRef = useRef<number>(0);
  const simulatedRef = useRef({ playing: false, startWall: 0, startTime: 0 });
  const listenersRef = useRef<{ onMeta: () => void; onEnded: () => void } | null>(null);

  const hasAudio = audioUrl !== null;

  // Callback ref for the <audio> element — attaches event listeners immediately
  const setAudioElement = useCallback(
    (el: HTMLAudioElement | null) => {
      // Clean up old listeners
      const prev = audioElRef.current;
      if (prev && listenersRef.current) {
        prev.removeEventListener('loadedmetadata', listenersRef.current.onMeta);
        prev.removeEventListener('ended', listenersRef.current.onEnded);
        listenersRef.current = null;
      }

      audioElRef.current = el;

      // Attach new listeners
      if (el) {
        const onMeta = () => setDurationMs(el.duration * 1000);
        const onEnded = () => setIsPlaying(false);
        el.addEventListener('loadedmetadata', onMeta);
        el.addEventListener('ended', onEnded);
        listenersRef.current = { onMeta, onEnded };
        // If metadata already loaded
        if (el.readyState >= 1 && el.duration) {
          setDurationMs(el.duration * 1000);
        }
      }
    },
    [],
  );

  // rAF loop
  useEffect(() => {
    function tick() {
      if (hasAudio) {
        const el = audioElRef.current;
        if (el) {
          setCurrentTimeMs(el.currentTime * 1000);
        }
      } else {
        const sim = simulatedRef.current;
        if (sim.playing) {
          const elapsed = performance.now() - sim.startWall;
          setCurrentTimeMs(sim.startTime + elapsed);
        }
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafRef.current);
  }, [hasAudio]);

  const play = useCallback(() => {
    if (hasAudio) {
      audioElRef.current?.play().catch(() => {});
    } else {
      simulatedRef.current.playing = true;
      simulatedRef.current.startWall = performance.now();
    }
    setIsPlaying(true);
  }, [hasAudio]);

  const pause = useCallback(() => {
    if (hasAudio) {
      audioElRef.current?.pause();
    } else {
      simulatedRef.current.playing = false;
      simulatedRef.current.startTime = currentTimeMs;
    }
    setIsPlaying(false);
  }, [hasAudio, currentTimeMs]);

  const seek = useCallback(
    (ms: number) => {
      if (hasAudio && audioElRef.current) {
        audioElRef.current.currentTime = ms / 1000;
      }
      setCurrentTimeMs(ms);
      simulatedRef.current.startTime = ms;
      simulatedRef.current.startWall = performance.now();
    },
    [hasAudio],
  );

  const setSimulatedDuration = useCallback((ms: number) => {
    setDurationMs(ms);
  }, []);

  return {
    currentTimeMs,
    durationMs,
    isPlaying,
    setAudioElement,
    play,
    pause,
    seek,
    setSimulatedDuration,
  };
}
