import type { GameState, ScenarioDef } from './types'
import { loadProjects, projectById } from './projects'
import { activeProjectIds } from './expiry'
import {
  BUDGET_PER_RESIDENT_PER_MONTH,
  COMMUNITY_TIME_BASE_PER_MONTH,
  COMMUNITY_TIME_ENGAGEMENT_FACTOR,
  KNOWLEDGE_BASE_PER_MONTH,
} from './constants'

// The monthly settlement amounts (Milestone 8.5). tick() pays exactly these at
// each month boundary, and the top bar shows them as "+x/mo", so the UI can
// never drift from the rules.

export interface MonthlyIncome {
  budget: number
  time: number // Volunteers
  knowledge: number
}

export function averageEngagement(state: GameState, scenario: ScenarioDef): number {
  let sum = 0
  for (const n of scenario.neighborhoods) sum += state.engagement[n.id] ?? n.engagement
  return sum / scenario.neighborhoods.length
}

// Knowledge paid each month by running projects anywhere in town (workshops).
export function projectKnowledgeIncome(state: GameState): number {
  const projects = loadProjects()
  let total = 0
  for (const neighborhoodId of Object.keys(state.projects)) {
    for (const id of activeProjectIds(state, neighborhoodId)) total += projectById(projects, id).knowledgePerMonth
  }
  return total
}

export function monthlyIncome(state: GameState, scenario: ScenarioDef): MonthlyIncome {
  const residents = scenario.neighborhoods.reduce((sum, n) => sum + n.residents, 0)
  return {
    budget: Math.round(residents * BUDGET_PER_RESIDENT_PER_MONTH),
    time:
      COMMUNITY_TIME_BASE_PER_MONTH +
      Math.round((averageEngagement(state, scenario) / 100) * COMMUNITY_TIME_ENGAGEMENT_FACTOR),
    knowledge: KNOWLEDGE_BASE_PER_MONTH + projectKnowledgeIncome(state),
  }
}
