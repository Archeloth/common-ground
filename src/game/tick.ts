import type { GameState, NeighborhoodSimState, Needs, ProjectEffect } from './types'
import { loadScenario } from './scenario'
import { loadProjects, projectById } from './projects'
import { satisfactionOf, shortfalls } from './satisfaction'
import { clamp, moveNeedsToward, needTargets, round } from './needs'
import {
  BUDGET_PER_RESIDENT_PER_MONTH,
  COMMUNITY_TIME_BASE_PER_MONTH,
  COMMUNITY_TIME_ENGAGEMENT_FACTOR,
  NEED_DRIFT_PER_TICK,
  SATISFACTION_SMOOTH_PER_TICK,
  TICKS_PER_MONTH,
  TOP_REASONS,
} from './constants'

// The pure simulation tick (plan coding standard 5: no Date.now, no random, no
// DOM — same input always gives the same output). One tick = one in-game day.
//
// Every tick:
// - each neighbourhood's needs drift toward their target (base + active
//   project effects) at NEED_DRIFT_PER_TICK;
// - the displayed satisfaction moves 5% toward the weighted target
//   (the plan's wording) and the top-three shortfalls are stored as reasons;
// - on every 30th day the monthly settlement runs: Budget income from local
//   taxes and Community-time regeneration from the average engagement.

function activeEffects(state: GameState, neighborhoodId: string): ProjectEffect[] {
  const projects = loadProjects()
  const slots = state.projects[neighborhoodId] ?? []
  const effects: ProjectEffect[] = []
  for (const id of slots) {
    if (id !== null) effects.push(...projectById(projects, id).effects)
  }
  return effects
}

export function tick(state: GameState): GameState {
  const scenario = loadScenario()
  const day = state.day + 1

  const neighborhoods: Record<string, NeighborhoodSimState> = {}
  for (const n of scenario.neighborhoods) {
    const current = state.neighborhoods[n.id]
    const base: Needs = { ...n.needs }
    const target = needTargets(base, activeEffects(state, n.id))
    const needs = moveNeedsToward(current?.needs ?? base, target, NEED_DRIFT_PER_TICK)
    const goal = satisfactionOf(needs)
    const satisfaction = current
      ? clamp(round(current.satisfaction + (goal - current.satisfaction) * SATISFACTION_SMOOTH_PER_TICK, 1), 0, 100)
      : goal

    neighborhoods[n.id] = {
      needs,
      satisfaction,
      reasons: shortfalls(needs, TOP_REASONS),
    }
  }

  let budget = state.budget
  let time = state.time
  // Elapsed days = day - 1 (day starts at 1), so the 30th elapsed day settles.
  if (day > 1 && (day - 1) % TICKS_PER_MONTH === 0) {
    const residents = scenario.neighborhoods.reduce((sum, n) => sum + n.residents, 0)
    budget = Math.round(budget + residents * BUDGET_PER_RESIDENT_PER_MONTH)
    const avgEngagement =
      scenario.neighborhoods.reduce((sum, n) => sum + n.engagement, 0) / scenario.neighborhoods.length
    time =
      time +
      COMMUNITY_TIME_BASE_PER_MONTH +
      Math.round((avgEngagement / 100) * COMMUNITY_TIME_ENGAGEMENT_FACTOR)
  }

  return { ...state, day, budget, time, neighborhoods }
}