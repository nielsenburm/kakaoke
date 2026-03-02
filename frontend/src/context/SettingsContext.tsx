import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react';
import { apiFetch } from '../data/apiClient';

export interface AppSettings {
  /** Semitones of leeway for pitch matching (0.5–4). Lower = harder. */
  pitchTolerance: number;
  /** RMS threshold for silence detection (0.005–0.05). Lower = more sensitive. */
  micSensitivity: number;
  /** Whether the vertical pitch gauge shows during singing. */
  showPitchIndicator: boolean;
  /** Auto-play audio preview on the song detail page. */
  autoPreview: boolean;
  /** Auto-play and auto-enable mic when entering the player. */
  autoPlay: boolean;
  /** Show video/background behind lyrics during singing. */
  showBackground: boolean;
  /** Lyrics position: 'center' or 'bottom'. */
  lyricsPosition: 'center' | 'bottom';
}

export const SETTINGS_DEFAULTS: AppSettings = {
  pitchTolerance: 2,
  micSensitivity: 0.01,
  showPitchIndicator: true,
  autoPreview: true,
  autoPlay: true,
  showBackground: true,
  lyricsPosition: 'bottom',
};

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>({ ...SETTINGS_DEFAULTS });

  useEffect(() => {
    apiFetch('/api/settings')
      .then((res) => {
        if (res.ok) return res.json();
        return null;
      })
      .then((data) => {
        if (data) setSettings({ ...SETTINGS_DEFAULTS, ...data });
      })
      .catch(() => { /* use defaults on error */ });
  }, []);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      apiFetch('/api/settings', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(next),
      }).catch(() => { /* silent */ });
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const defaults = { ...SETTINGS_DEFAULTS };
    setSettings(defaults);
    apiFetch('/api/settings', {
      method: 'PUT',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(defaults),
    }).catch(() => { /* silent */ });
  }, []);

  return (
    <SettingsContext.Provider value={{ settings, updateSettings, resetSettings }}>
      {children}
    </SettingsContext.Provider>
  );
}

export function useSettings(): SettingsContextValue {
  const ctx = useContext(SettingsContext);
  if (!ctx) throw new Error('useSettings must be used within a SettingsProvider');
  return ctx;
}
