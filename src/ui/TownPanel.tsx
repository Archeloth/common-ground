import { useEffect } from 'react'
import type { GameState, NeedId } from '../game/types'
import { loadScenario } from '../game/scenario'
import { loadMilestones, townNeedAverage, townSatisfaction } from '../game/milestones'
import { techTreeFor } from '../game/regionContent'
import { allExpired, countActive } from '../game/expiry'
import { visibleNeeds } from '../game/satisfaction'
import { monthlyIncome, monthlyUpkeep } from '../game/economy'
import NeedBar from './NeedBar'
import TownHistory from './TownHistory'
import { satisfactionTier } from './satisfactionTier'
import { t } from './i18n'
import './TownPanel.css'
import { needLabel } from './needLabel'
import { transportText } from './transportText'


interface TownPanelProps {
  state: GameState
  onSelect: (neighborhoodId: string) => void
  // Hovering (or focusing) a town-wide need shows every district's value on the map.
  onHighlightNeed?: (need: NeedId | null) => void
}

function weakestNeed(state: GameState, id: string, shown: readonly NeedId[]): { need: NeedId; value: number } {
  const needs = state.neighborhoods[id]?.needs
  let best: { need: NeedId; value: number } = { need: shown[0], value: 1 }
  for (const need of shown) {
    const value = needs?.[need] ?? 0
    if (value < best.value) best = { need, value }
  }
  return best
}

// The Town overview drawer (Milestone 8.5 playtest feedback: "city overall
// stats visible somewhere"): headline numbers, town-wide need averages and
// every neighbourhood ranked by satisfaction (worst first, click to open).
// Chapter goals live in the always-visible GoalTracker (Milestone 8.6).
export default function TownPanel({ state, onSelect, onHighlightNeed }: TownPanelProps) {
  const scenario = loadScenario()
  const milestones = loadMilestones()
  const totalResidents = scenario.neighborhoods.reduce((sum, n) => sum + n.residents, 0)
  // Never leave the map highlighted when the drawer closes.
  useEffect(() => () => onHighlightNeed?.(null), [onHighlightNeed])
  const satisfaction = townSatisfaction(state, scenario)
  const tier = satisfactionTier(satisfaction)
  const lapsed = allExpired(state, scenario).length
  const ranked = [...scenario.neighborhoods].sort(
    (a, b) => (state.neighborhoods[a.id]?.satisfaction ?? 0) - (state.neighborhoods[b.id]?.satisfaction ?? 0),
  )

  return (
    <div className="town-panel">
      <h3 className="town-title">{t('town.title', { name: scenario.name })}</h3>

      <dl className="town-stats">
        <div className={`town-stat tier-${tier}`}>
          <dt>{t('town.satisfaction')}</dt>
          <dd>
            {Math.round(satisfaction)}
            <span className="town-stat-note">{t(`tier.${tier}`)}</span>
          </dd>
        </div>
        <div className="town-stat">
          <dt>{t('town.residents')}</dt>
          <dd>{totalResidents.toLocaleString('en-GB')}</dd>
        </div>
        <div className="town-stat">
          <dt>{t('town.projects')}</dt>
          <dd>
            {countActive(state)}
            {lapsed > 0 && <span className="town-stat-note warn">{t('town.lapsed', { count: lapsed })}</span>}
          </dd>
        </div>
        <div className={`town-stat${monthlyUpkeep(state) > monthlyIncome(state, scenario).budget ? ' tier-low' : ''}`}>
          <dt>{t('town.upkeep')}</dt>
          <dd>
            {monthlyUpkeep(state).toLocaleString('en-GB')}
            <span className="town-stat-note">
              {t('town.upkeepOf', { income: monthlyIncome(state, scenario).budget.toLocaleString('en-GB') })}
            </span>
          </dd>
        </div>
        <div className="town-stat">
          <dt>{transportText('count')}</dt>
          <dd>{state.busLines.length}</dd>
        </div>
        <div className="town-stat">
          <dt>{t('town.research')}</dt>
          <dd>
            {state.research.length}/{techTreeFor(scenario).length}
          </dd>
        </div>
        <div className="town-stat">
          <dt>{t('town.milestones')}</dt>
          <dd>
            {state.milestones.length}/{milestones.length}
          </dd>
        </div>
      </dl>

      <section className="town-section">
        <h4>{t('history.title')}</h4>
        <TownHistory history={state.history ?? []} />
      </section>

      <section className="town-section">
        <h4>{t('town.needs')}</h4>
        <p className="town-hint">{t('town.needHover')}</p>
        <div className="needs-grid" onMouseLeave={() => onHighlightNeed?.(null)}>
          {visibleNeeds(scenario).map((need) => (
            <div
              key={need}
              className="need-hover"
              tabIndex={0}
              onMouseEnter={() => onHighlightNeed?.(need)}
              onFocus={() => onHighlightNeed?.(need)}
              onBlur={() => onHighlightNeed?.(null)}
            >
              <NeedBar need={need} label={needLabel(need)} value={townNeedAverage(state, scenario, need)} />
            </div>
          ))}
        </div>
      </section>

      <section className="town-section">
        <h4>{t('town.ranking')}</h4>
        <ul className="town-ranking">
          {ranked.map((n) => {
            const sat = state.neighborhoods[n.id]?.satisfaction ?? 0
            const weak = weakestNeed(state, n.id, visibleNeeds(scenario))
            const rowTier = satisfactionTier(sat)
            return (
              <li key={n.id}>
                <button type="button" onClick={() => onSelect(n.id)}>
                  <span className={`tier-dot tier-${rowTier}`} aria-hidden="true" />
                  <span className="town-rank-name">{n.name}</span>
                  <span className="town-rank-weak">
                    {t('town.weakest', { need: needLabel(weak.need), pct: Math.round(weak.value * 100) })}
                  </span>
                  <span className="town-rank-sat">{Math.round(sat)}</span>
                </button>
              </li>
            )
          })}
        </ul>
      </section>
    </div>
  )
}
