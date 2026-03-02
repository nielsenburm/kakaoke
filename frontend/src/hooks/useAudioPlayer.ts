import { useState, useRef, useCallback, useEffect } from 'react';

export interface AudioPlayerState {
  /** Throttled time for React UI (~15 fps). Use getCurrentTimeMs() for real-time access. */
  currentTimeMs: number;
  /** Stable getter for real-time position (reads from ref, no re-render). */
  getCurrentTimeMs: () => number;
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
  const currentTimeMsRef = useRef(0);
  const [currentTimeMs, setCurrentTimeMs] = useState(0);
  const [durationMs, setDurationMs] = useState(0);
  const [isPlaying, setIsPlaying] = useState(false);
  const rafRef = useRef<number>(0);
  const lastStateUpdateRef = useRef(0);
  const simulatedRef = useRef({ playing: false, startWall: 0, startTime: 0 });
  const listenersRef = useRef<{ onMeta: () => void; onEnded: () => void } | null>(null);

  const hasAudio = audioUrl !== null;
  const mountedRef = useRef(true);

  const getCurrentTimeMs = useCallback(() => currentTimeMsRef.current, []);

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

  // rAF loop — update ref every frame, throttle React state to ~15 fps
  useEffect(() => {
    mountedRef.current = true;
    function tick() {
      if (!mountedRef.current) return;
      let ms = currentTimeMsRef.current;
      if (hasAudio) {
        const el = audioElRef.current;
        if (el) ms = el.currentTime * 1000;
      } else {
        const sim = simulatedRef.current;
        if (sim.playing) {
          ms = sim.startTime + (performance.now() - sim.startWall);
        }
      }
      currentTimeMsRef.current = ms;

      const now = performance.now();
      if (now - lastStateUpdateRef.current >= 66) {
        lastStateUpdateRef.current = now;
        setCurrentTimeMs(ms);
      }
      rafRef.current = requestAnimationFrame(tick);
    }
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      mountedRef.current = false;
      cancelAnimationFrame(rafRef.current);
      // Pause audio element on unmount so it doesn't keep playing
      audioElRef.current?.pause();
    };
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
      currentTimeMsRef.current = ms;
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
    getCurrentTimeMs,
    durationMs,
    isPlaying,
    setAudioElement,
    play,
    pause,
    seek,
    setSimulatedDuration,
  };
}
