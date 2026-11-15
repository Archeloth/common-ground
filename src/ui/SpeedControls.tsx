import type { Speed } from '../game/types'
import { t } from './i18n'
import './SpeedControls.css'

const SPEEDS: readonly Speed[] = [0, 1, 2, 4]

// Small inline SVG icons: pause bars, then one, two and three play triangles.
function SpeedIcon({ speed }: { speed: Speed }) {
  if (speed === 0) {
    return (
      <svg viewBox="0 0 16 16" width="14" height="14" aria-hidden="true">
        <rect x="3.5" y="3" width="3" height="10" rx="1" />
        <rect x="9.5" y="3" width="3" height="10" rx="1" />
      </svg>
    )
  }
  const count = speed === 1 ? 1 : speed === 2 ? 2 : 3
  const width = 7 + (count - 1) * 5
  return (
    <svg viewBox={`0 0 ${width + 2} 16`} width={(width + 2) * 0.9} height="14" aria-hidden="true">
      {Array.from({ length: count }, (_, i) => (
        <path key={i} d={`M${1 + i * 5} 3.2 L${8 + i * 5} 8 L${1 + i * 5} 12.8 Z`} strokeLinejoin="round" />
      ))}
    </svg>
  )
}

const LABEL_KEYS: Record<Speed, string> = { 0: 'speed.pause', 1: 'speed.normal', 2: 'speed.fast', 4: 'speed.fastest' }
const SHORTCUTS: Record<Speed, string> = { 0: 'Space', 1: '1', 2: '2', 4: '3' }

// The clock's speed control as one segmented group (Milestone 8.6 feedback:
// "a button group so they read as one control"). Icons carry the meaning,
// the accessible names and tooltips spell it out with the keyboard shortcut.
export default function SpeedControls({ speed, onSpeed }: { speed: Speed; onSpeed: (speed: Speed) => void }) {
  return (
    <div className="speed-group" role="radiogroup" aria-label={t('topbar.speedLabel')}>
      {SPEEDS.map((value) => {
        const active = speed === value
        const nudge = speed === 0 && value === 1
        const label = t(LABEL_KEYS[value])
        return (
          <button
            key={value}
            type="button"
            role="radio"
            data-sound="toggle"
            aria-checked={active}
            aria-label={label}
            title={nudge ? t('topbar.pausedHint') : t('speed.tooltip', { label, key: SHORTCUTS[value] })}
            className={`speed-segment${active ? ' active' : ''}${nudge ? ' nudge' : ''}`}
            onClick={() => onSpeed(value)}
          >
            <SpeedIcon speed={value} />
          </button>
        )
      })}
    </div>
  )
}
