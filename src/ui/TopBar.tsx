import { useMemo } from 'react'
import { t } from './i18n'
import { formatGameDate } from './dates'
import type { LexiconEntryId } from './lexiconEntries'
import { monthlyIncome } from '../game/economy'
import { loadScenario } from '../game/scenario'
import type { GameState, Speed } from '../game/types'
import SpeedControls from './SpeedControls'
import './TopBar.css'

const scenario = loadScenario()

interface TopBarProps {
  state: GameState
  onSpeed: (speed: Speed) => void
  onLexicon: (entry: LexiconEntryId) => void
}

interface Chip {
  entry: LexiconEntryId
  icon: string
  label: string
  value: string
  perMonth: number
}

// Top bar (Milestone 4, regrouped in 8.5): the clock on the left (date and
// speed), the three resources on the right, each with its monthly change from
// economy.ts. A chip opens its lexicon entry. All strings flow through t().
export default function TopBar({ state, onSpeed, onLexicon }: TopBarProps) {
  const income = useMemo(() => monthlyIncome(state, scenario), [state])
  const chips: Chip[] = [
    { entry: 'budget', icon: '💰', label: t('resources.budget'), value: state.budget.toLocaleString('en-GB'), perMonth: income.budget },
    { entry: 'volunteers', icon: '🙋', label: t('resources.time'), value: String(state.time), perMonth: income.time },
    { entry: 'knowledge', icon: '📚', label: t('resources.knowledge'), value: String(state.knowledge), perMonth: income.knowledge },
  ]

  return (
    <header className="app-header">
      <h1>{t('app.title')}</h1>

      <div className="topbar-clock">
        <span className="topbar-date">{formatGameDate(state.day)}</span>
        <SpeedControls speed={state.speed} onSpeed={onSpeed} />
      </div>

      <div className="resource-chips">
        {chips.map((chip) => (
          <button
            key={chip.entry}
            type="button"
            className="resource-chip"
            title={t('topbar.chipHint', { label: chip.label })}
            onClick={() => onLexicon(chip.entry)}
          >
            <span aria-hidden="true">{chip.icon}</span>
            <span className="resource-label">{chip.label}</span>
            <strong>{chip.value}</strong>
            <span className="resource-income">{t('topbar.perMonth', { value: chip.perMonth.toLocaleString('en-GB') })}</span>
          </button>
        ))}
      </div>
    </header>
  )
}
