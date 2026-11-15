import type { GameState, NeedId } from '../game/types'
import { loadScenario } from '../game/scenario'
import { conditionProgress, loadMilestones, townNeedAverage, townSatisfaction } from '../game/milestones'
import type { MilestoneCondition } from '../game/milestones'
import { loadProjects, projectById } from '../game/projects'
import { loadTechnologies } from '../game/technologies'
import { allExpired, countActive } from '../game/expiry'
import { NEED_ORDER } from '../game/needs'
import { neighborhoodById } from '../game/scenario'
import NeedBar from './NeedBar'
import { satisfactionTier } from './satisfactionTier'
import { t } from './i18n'
import './TownPanel.css'

const scenario = loadScenario()
const milestones = loadMilestones()
const projects = loadProjects()
const techCount = loadTechnologies().length
const totalResidents = scenario.neighborhoods.reduce((sum, n) => sum + n.residents, 0)

interface TownPanelProps {
  state: GameState
  onSelect: (neighborhoodId: string) => void
}

function taskText(state: GameState, condition: MilestoneCondition): string {
  const progress = conditionProgress(state, condition, scenario)
  switch (condition.type) {
    case 'projectIn':
      return t('town.task.projectIn', {
        project: projectById(projects, condition.project).name,
        neighborhood: neighborhoodById(scenario, condition.neighborhood).name,
      })
    case 'projectCount':
      return t('town.task.projectCount', {
        project: projectById(projects, condition.project).name,
        current: progress.current,
        target: progress.target,
      })
    case 'slotsFilled':
      return t('town.task.slots', { current: progress.current, target: progress.target })
    case 'busLineCount':
      return t('town.task.bus', { current: progress.current, target: progress.target })
    case 'townSatisfaction':
      return t('town.task.satisfaction', { current: Math.round(progress.current), target: progress.target })
    case 'needsAverage':
      return t('town.task.need', {
        need: t(`need.${condition.need}`),
        current: Math.round(progress.current * 100),
        target: Math.round(progress.target * 100),
      })
  }
}

function weakestNeed(state: GameState, id: string): { need: NeedId; value: number } {
  const needs = state.neighborhoods[id]?.needs
  let best: { need: NeedId; value: number } = { need: NEED_ORDER[0], value: 1 }
  for (const need of NEED_ORDER) {
    const value = needs?.[need] ?? 0
    if (value < best.value) best = { need, value }
  }
  return best
}

// The Town overview drawer (Milestone 8.5 playtest feedback: "city overall
// stats visible somewhere"): headline numbers, the current chapter with each
// task's progress, town-wide need averages and every neighbourhood ranked by
// satisfaction (worst first, click to open).
export default function TownPanel({ state, onSelect }: TownPanelProps) {
  const satisfaction = townSatisfaction(state, scenario)
  const tier = satisfactionTier(satisfaction)
  const lapsed = allExpired(state, scenario).length
  const chapter = milestones.find((m) => !state.milestones.includes(m.id))
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
        <div className="town-stat">
          <dt>{t('town.busLines')}</dt>
          <dd>{state.busLines.length}</dd>
        </div>
        <div className="town-stat">
          <dt>{t('town.research')}</dt>
          <dd>
            {state.research.length}/{techCount}
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
        <h4>{chapter ? t('town.chapter', { chapter: chapter.chapter, name: chapter.name }) : t('town.allDone')}</h4>
        {chapter && (
          <>
            <p className="town-chapter-explain">{chapter.explain}</p>
            <ul className="town-tasks">
              {chapter.conditions.map((condition, index) => {
                const met = conditionProgress(state, condition, scenario).met
                return (
                  <li key={index} className={met ? 'met' : ''}>
                    <span className="town-task-check" aria-hidden="true">
                      {met ? '✓' : '○'}
                    </span>
                    <span className="sr-only">{met ? t('town.taskDone') : t('town.taskOpen')}</span>
                    {taskText(state, condition)}
                  </li>
                )
              })}
            </ul>
          </>
        )}
      </section>

      <section className="town-section">
        <h4>{t('town.needs')}</h4>
        <div className="needs-grid">
          {NEED_ORDER.map((need) => (
            <NeedBar key={need} label={t(`need.${need}`)} value={townNeedAverage(state, scenario, need)} />
          ))}
        </div>
      </section>

      <section className="town-section">
        <h4>{t('town.ranking')}</h4>
        <ul className="town-ranking">
          {ranked.map((n) => {
            const sat = state.neighborhoods[n.id]?.satisfaction ?? 0
            const weak = weakestNeed(state, n.id)
            const rowTier = satisfactionTier(sat)
            return (
              <li key={n.id}>
                <button type="button" onClick={() => onSelect(n.id)}>
                  <span className={`tier-dot tier-${rowTier}`} aria-hidden="true" />
                  <span className="town-rank-name">{n.name}</span>
                  <span className="town-rank-weak">
                    {t('town.weakest', { need: t(`need.${weak.need}`), pct: Math.round(weak.value * 100) })}
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
