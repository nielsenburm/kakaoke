import { Link } from 'react-router-dom';
import { useSettings, SETTINGS_DEFAULTS } from '../../context/SettingsContext';
import styles from './SettingsPage.module.css';

function difficultyLabel(tolerance: number): string {
  if (tolerance <= 1) return 'Hard';
  if (tolerance <= 2) return 'Medium';
  if (tolerance <= 3) return 'Easy';
  return 'Very Easy';
}

function sensitivityLabel(rms: number): string {
  if (rms <= 0.01) return 'High — picks up quiet singing';
  if (rms <= 0.025) return 'Medium';
  return 'Low — ignores background noise';
}

export function SettingsPage() {
  const { settings, updateSettings, resetSettings } = useSettings();

  return (
    <div className={styles.page}>
      <Link to="/" className={styles.back}>&larr; Back to Library</Link>

      <h1 className={styles.heading}>Settings</h1>

      {/* ── Scoring ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Scoring</h2>

        <div className={styles.field}>
          <div className={styles.fieldHeader}>
            <label className={styles.label} htmlFor="pitchTolerance">Pitch Tolerance</label>
            <span className={styles.value}>
              {settings.pitchTolerance} semitone{settings.pitchTolerance !== 1 ? 's' : ''}
            </span>
          </div>
          <input
            id="pitchTolerance"
            type="range"
            className={styles.slider}
            min={0.5}
            max={4}
            step={0.5}
            value={settings.pitchTolerance}
            onChange={(e) => updateSettings({ pitchTolerance: Number(e.target.value) })}
          />
          <div className={styles.hint}>
            <span>Harder</span>
            <span className={styles.badge}>{difficultyLabel(settings.pitchTolerance)}</span>
            <span>Easier</span>
          </div>
        </div>
      </section>

      {/* ── Microphone ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Microphone</h2>

        <div className={styles.field}>
          <div className={styles.fieldHeader}>
            <label className={styles.label} htmlFor="micSensitivity">Sensitivity</label>
            <span className={styles.value}>{settings.micSensitivity.toFixed(3)}</span>
          </div>
          <input
            id="micSensitivity"
            type="range"
            className={styles.slider}
            min={0.005}
            max={0.05}
            step={0.005}
            value={settings.micSensitivity}
            onChange={(e) => updateSettings({ micSensitivity: Number(e.target.value) })}
          />
          <div className={styles.hint}>
            <span>More sensitive</span>
            <span className={styles.badge}>{sensitivityLabel(settings.micSensitivity)}</span>
            <span>Less sensitive</span>
          </div>
        </div>
      </section>

      {/* ── Playback ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Playback</h2>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={settings.autoPreview}
            onChange={(e) => updateSettings({ autoPreview: e.target.checked })}
          />
          <span className={styles.toggleSwitch} />
          <span className={styles.toggleLabel}>Auto-play Preview</span>
        </label>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={settings.autoPlay}
            onChange={(e) => updateSettings({ autoPlay: e.target.checked })}
          />
          <span className={styles.toggleSwitch} />
          <span className={styles.toggleLabel}>Auto-play on Start</span>
        </label>
      </section>

      {/* ── Display ── */}
      <section className={styles.section}>
        <h2 className={styles.sectionTitle}>Display</h2>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={settings.showPitchIndicator}
            onChange={(e) => updateSettings({ showPitchIndicator: e.target.checked })}
          />
          <span className={styles.toggleSwitch} />
          <span className={styles.toggleLabel}>Show Pitch Indicator</span>
        </label>

        <label className={styles.toggle}>
          <input
            type="checkbox"
            className={styles.checkbox}
            checked={settings.showBackground}
            onChange={(e) => updateSettings({ showBackground: e.target.checked })}
          />
          <span className={styles.toggleSwitch} />
          <span className={styles.toggleLabel}>Show Background</span>
        </label>

        <div className={styles.field}>
          <div className={styles.fieldHeader}>
            <span className={styles.label}>Lyrics Position</span>
          </div>
          <div className={styles.segmented}>
            <button
              className={`${styles.segmentedBtn} ${settings.lyricsPosition === 'center' ? styles.segmentedActive : ''}`}
              onClick={() => updateSettings({ lyricsPosition: 'center' })}
            >
              Center
            </button>
            <button
              className={`${styles.segmentedBtn} ${settings.lyricsPosition === 'bottom' ? styles.segmentedActive : ''}`}
              onClick={() => updateSettings({ lyricsPosition: 'bottom' })}
            >
              Bottom
            </button>
          </div>
        </div>
      </section>

      {/* ── Reset ── */}
      <button
        className={styles.resetButton}
        onClick={resetSettings}
        disabled={
          settings.pitchTolerance === SETTINGS_DEFAULTS.pitchTolerance &&
          settings.micSensitivity === SETTINGS_DEFAULTS.micSensitivity &&
          settings.showPitchIndicator === SETTINGS_DEFAULTS.showPitchIndicator &&
          settings.autoPreview === SETTINGS_DEFAULTS.autoPreview &&
          settings.autoPlay === SETTINGS_DEFAULTS.autoPlay &&
          settings.showBackground === SETTINGS_DEFAULTS.showBackground &&
          settings.lyricsPosition === SETTINGS_DEFAULTS.lyricsPosition
        }
      >
        Reset to Defaults
      </button>
    </div>
  );
}
