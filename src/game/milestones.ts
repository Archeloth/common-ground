import type { GameState, NeedId, ScenarioDef } from './types'
import { NEED_ORDER } from './needs'
import { loadProjects } from './projects'
import { loadScenario } from './scenario'
import milestonesCatalog from '../data/milestones.json'

// The five chapter milestones (Milestone 6), as content: each is a list of
// state-checkable conditions plus a small Knowledge reward — the plan's
// "milestones as data (conditions on state)". tick() evaluates the uncompleted
// ones once per tick and queues a notification on completion.

export type MilestoneCondition =
  | { type: 'projectIn'; neighborhood: string; project: string }
  | { type: 'projectCount'; project: string; min: number }
  | { type: 'slotsFilled'; min: number }
  | { type: 'townSatisfaction'; min: number }
  | { type: 'needsAverage'; need: NeedId; min: number }

export interface MilestoneDef {
  id: string
  name: string
  chapter: number
  goal: string
  explain: string
  conditions: MilestoneCondition[]
  reward: { knowledge: number }
}

function fail(what: string): never {
  throw new Error(`Milestones data error: ${what}`)
}

interface RawMilestone {
  id?: string
  name?: string
  chapter?: number
  goal?: string
  explain?: string
  conditions?: MilestoneCondition[]
  reward?: { knowledge?: number }
}

export function loadMilestones(): MilestoneDef[] {
  const raw = milestonesCatalog as unknown as { milestones?: RawMilestone[] }
  const milestones: MilestoneDef[] = (raw.milestones ?? []).map((m, index) => ({
    id: m.id ?? `#${index}`,
    name: m.name ?? '',
    chapter: m.chapter ?? 0,
    goal: m.goal ?? '',
    explain: m.explain ?? '',
    conditions: m.conditions ?? [],
    reward: { knowledge: m.reward?.knowledge ?? 0 },
  }))

  const scenario = loadScenario()
  const projects = loadProjects()
  const projectIds = new Set(projects.map((p) => p.id))
  const neighborhoodIds = new Set(scenario.neighborhoods.map((n) => n.id))

  const ids = new Set<string>()
  for (const def of milestones) {
    if (ids.has(def.id)) fail(`duplicate milestone id "${def.id}"`)
    ids.add(def.id)
    if (!def.name.trim() || !def.goal.trim() || !def.explain.trim()) {
      fail(`milestone "${def.id}" needs name, goal and explain texts`)
    }
    if (!Number.isInteger(def.chapter) || def.chapter < 1) {
      fail(`milestone "${def.id}" needs a chapter >= 1`)
    }
    if (def.conditions.length === 0) fail(`milestone "${def.id}" needs at least one condition`)
    if (!Number.isFinite(def.reward.knowledge) || def.reward.knowledge < 0) {
      fail(`milestone "${def.id}" reward knowledge must be >= 0`)
    }
    for (const condition of def.conditions) {
      if (condition.type === 'projectIn' || condition.type === 'projectCount') {
        if (!projectIds.has(condition.project)) {
          fail(`milestone "${def.id}" references unknown project "${condition.project}"`)
        }
      }
      if (condition.type === 'projectIn' && !neighborhoodIds.has(condition.neighborhood)) {
        fail(`milestone "${def.id}" references unknown neighborhood "${condition.neighborhood}"`)
      }
      if (condition.type === 'needsAverage' && !NEED_ORDER.includes(condition.need)) {
        fail(`milestone "${def.id}" references unknown need "${condition.need}"`)
      }
      if (condition.type === 'projectCount' || condition.type === 'slotsFilled') {
        if (!Number.isInteger(condition.min) || condition.min < 1) {
          fail(`milestone "${def.id}" counts must be positive integers`)
        }
      }
    }
  }

  if (milestones.length === 0) fail('the catalog lists no milestones')
  return milestones
}

export function milestoneById(milestones: readonly MilestoneDef[], id: string): MilestoneDef {
  const found = milestones.find((m) => m.id === id)
  if (!found) fail(`unknown milestone "${id}"`)
  return found
}

// Resident-weighted town satisfaction (plan: "Town satisfaction is the
// resident-weighted average").
export function townSatisfaction(state: GameState, scenario: ScenarioDef): number {
  let weighted = 0
  let residents = 0
  for (const n of scenario.neighborhoods) {
    const sat = state.neighborhoods[n.id]?.satisfaction ?? 0
    weighted += sat * n.residents
    residents += n.residents
  }
  return residents > 0 ? weighted / residents : 0
}

export function milestoneCompleted(state: GameState, def: MilestoneDef, scenario: ScenarioDef): boolean {
  return def.conditions.every((condition) => {
    switch (condition.type) {
      case 'projectIn':
        return (state.projects[condition.neighborhood] ?? []).includes(condition.project)
      case 'projectCount': {
        let total = 0
        for (const slots of Object.values(state.projects)) {
          for (const id of slots) if (id === condition.project) total++
        }
        return total >= condition.min
      }
      case 'slotsFilled': {
        let total = 0
        for (const slots of Object.values(state.projects)) {
          for (const id of slots) if (id !== null) total++
        }
        return total >= condition.min
      }
      case 'townSatisfaction':
        return townSatisfaction(state, scenario) >= condition.min
      case 'needsAverage': {
        let sum = 0
        for (const n of scenario.neighborhoods) {
          sum += state.neighborhoods[n.id]?.needs[condition.need] ?? 0
        }
        return sum / scenario.neighborhoods.length >= condition.min
      }
    }
  })
}