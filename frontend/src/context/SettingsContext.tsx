import { createContext, useContext, useState, useCallback, type ReactNode } from 'react';

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
}

export const SETTINGS_DEFAULTS: AppSettings = {
  pitchTolerance: 2,
  micSensitivity: 0.01,
  showPitchIndicator: true,
  autoPreview: true,
  autoPlay: true,
  showBackground: true,
};

const STORAGE_KEY = 'kakaoke-settings';

function loadSettings(): AppSettings {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (raw) {
      const parsed = JSON.parse(raw);
      return { ...SETTINGS_DEFAULTS, ...parsed };
    }
  } catch { /* ignore corrupt data */ }
  return { ...SETTINGS_DEFAULTS };
}

function saveSettings(settings: AppSettings) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(settings));
}

interface SettingsContextValue {
  settings: AppSettings;
  updateSettings: (partial: Partial<AppSettings>) => void;
  resetSettings: () => void;
}

const SettingsContext = createContext<SettingsContextValue | null>(null);

export function SettingsProvider({ children }: { children: ReactNode }) {
  const [settings, setSettings] = useState<AppSettings>(loadSettings);

  const updateSettings = useCallback((partial: Partial<AppSettings>) => {
    setSettings((prev) => {
      const next = { ...prev, ...partial };
      saveSettings(next);
      return next;
    });
  }, []);

  const resetSettings = useCallback(() => {
    const defaults = { ...SETTINGS_DEFAULTS };
    saveSettings(defaults);
    setSettings(defaults);
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
