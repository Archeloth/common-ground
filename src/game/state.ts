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
import { satisfactionOf, shortfalls } from './satisfaction'
import { TOP_REASONS } from './constants'

// Player commands (start/stop projects, set speed). All pure: applyCommand
// never mutates its input — it returns a fresh state on success and a
// machine-readable reason on refusal (plan: invalid actions are refused with a
// clear reason, not silently ignored). Removal deliberately gives no refund:
// the materials are already spent (see DECISIONS.md).

export function initialState(scenario: ScenarioDef): GameState {
  const projects: Record<string, Array<string | null>> = {}
  const neighborhoods: Record<string, NeighborhoodSimState> = {}
  for (const n of scenario.neighborhoods) {
    projects[n.id] = Array.from({ length: n.slots }, () => null)
    const needs = { ...n.needs }
    neighborhoods[n.id] = {
      needs,
      satisfaction: satisfactionOf(needs),
      reasons: shortfalls(needs, TOP_REASONS),
    }
  }
  return {
    budget: scenario.start.budget,
    time: scenario.start.time,
    knowledge: 0,
    day: 1,
    speed: 1,
    projects,
    neighborhoods,
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

// Question order matters for predictability (and is pinned by the tests):
// unknown ids first, then capacity (duplicate / no free slot), then
// eligibility (kind), then resources (budget, time).
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
    if (state.budget < project.cost) return refusal('insufficient_budget')
    if (state.time < project.time) return refusal('insufficient_time')

    const newSlots = slots.slice()
    newSlots[freeIndex] = command.project
    return {
      ok: true,
      state: {
        ...state,
        budget: state.budget - project.cost,
        time: state.time - project.time,
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

  // setSpeed (the only remaining variant) — the union guarantees `speed` here.
  if (![0, 1, 2, 4].includes(command.speed)) return refusal('invalid_speed')
  return { ok: true, state: { ...state, speed: command.speed } }
}

function refusal(reason: Reason): CommandResult {
  return { ok: false, reason }
}
