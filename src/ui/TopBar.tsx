import { t } from './i18n'
import { formatGameDate } from './dates'
import type { GameState, Speed } from '../game/types'
import './TopBar.css'

const SPEEDS: readonly Speed[] = [0, 1, 2, 4]

interface TopBarProps {
  state: GameState
  onSpeed: (speed: Speed) => void
}

// Top bar: resources, the in-game date and the speed controls (Milestone 4).
// Pure view over the store snapshot — all strings flow through t().
export default function TopBar({ state, onSpeed }: TopBarProps) {
  return (
    <header className="app-header">
      <h1>{t('app.title')}</h1>
      <span className="app-status">{t('app.status')}</span>
      <span className="topbar-date">
        {formatGameDate(state.day)}
      </span>
      <div className="resource-chips">
        <span className="resource-chip">
          {t('resources.budget')}: {state.budget.toLocaleString('en-GB')}
        </span>
        <span className="resource-chip">
          {t('resources.time')}: {state.time} {t('resource.month')}
        </span>
        <span className="resource-chip">
          {t('resources.knowledge')}: {state.knowledge}
        </span>
      </div>
      <div className="speed-controls" role="group" aria-label={t('topbar.speedLabel')}>
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            className={`speed-button${state.speed === speed ? ' active' : ''}`}
            onClick={() => onSpeed(speed)}
            aria-pressed={state.speed === speed}
          >
            {speed === 0 ? t('topbar.pause') : `${speed}×`}
          </button>
        ))}
      </div>
    </header>
  )
}