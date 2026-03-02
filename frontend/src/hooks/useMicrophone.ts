import { useState, useRef, useCallback, useEffect } from 'react';

export interface MicrophoneState {
  isActive: boolean;
  isRequesting: boolean;
  error: string | null;
  /** Detected MIDI note number (float), or null if silence / no mic */
  currentPitch: number | null;
  requestMic: () => Promise<void>;
  stopMic: () => void;
  /** Fully release mic resources (call on unmount) */
  releaseMic: () => void;
}

/**
 * Autocorrelation-based pitch detection on time-domain samples.
 * Returns MIDI note number (float) or null if no clear pitch found.
 */
function detectPitch(analyser: AnalyserNode, sampleRate: number, buffer: Float32Array, rmsThreshold: number): number | null {
  analyser.getFloatTimeDomainData(buffer);

  // RMS energy check — skip silence
  let rms = 0;
  for (let i = 0; i < buffer.length; i++) rms += buffer[i] * buffer[i];
  rms = Math.sqrt(rms / buffer.length);
  if (rms < rmsThreshold) return null;

  // Autocorrelation: search for the lag with best normalised correlation
  // Vocal range ~80 Hz – 1000 Hz
  const minLag = Math.floor(sampleRate / 1000);
  const maxLag = Math.floor(sampleRate / 80);
  const n = buffer.length;

  let bestCorr = 0;
  let bestLag = -1;

  for (let lag = minLag; lag <= maxLag && lag < n; lag++) {
    let sum = 0;
    let energy1 = 0;
    let energy2 = 0;
    for (let i = 0; i < n - lag; i++) {
      sum += buffer[i] * buffer[i + lag];
      energy1 += buffer[i] * buffer[i];
      energy2 += buffer[i + lag] * buffer[i + lag];
    }
    const norm = Math.sqrt(energy1 * energy2);
    if (norm === 0) continue;
    const corr = sum / norm;
    if (corr > bestCorr) {
      bestCorr = corr;
      bestLag = lag;
    }
  }

  if (bestLag < 1 || bestCorr < 0.8) return null;

  // Parabolic interpolation for sub-sample accuracy
  let refinedLag = bestLag;
  if (bestLag > minLag && bestLag < maxLag) {
    const corrPrev = computeNormCorr(buffer, bestLag - 1, n);
    const corrNext = computeNormCorr(buffer, bestLag + 1, n);
    const shift = (corrPrev - corrNext) / (2 * (corrPrev - 2 * bestCorr + corrNext));
    if (isFinite(shift)) refinedLag = bestLag + shift;
  }

  const frequency = sampleRate / refinedLag;
  // Convert Hz to MIDI note: A4 (440 Hz) = MIDI 69
  return 12 * Math.log2(frequency / 440) + 69;
}

function computeNormCorr(buffer: Float32Array, lag: number, n: number): number {
  let sum = 0;
  let e1 = 0;
  let e2 = 0;
  for (let i = 0; i < n - lag; i++) {
    sum += buffer[i] * buffer[i + lag];
    e1 += buffer[i] * buffer[i];
    e2 += buffer[i + lag] * buffer[i + lag];
  }
  const norm = Math.sqrt(e1 * e2);
  return norm === 0 ? 0 : sum / norm;
}

/**
 * Rolling median filter for pitch values.
 * Keeps the last N valid (non-null) readings and returns the median.
 * Median is much more robust than mean against octave-jump outliers.
 */
class PitchMedianFilter {
  private readonly window: number[] = [];
  private readonly size: number;
  private nullCount = 0;
  private readonly nullThreshold: number;

  constructor(size = 5, nullThreshold = 3) {
    this.size = size;
    // After this many consecutive nulls, output null (silence detected)
    this.nullThreshold = nullThreshold;
  }

  push(value: number | null): number | null {
    if (value === null) {
      this.nullCount++;
      // Once enough consecutive nulls, it's truly silent — clear history
      if (this.nullCount >= this.nullThreshold) {
        this.window.length = 0;
        return null;
      }
      // Brief dropout — return last median if we have data
      return this.window.length > 0 ? this.median() : null;
    }

    this.nullCount = 0;
    this.window.push(value);
    if (this.window.length > this.size) this.window.shift();
    return this.median();
  }

  private median(): number {
    const sorted = [...this.window].sort((a, b) => a - b);
    const mid = Math.floor(sorted.length / 2);
    return sorted.length % 2 === 0
      ? (sorted[mid - 1] + sorted[mid]) / 2
      : sorted[mid];
  }

  reset() {
    this.window.length = 0;
    this.nullCount = 0;
  }
}

export function useMicrophone(sensitivity = 0.01): MicrophoneState {
  const [isActive, setIsActive] = useState(false);
  const [isRequesting, setIsRequesting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [currentPitch, setCurrentPitch] = useState<number | null>(null);

  const audioCtxRef = useRef<AudioContext | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const intervalRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const bufferRef = useRef<Float32Array | null>(null);
  const filterRef = useRef(new PitchMedianFilter(5, 3));
  const lastPitchRef = useRef<number | null>(null);
  const mountedRef = useRef(true);
  // Store sensitivity in a ref so the interval tick always reads the latest value
  const sensitivityRef = useRef(sensitivity);
  sensitivityRef.current = sensitivity;

  const startDetection = useCallback(() => {
    if (intervalRef.current) return;
    const filter = filterRef.current;
    filter.reset();
    lastPitchRef.current = null;
    intervalRef.current = setInterval(() => {
      if (!mountedRef.current) return;
      if (analyserRef.current && audioCtxRef.current && bufferRef.current) {
        const rawPitch = detectPitch(analyserRef.current, audioCtxRef.current.sampleRate, bufferRef.current, sensitivityRef.current);
        const filtered = filter.push(rawPitch);
        // Only trigger React re-render when the pitch value actually changed
        if (filtered !== lastPitchRef.current) {
          lastPitchRef.current = filtered;
          setCurrentPitch(filtered);
        }
      }
    }, 66);
  }, []);

  const stopDetection = useCallback(() => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }
    filterRef.current.reset();
    setCurrentPitch(null);
  }, []);

  const releaseMic = useCallback(() => {
    stopDetection();
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    bufferRef.current = null;
    setIsActive(false);
  }, [stopDetection]);

  const stopMic = useCallback(() => {
    // Just stop detection — keep AudioContext and stream alive for fast re-enable
    stopDetection();
    setIsActive(false);
  }, [stopDetection]);

  const requestMic = useCallback(async () => {
    if (isActive) return;
    setError(null);

    // If we already have a live stream, just restart detection
    if (audioCtxRef.current && streamRef.current && streamRef.current.active) {
      // Resume AudioContext if it was suspended
      if (audioCtxRef.current.state === 'suspended') {
        await audioCtxRef.current.resume();
      }
      startDetection();
      setIsActive(true);
      return;
    }

    // Otherwise acquire mic from scratch
    setIsRequesting(true);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: false,
          noiseSuppression: false,
          autoGainControl: true,
        },
      });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096;
      source.connect(analyser);

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      streamRef.current = stream;
      bufferRef.current = new Float32Array(analyser.fftSize);
      setIsActive(true);

      startDetection();
    } catch (e) {
      const msg =
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow mic access in your browser settings.'
          : 'Could not access microphone.';
      setError(msg);
    } finally {
      setIsRequesting(false);
    }
  }, [isActive, startDetection]);

  // Cleanup on unmount
  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      releaseMic();
    };
  }, [releaseMic]);

  return { isActive, isRequesting, error, currentPitch, requestMic, stopMic, releaseMic };
}
