import type {
  Command,
  CommandResult,
  GameState,
  NeighborhoodDef,
  NeighborhoodSimState,
  Reason,
  ScenarioDef,
} from './types'
import { loadScenario } from './scenario'
import { loadProjects } from './projects'
import { loadTechnologies } from './technologies'
import { TUTORIAL_DONE } from './tutorial'
import { satisfactionOf, shortfalls } from './satisfaction'
import {
  BUS_LINE_COST,
  ENGAGEMENT_MAX,
  PROJECT_TIME_ENGAGEMENT_DIVISOR,
  TOP_REASONS,
  TOWN_MEETING_ENGAGEMENT,
  TOWN_MEETING_TIME,
} from './constants'

// Player commands (start/stop projects, set speed, research, dismiss milestone
// notices). All pure: applyCommand never mutates its input — it returns a fresh
// state on success and a machine-readable reason on refusal (plan: invalid
// actions are refused with a clear reason, not silently ignored). Removal
// deliberately gives no refund: the materials are already spent (DECISIONS.md).

export function initialState(scenario: ScenarioDef): GameState {
  const projects: Record<string, Array<string | null>> = {}
  const neighborhoods: Record<string, NeighborhoodSimState> = {}
  const engagement: Record<string, number> = {}
  const messages: Record<string, 'open' | 'done'> = {}
  for (const n of scenario.neighborhoods) {
    projects[n.id] = Array.from({ length: n.slots }, () => null)
    const needs = { ...n.needs }
    neighborhoods[n.id] = {
      needs,
      satisfaction: satisfactionOf(needs),
      reasons: shortfalls(needs, TOP_REASONS),
    }
    engagement[n.id] = n.engagement
    messages[n.id] = 'open'
  }
  return {
    budget: scenario.start.budget,
    time: scenario.start.time,
    knowledge: scenario.start.knowledge ?? 0,
    day: 1,
    speed: 1,
    projects,
    neighborhoods,
    research: [...scenario.start.unlockedTech],
    milestones: [],
    milestoneNotices: [],
    engagement,
    busLines: [],
    messages,
    tutorialStep: 0,
  }
}

// Missing neighborhoods default to all-free slots, so a stale save can't crash
// the commands — they just behave as if nothing was ever built there.
function slotsOf(state: GameState, neighborhood: NeighborhoodDef): Array<string | null> {
  const slots = state.projects[neighborhood.id]
  return slots && slots.length === neighborhood.slots
    ? slots
    : Array.from({ length: neighborhood.slots }, () => null)
}

// The dynamic engagement of a neighborhood (falls back to the scenario's
// starting value for a stale save).
function engagementOf(state: GameState, neighborhood: NeighborhoodDef): number {
  return state.engagement[neighborhood.id] ?? neighborhood.engagement
}

// Community-time discount from engagement (plan: "high engagement ... complete
// grassroots projects faster"). 100 engagement halves the listed time cost.
export function projectTimeCost(projectTime: number, engagement: number): number {
  return Math.max(1, Math.round(projectTime * (1 - engagement / PROJECT_TIME_ENGAGEMENT_DIVISOR)))
}

// Question order matters for predictability (and is pinned by the tests):
// unknown ids first, then capacity (duplicate / no free slot), then
// eligibility (kind, then research), then resources (budget, time).
export function applyCommand(state: GameState, command: Command): CommandResult {
  const scenario = loadScenario()

  if (command.type === 'startProject') {
    const neighborhood = scenario.neighborhoods.find((n) => n.id === command.neighborhood)
    if (!neighborhood) return refusal('unknown_neighborhood')
    const project = loadProjects().find((p) => p.id === command.project)
    if (!project) return refusal('unknown_project')

    const slots = slotsOf(state, neighborhood)
    if (slots.includes(command.project)) return refusal('project_already_active')
    const freeIndex = slots.indexOf(null)
    if (freeIndex === -1) return refusal('no_free_slot')
    if (!project.allowedKinds.includes(neighborhood.kind)) return refusal('not_allowed_in_kind')
    if (project.requiresTech && !state.research.includes(project.requiresTech)) {
      return refusal('tech_not_researched')
    }
    if (state.budget < project.cost) return refusal('insufficient_budget')
    const timeCost = projectTimeCost(project.time, engagementOf(state, neighborhood))
    if (state.time < timeCost) return refusal('insufficient_time')

    const newSlots = slots.slice()
    newSlots[freeIndex] = command.project
    return {
      ok: true,
      state: {
        ...state,
        budget: state.budget - project.cost,
        time: state.time - timeCost,
        projects: { ...state.projects, [neighborhood.id]: newSlots },
      },
    }
  }

  if (command.type === 'removeProject') {
    // No budget/time refund (the materials are spent).
    const neighborhood = scenario.neighborhoods.find((n) => n.id === command.neighborhood)
    if (!neighborhood) return refusal('unknown_neighborhood')
    const slots = slotsOf(state, neighborhood)
    if (!Number.isInteger(command.slot) || command.slot < 0 || command.slot >= slots.length) {
      return refusal('invalid_slot')
    }
    if (slots[command.slot] === null) return refusal('empty_slot')

    const newSlots = slots.slice()
    newSlots[command.slot] = null
    return {
      ok: true,
      state: { ...state, projects: { ...state.projects, [neighborhood.id]: newSlots } },
    }
  }

  if (command.type === 'townMeeting') return applyTownMeeting(state, command.neighborhood)

  if (command.type === 'startBusLine') return applyStartBusLine(state, command.from, command.to)

  if (command.type === 'research') return applyResearch(state, command.tech)

  if (command.type === 'clearMilestoneNotices') {
    return { ok: true, state: { ...state, milestoneNotices: [] } }
  }

  // Tutorial (Milestone 8): the player's "Continue" on the intro card.
  if (command.type === 'tutorialNext') return applyTutorialNext(state)

  // setSpeed, the only remaining variant.
  if (![0, 1, 2, 4].includes(command.speed)) return refusal('invalid_speed')
  return { ok: true, state: { ...state, speed: command.speed } }
}

// The organizer's lever (plan): costs 1 Community time, +10 engagement.
function applyTownMeeting(state: GameState, neighborhoodId: string): CommandResult {
  const scenario = loadScenario()
  const neighborhood = scenario.neighborhoods.find((n) => n.id === neighborhoodId)
  if (!neighborhood) return refusal('unknown_neighborhood')
  if (state.time < TOWN_MEETING_TIME) return refusal('insufficient_time')
  const current = engagementOf(state, neighborhood)
  return {
    ok: true,
    state: {
      ...state,
      time: state.time - TOWN_MEETING_TIME,
      engagement: {
        ...state.engagement,
        [neighborhoodId]: Math.min(ENGAGEMENT_MAX, current + TOWN_MEETING_ENGAGEMENT),
      },
    },
  }
}

// A bus line links two adjacent neighborhoods: budget cost, no Community time,
// and needs the public transport research (plan's starter-project table).
function applyStartBusLine(state: GameState, from: string, to: string): CommandResult {
  const scenario = loadScenario()
  const fromDef = scenario.neighborhoods.find((n) => n.id === from)
  const toDef = scenario.neighborhoods.find((n) => n.id === to)
  if (!fromDef || !toDef) return refusal('unknown_neighborhood')
  if (!fromDef.neighbors.includes(to) || !toDef.neighbors.includes(from)) {
    return refusal('not_adjacent')
  }
  const pair: [string, string] = [from, to].sort() as [string, string]
  if (state.busLines.some(([a, b]) => a === pair[0] && b === pair[1])) {
    return refusal('bus_line_exists')
  }
  if (!state.research.includes('public_transport')) return refusal('prerequisites_not_met')
  if (state.budget < BUS_LINE_COST) return refusal('insufficient_budget')
  return {
    ok: true,
    state: {
      ...state,
      budget: state.budget - BUS_LINE_COST,
      busLines: [...state.busLines, pair],
    },
  }
}

// Research (Milestone 6): a technology is researchable when it exists, is not
// already researched, all its prerequisites are done and enough Knowledge is
// left (same question order style as projects: identity -> capacity ->
// eligibility -> resources).
function applyResearch(state: GameState, techId: string): CommandResult {
  const tech = loadTechnologies().find((t) => t.id === techId)
  if (!tech) return refusal('unknown_tech')
  if (state.research.includes(techId)) return refusal('already_researched')
  const missing = tech.prerequisites.filter((id) => !state.research.includes(id))
  if (missing.length > 0) return refusal('prerequisites_not_met')
  if (state.knowledge < tech.cost) return refusal('insufficient_knowledge')
  return {
    ok: true,
    state: {
      ...state,
      knowledge: state.knowledge - tech.cost,
      research: [...state.research, techId],
    },
  }
}

function refusal(reason: Reason): CommandResult {
  return { ok: false, reason }
}

// The tutorial's info step (Milestone 8): "Continue" moves to the next step;
// action steps complete by themselves in tick(). Never moves past the done
// sentinel (TUTORIAL_DONE).
function applyTutorialNext(state: GameState): CommandResult {
  if (state.tutorialStep >= TUTORIAL_DONE) return { ok: true, state }
  return { ok: true, state: { ...state, tutorialStep: state.tutorialStep + 1 } }
}
