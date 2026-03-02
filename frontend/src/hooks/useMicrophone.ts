import { useState, useRef, useCallback, useEffect } from 'react';

export interface MicrophoneState {
  isActive: boolean;
  isRequesting: boolean;
  error: string | null;
  /** Detected MIDI note number (float), or null if silence / no mic */
  currentPitch: number | null;
  requestMic: () => Promise<void>;
  stopMic: () => void;
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
  // Store sensitivity in a ref so the interval tick always reads the latest value
  const sensitivityRef = useRef(sensitivity);
  sensitivityRef.current = sensitivity;

  const stopMic = useCallback(() => {
    if (intervalRef.current) clearInterval(intervalRef.current);
    intervalRef.current = null;
    streamRef.current?.getTracks().forEach((t) => t.stop());
    audioCtxRef.current?.close();
    audioCtxRef.current = null;
    analyserRef.current = null;
    streamRef.current = null;
    bufferRef.current = null;
    filterRef.current.reset();
    setIsActive(false);
    setCurrentPitch(null);
  }, []);

  const requestMic = useCallback(async () => {
    if (isActive) return;
    setIsRequesting(true);
    setError(null);
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        audio: {
          echoCancellation: true,
          noiseSuppression: true,
          autoGainControl: true,
        },
      });
      const ctx = new AudioContext();
      const source = ctx.createMediaStreamSource(stream);
      const analyser = ctx.createAnalyser();
      analyser.fftSize = 4096; // larger buffer → better low-freq resolution
      source.connect(analyser);
      // Do NOT connect to destination — avoids feedback

      audioCtxRef.current = ctx;
      analyserRef.current = analyser;
      streamRef.current = stream;
      bufferRef.current = new Float32Array(analyser.fftSize);
      setIsActive(true);

      // Run pitch detection at ~15 Hz — gives the buffer time to fill with
      // fresh samples between reads, producing much more stable results
      // than the previous requestAnimationFrame (~60 Hz) approach.
      const filter = filterRef.current;
      filter.reset();

      intervalRef.current = setInterval(() => {
        if (analyserRef.current && audioCtxRef.current && bufferRef.current) {
          const rawPitch = detectPitch(analyserRef.current, audioCtxRef.current.sampleRate, bufferRef.current, sensitivityRef.current);
          setCurrentPitch(filter.push(rawPitch));
        }
      }, 66);
    } catch (e) {
      const msg =
        e instanceof DOMException && e.name === 'NotAllowedError'
          ? 'Microphone access denied. Please allow mic access in your browser settings.'
          : 'Could not access microphone.';
      setError(msg);
    } finally {
      setIsRequesting(false);
    }
  }, [isActive]);

  // Cleanup on unmount
  useEffect(() => () => stopMic(), [stopMic]);

  return { isActive, isRequesting, error, currentPitch, requestMic, stopMic };
}
