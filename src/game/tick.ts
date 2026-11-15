import type { GameState, NeighborhoodSimState, Needs, ProjectEffect } from './types'
import type { NeighborhoodDef } from './types'
import { loadScenario } from './scenario'
import { loadProjects, projectById } from './projects'
import { loadMilestones, milestoneCompleted } from './milestones'
import { messageCatalog, messageFulfilled, applyMessageReward } from './messages'
import { advanceTutorial } from './tutorial'
import { satisfactionOf, shortfalls } from './satisfaction'
import { clamp, clamp01, moveNeedsToward, needTargets, round } from './needs'
import {
  BUDGET_PER_RESIDENT_PER_MONTH,
  BUS_MOBILITY_BONUS,
  COMMUNITY_TIME_BASE_PER_MONTH,
  COMMUNITY_TIME_ENGAGEMENT_FACTOR,
  ENGAGEMENT_MAX,
  FOOD_SHARE_EFFICIENCY,
  KNOWLEDGE_BASE_PER_MONTH,
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
//   project effects), plus two Milestone 7 target additions: imported food
//   from adjacent surpluses and the mobility bonus of bus lines;
// - the displayed satisfaction moves 5% toward the weighted target and the
//   top-three shortfalls are stored as reasons;
// - on every 30th day the monthly settlement runs: Budget income from local
//   taxes, Community-time regeneration from the dynamic average engagement,
//   and engagement growth from running projects (garden +5/month);
// - open resident messages are fulfilled (reward paid once) when met;
//   milestones complete the moment their conditions are met.

function activeEffects(state: GameState, neighborhoodId: string): ProjectEffect[] {
  const projects = loadProjects()
  const slots = state.projects[neighborhoodId] ?? []
  const effects: ProjectEffect[] = []
  for (const id of slots) {
    if (id !== null) effects.push(...projectById(projects, id).effects)
  }
  return effects
}

// Sum of the engagement deltas of the projects running in a neighborhood
// (plan: community garden "+5 per month while it runs").
function engagementBonusOf(state: GameState, neighborhoodId: string): number {
  const projects = loadProjects()
  const slots = state.projects[neighborhoodId] ?? []
  let bonus = 0
  for (const id of slots) {
    if (id !== null) bonus += projectById(projects, id).engagement
  }
  return bonus
}

// Knowledge paid each month by the projects running anywhere in town
// (Milestone 8.5: the workshop series).
function knowledgeIncome(state: GameState): number {
  const projects = loadProjects()
  let total = 0
  for (const slots of Object.values(state.projects)) {
    for (const id of slots) if (id !== null) total += projectById(projects, id).knowledgePerMonth
  }
  return total
}

// Mobility target bonus from bus lines touching the neighborhood.
function busBonusOf(state: GameState, neighborhoodId: string): number {
  return state.busLines.reduce(
    (sum, [a, b]) => (a === neighborhoodId || b === neighborhoodId ? sum + BUS_MOBILITY_BONUS : sum),
    0,
  )
}

function averageEngagement(state: GameState, scenario: ReturnType<typeof loadScenario>): number {
  let sum = 0
  for (const n of scenario.neighborhoods) sum += state.engagement[n.id] ?? n.engagement
  return sum / scenario.neighborhoods.length
}

// Unclamped food supply ratio in demand multiples (so surplus past 1 is visible).
function ownFoodRatio(state: GameState, neighborhood: NeighborhoodDef): number {
  let ratio = neighborhood.needs.food
  for (const effect of activeEffects(state, neighborhood.id)) {
    if (effect.need === 'food') ratio += effect.change
  }
  return ratio
}

// Food surplus flows to adjacent neighborhoods at FOOD_SHARE_EFFICIENCY
// (transport losses; plan: "food surplus flows to adjacent neighborhoods with
// a shortfall"). Each sharer's surplus is split evenly among its neighbors.
function importedFood(state: GameState, scenario: ReturnType<typeof loadScenario>): Record<string, number> {
  const surplus: Record<string, number> = {}
  const neighborCount: Record<string, number> = {}
  for (const n of scenario.neighborhoods) {
    surplus[n.id] = Math.max(0, ownFoodRatio(state, n) - 1)
    neighborCount[n.id] = Math.max(1, n.neighbors.length)
  }
  const imported: Record<string, number> = {}
  for (const n of scenario.neighborhoods) {
    let total = 0
    for (const neighborId of n.neighbors) {
      total += (surplus[neighborId] * FOOD_SHARE_EFFICIENCY) / neighborCount[neighborId]
    }
    imported[n.id] = total
  }
  return imported
}

export function tick(state: GameState): GameState {
  const scenario = loadScenario()
  const day = state.day + 1
  const sharing = importedFood(state, scenario)

  const neighborhoods: Record<string, NeighborhoodSimState> = {}
  for (const n of scenario.neighborhoods) {
    const current = state.neighborhoods[n.id]
    const base: Needs = { ...n.needs }
    const target = needTargets(base, activeEffects(state, n.id))
    // Milestone 7 target additions: imported food and bus mobility sit on top
    // of the project effects already inside `target`.
    target.food = clamp01(target.food + sharing[n.id])
    target.mobility = clamp01(target.mobility + busBonusOf(state, n.id))

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
  let engagement = state.engagement
  let knowledge = state.knowledge
  // Elapsed days = day - 1 (day starts at 1), so the 30th elapsed day settles.
  if (day > 1 && (day - 1) % TICKS_PER_MONTH === 0) {
    const residents = scenario.neighborhoods.reduce((sum, n) => sum + n.residents, 0)
    budget = Math.round(budget + residents * BUDGET_PER_RESIDENT_PER_MONTH)
    const avgEngagement = averageEngagement(state, scenario)
    time =
      time +
      COMMUNITY_TIME_BASE_PER_MONTH +
      Math.round((avgEngagement / 100) * COMMUNITY_TIME_ENGAGEMENT_FACTOR)

    // Running projects raise engagement each month they run (garden +5).
    const nextEngagement: Record<string, number> = { ...engagement }
    for (const n of scenario.neighborhoods) {
      const current = nextEngagement[n.id] ?? n.engagement
      nextEngagement[n.id] = Math.min(ENGAGEMENT_MAX, current + engagementBonusOf(state, n.id))
    }
    engagement = nextEngagement
    knowledge += KNOWLEDGE_BASE_PER_MONTH + knowledgeIncome(state)
  }

  // Resident messages (Milestone 7): an open request that is met pays once.
  let messages = state.messages
  for (const def of messageCatalog()) {
    if (messages[def.neighborhood] === 'done') continue
    if (messageFulfilled(state, def)) {
      const rewarded = applyMessageReward({ ...state, budget, time, knowledge }, def)
      budget = rewarded.budget
      time = rewarded.time
      knowledge = rewarded.knowledge
      messages = { ...messages, [def.neighborhood]: 'done' }
    }
  }

  // Milestone 6: check uncompleted chapters once per tick; newly completed ones
  // are recorded, queued as a notice and pay out their Knowledge reward.
  let milestones = state.milestones
  let milestoneNotices = state.milestoneNotices
  const withNewSim = { ...state, day, budget, time, neighborhoods }
  for (const def of loadMilestones()) {
    if (milestones.includes(def.id)) continue
    if (milestoneCompleted(withNewSim, def, scenario)) {
      milestones = [...milestones, def.id]
      milestoneNotices = [...milestoneNotices, def.id]
      knowledge += def.reward.knowledge
    }
  }

  return advanceTutorial(
    { ...withNewSim, knowledge, engagement, messages, milestones, milestoneNotices },
    scenario,
  )
}