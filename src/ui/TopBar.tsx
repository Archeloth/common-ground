import { useMemo } from 'react'
import { t } from './i18n'
import { formatGameDate } from './dates'
import type { LexiconEntryId } from './lexiconEntries'
import { monthlyIncome, monthlyUpkeep, volunteerCap } from '../game/economy'
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
  hint: string
  warn?: boolean
}

// Top bar (Milestone 4, regrouped in 8.5): the clock on the left (date and
// speed), the three resources on the right, each with its monthly change from
// economy.ts. A chip opens its lexicon entry. All strings flow through t().
export default function TopBar({ state, onSpeed, onLexicon }: TopBarProps) {
  const income = useMemo(() => monthlyIncome(state, scenario), [state])
  const upkeep = useMemo(() => monthlyUpkeep(state), [state])
  const cap = useMemo(() => volunteerCap(state, scenario), [state])
  const net = income.budget - upkeep
  const fmt = (n: number) => n.toLocaleString('en-GB')
  const chips: Chip[] = [
    {
      entry: 'budget',
      icon: '💰',
      label: t('resources.budget'),
      value: fmt(state.budget),
      perMonth: net,
      // Taxes minus upkeep: the number that decides whether money grows.
      hint: t('topbar.budgetHint', { income: fmt(income.budget), upkeep: fmt(upkeep), net: (net >= 0 ? '+' : '') + fmt(net) }),
      warn: net < 0,
    },
    {
      entry: 'volunteers',
      icon: '🙋',
      label: t('resources.time'),
      value: t('topbar.ofCap', { value: state.time, cap }),
      perMonth: income.time,
      hint: t('topbar.volunteersHint', { income: income.time, cap }),
      warn: state.time >= cap,
    },
    {
      entry: 'knowledge',
      icon: '📚',
      label: t('resources.knowledge'),
      value: String(state.knowledge),
      perMonth: income.knowledge,
      hint: t('topbar.knowledgeHint', { income: income.knowledge }),
    },
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
            className={`resource-chip${chip.warn ? ' warn' : ''}`}
            title={chip.hint}
            onClick={() => onLexicon(chip.entry)}
          >
            <span aria-hidden="true">{chip.icon}</span>
            <span className="resource-label">{chip.label}</span>
            <strong>{chip.value}</strong>
            <span className="resource-income">{t('topbar.perMonth', { value: (chip.perMonth >= 0 ? '+' : '') + chip.perMonth.toLocaleString('en-GB') })}</span>
          </button>
        ))}
      </div>
    </header>
  )
}
