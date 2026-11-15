import type { GameState, ScenarioDef } from './types'
import { loadProjects, projectById } from './projects'
import { activeProjectIds } from './expiry'
import { townSatisfaction } from './milestones'
import {
  BUS_LINE_UPKEEP,
  COMMUNITY_TIME_BASE_PER_MONTH,
  COMMUNITY_TIME_ENGAGEMENT_FACTOR,
  KNOWLEDGE_BASE_PER_MONTH,
  TAX_BASE_PER_RESIDENT,
  TAX_SATISFACTION_PER_RESIDENT,
  UPKEEP_RATE,
  VOLUNTEER_CAP_BASE,
  VOLUNTEER_CAP_MONTHS,
} from './constants'

// The monthly settlement amounts (Milestone 8.5; scarcity added in the balance
// pass). tick() applies exactly these at each month boundary, and the top bar
// shows them, so the UI can never drift from the rules.

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
// Diminishing returns (balance pass): the same keen people come to every
// workshop, so Knowledge grows with the square root of the total - one series
// gives 2/month, four give 4, nine give 6 - instead of stacking without limit.
export function projectKnowledgeIncome(state: GameState): number {
  const projects = loadProjects()
  let total = 0
  for (const neighborhoodId of Object.keys(state.projects)) {
    for (const id of activeProjectIds(state, neighborhoodId)) total += projectById(projects, id).knowledgePerMonth
  }
  return Math.round(Math.sqrt(2 * total))
}

export function monthlyIncome(state: GameState, scenario: ScenarioDef): MonthlyIncome {
  const residents = scenario.neighborhoods.reduce((sum, n) => sum + n.residents, 0)
  const perResident = TAX_BASE_PER_RESIDENT + TAX_SATISFACTION_PER_RESIDENT * (townSatisfaction(state, scenario) / 100)
  return {
    budget: Math.round(residents * perResident),
    time:
      COMMUNITY_TIME_BASE_PER_MONTH +
      Math.round((averageEngagement(state, scenario) / 100) * COMMUNITY_TIME_ENGAGEMENT_FACTOR),
    knowledge: KNOWLEDGE_BASE_PER_MONTH + projectKnowledgeIncome(state),
  }
}

// One project's monthly upkeep (shown on its card before it is built).
export function projectUpkeep(cost: number): number {
  return Math.round(cost * UPKEEP_RATE)
}

// What the running projects and bus lines cost this month.
export function monthlyUpkeep(state: GameState): number {
  const projects = loadProjects()
  let total = state.busLines.length * BUS_LINE_UPKEEP
  for (const neighborhoodId of Object.keys(state.projects)) {
    for (const id of activeProjectIds(state, neighborhoodId)) total += projectUpkeep(projectById(projects, id).cost)
  }
  return total
}

// How many volunteers the pool can hold right now.
export function volunteerCap(state: GameState, scenario: ScenarioDef): number {
  return VOLUNTEER_CAP_BASE + VOLUNTEER_CAP_MONTHS * monthlyIncome(state, scenario).time
}
