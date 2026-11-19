import type { GameState } from '../game/types'
import type { MilestoneCondition } from '../game/milestones'
import { conditionProgress } from '../game/milestones'
import { loadScenario, neighborhoodById } from '../game/scenario'
import { loadProjects, projectById } from '../game/projects'
import { t } from './i18n'
import { needLabel } from './needLabel'
import { transportText } from './transportText'

// Player-facing wording for one milestone task with its live progress, e.g.
// "Safe streets: 1 of 3 running" (shared by the goal tracker; Milestone 8.6).
export function taskText(state: GameState, condition: MilestoneCondition): string {
  const scenario = loadScenario()
  const projects = loadProjects()
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
      return transportText('task', { current: progress.current, target: progress.target })
    case 'townSatisfaction':
      return t('town.task.satisfaction', { current: Math.round(progress.current), target: progress.target })
    case 'needsAverage':
      return t('town.task.need', {
        need: needLabel(condition.need),
        current: Math.round(progress.current * 100),
        target: Math.round(progress.target * 100),
      })
  }
}

export function taskMet(state: GameState, condition: MilestoneCondition): boolean {
  return conditionProgress(state, condition, loadScenario()).met
}
