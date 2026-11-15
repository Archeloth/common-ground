import { updateSettings, useSettings } from './settings'
import type { Settings } from './settings'
import { t } from './i18n'

type VolumeKey = 'masterVolume' | 'musicVolume' | 'effectsVolume'
type FlagKey = 'muted' | 'reducedMotion' | 'largeText' | 'pauseOnPanels'

const VOLUMES: VolumeKey[] = ['masterVolume', 'musicVolume', 'effectsVolume']
const FLAGS: FlagKey[] = ['reducedMotion', 'largeText', 'pauseOnPanels']

function Volume({ id, settings }: { id: VolumeKey; settings: Settings }) {
  const percent = Math.round(settings[id] * 100)
  return (
    <label className="setting-row">
      <span>{t(`settings.${id}`)}</span>
      <input
        type="range"
        min={0}
        max={100}
        step={5}
        value={percent}
        disabled={settings.muted}
        onChange={(event) => updateSettings({ [id]: Number(event.target.value) / 100 })}
      />
      <output>{percent}%</output>
    </label>
  )
}

function Toggle({ id, settings }: { id: FlagKey; settings: Settings }) {
  return (
    <label className="setting-row toggle">
      <span>
        {t(`settings.${id}`)}
        <small>{t(`settings.${id}.hint`)}</small>
      </span>
      <input type="checkbox" checked={settings[id]} onChange={(event) => updateSettings({ [id]: event.target.checked })} />
    </label>
  )
}

// Settings (Milestone 8.6): audio, motion, text size and pausing. They apply
// immediately and persist on this device (settings.ts). Sound itself arrives
// with Milestone 9; the levels are stored and wired to the audio façade.
export default function SettingsScreen({ onBack }: { onBack: () => void }) {
  const settings = useSettings()
  return (
    <section className="menu-panel settings" aria-label={t('menu.settings')}>
      <h2>{t('menu.settings')}</h2>

      <fieldset>
        <legend>{t('settings.audio')}</legend>
        <p className="settings-note">{t('settings.audioSoon')}</p>
        {VOLUMES.map((id) => (
          <Volume key={id} id={id} settings={settings} />
        ))}
        <Toggle id="muted" settings={settings} />
      </fieldset>

      <fieldset>
        <legend>{t('settings.comfort')}</legend>
        {FLAGS.map((id) => (
          <Toggle key={id} id={id} settings={settings} />
        ))}
      </fieldset>

      <div className="menu-row">
        <button type="button" className="menu-link" onClick={onBack}>
          {t('menu.back')}
        </button>
      </div>
    </section>
  )
}
