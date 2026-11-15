import type { GameState, NeedId, ScenarioDef } from './types'
import { NEED_ORDER } from './needs'
import { loadProjects } from './projects'
import { loadScenario } from './scenario'
import milestonesCatalog from '../data/milestones.json'
import { activeProjectIds, countActive } from './expiry'

// The five chapter milestones (Milestone 6), as content: each is a list of
// state-checkable conditions plus a small Knowledge reward — the plan's
// "milestones as data (conditions on state)". tick() evaluates the uncompleted
// ones once per tick and queues a notification on completion.

export type MilestoneCondition =
  | { type: 'projectIn'; neighborhood: string; project: string }
  | { type: 'projectCount'; project: string; min: number }
  | { type: 'slotsFilled'; min: number }
  | { type: 'busLineCount'; min: number }
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

// Content is static, so it is parsed and validated once and then shared
// (callers must not mutate the result). Milestone 8.6 review: this used to
// re-validate on every call, from tick(), applyCommand() and each render.
let cachedLoadMilestones: MilestoneDef[] | null = null

export function loadMilestones(): MilestoneDef[] {
  cachedLoadMilestones ??= buildLoadMilestones()
  return cachedLoadMilestones
}

function buildLoadMilestones(): MilestoneDef[] {
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
      if (
        condition.type === 'projectCount' ||
        condition.type === 'slotsFilled' ||
        condition.type === 'busLineCount'
      ) {
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
  return def.conditions.every((condition) => conditionProgress(state, condition, scenario).met)
}

// Average coverage of one need across the town (milestone goals, Town view).
export function townNeedAverage(state: GameState, scenario: ScenarioDef, need: NeedId): number {
  let sum = 0
  for (const n of scenario.neighborhoods) sum += state.neighborhoods[n.id]?.needs[need] ?? 0
  return sum / scenario.neighborhoods.length
}

// One condition's progress (Milestone 8.5: the Town overview lists each task
// with how far along it is). `current` and `target` share the condition's
// unit: counts, satisfaction points or need coverage 0..1.
export interface ConditionProgress {
  met: boolean
  current: number
  target: number
}

export function conditionProgress(
  state: GameState,
  condition: MilestoneCondition,
  scenario: ScenarioDef,
): ConditionProgress {
  const done = (current: number, target: number): ConditionProgress => ({ met: current >= target, current, target })
  // Running projects only (Milestone 8.5): a lapsed project counts again once
  // it is renewed.
  switch (condition.type) {
    case 'projectIn':
      return done(activeProjectIds(state, condition.neighborhood).includes(condition.project) ? 1 : 0, 1)
    case 'projectCount':
      return done(countActive(state, condition.project), condition.min)
    case 'slotsFilled':
      return done(countActive(state), condition.min)
    case 'busLineCount':
      return done(state.busLines.length, condition.min)
    case 'townSatisfaction':
      return done(townSatisfaction(state, scenario), condition.min)
    case 'needsAverage':
      return done(townNeedAverage(state, scenario, condition.need), condition.min)
  }
}
