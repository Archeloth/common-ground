import { t } from './i18n'
import { formatGameDate } from './dates'
import type { LexiconEntryId } from './lexiconEntries'
import type { GameState, Speed } from '../game/types'
import './TopBar.css'

const SPEEDS: readonly Speed[] = [0, 1, 2, 4]

interface TopBarProps {
  state: GameState
  onSpeed: (speed: Speed) => void
  onLexicon: (entry: LexiconEntryId) => void
}

// Top bar: resources, the in-game date and the speed controls (Milestone 4).
// Pure view over the store snapshot — all strings flow through t().
export default function TopBar({ state, onSpeed, onLexicon }: TopBarProps) {
  return (
    <header className="app-header">
      <h1>{t('app.title')}</h1>
      <span className="app-status">{t('app.status')}</span>
      <span className="topbar-date">
        {formatGameDate(state.day)}
      </span>
      <div className="resource-chips">
        <button type="button" className="resource-chip" onClick={() => onLexicon('budget')}>
          {t('resources.budget')}: {state.budget.toLocaleString('en-GB')}
        </button>
        <button type="button" className="resource-chip" onClick={() => onLexicon('volunteers')}>
          {t('resources.time')}: {state.time}
        </button>
        <button type="button" className="resource-chip" onClick={() => onLexicon('knowledge')}>
          {t('resources.knowledge')}: {state.knowledge}
        </button>
        <button type="button" className="lexicon-toggle" onClick={() => onLexicon('welcome')}>
          {t('lexicon.open')}
        </button>
      </div>
      <div className="speed-controls" role="group" aria-label={t('topbar.speedLabel')}>
        {SPEEDS.map((speed) => (
          <button
            key={speed}
            type="button"
            className={`speed-button${state.speed === speed ? ' active' : ''}${state.speed === 0 && speed === 1 ? ' nudge' : ''}`}
            title={state.speed === 0 && speed === 1 ? t('topbar.pausedHint') : undefined}
            onClick={() => onSpeed(speed)}
            aria-pressed={state.speed === speed}
          >
            {speed === 0 ? t('topbar.pause') : speed === 1 && state.speed === 0 ? `▶ ${t('topbar.play')}` : `${speed}×`}
          </button>
        ))}
      </div>
    </header>
  )
}