import type { CrossingDef, ScenarioDef, NeighborhoodDef } from './types'
import { TRANSPORT_MODES } from './transport'
import { SEASON_SET_IDS } from './calendar'
import { CROSSING_KINDS, WATER_KINDS, crossingsBetween, isPool, linkCrossesWater, waterById } from './water'
import { districtOutline, outlineBox } from './outline'
import { kindById, loadKinds } from './kinds'
import { NEED_ORDER } from './needs'
import { SATISFACTION_WEIGHTS } from './satisfaction'
import { regionContentProblems } from './regionContent'
import willowbrookTown from '../data/scenarios/willowbrook/town.json'
import willowbrookMilestones from '../data/scenarios/willowbrook/milestones.json'
import willowbrookMessages from '../data/scenarios/willowbrook/messages.json'
import willowbrookStories from '../data/scenarios/willowbrook/stories.json'
import hollinTown from '../data/scenarios/hollin_green/town.json'
import hollinMilestones from '../data/scenarios/hollin_green/milestones.json'
import hollinMessages from '../data/scenarios/hollin_green/messages.json'
import remansoTown from '../data/scenarios/remanso_verde/town.json'
import remansoMilestones from '../data/scenarios/remanso_verde/milestones.json'
import remansoMessages from '../data/scenarios/remanso_verde/messages.json'
import kumoTown from '../data/scenarios/kumonotani/town.json'
import kumoMilestones from '../data/scenarios/kumonotani/milestones.json'
import kumoMessages from '../data/scenarios/kumonotani/messages.json'
import talaTown from '../data/scenarios/tala_ifri/town.json'
import talaMilestones from '../data/scenarios/tala_ifri/milestones.json'
import talaMessages from '../data/scenarios/tala_ifri/messages.json'

// Content validation lives here so a typo in a scenario JSON fails loudly
// with the offending id instead of drawing a wrong map or crashing later.
// Called once at load and once by the unit tests (plan: "fail loudly").

function fail(what: string, detail = ''): never {
  throw new Error(`Scenario data error: ${what}${detail ? ` — ${detail}` : ''}`)
}

export function validateScenario(s: ScenarioDef): void {
  for (const [field, value] of [['name', s.name], ['region', s.region], ['tagline', s.tagline], ['blurb', s.blurb], ['theme', s.theme]] as const) {
    if (typeof value !== 'string' || !value.trim()) fail(`the scenario needs a ${field}`, s.id)
  }
  let weightSum = 0
  for (const need of NEED_ORDER) {
    const w = s.needWeights?.[need]
    if (!Number.isFinite(w) || w < 0) fail(`need weight "${need}" must be a number >= 0`, s.id)
    weightSum += w
  }
  if (Math.abs(weightSum - 1) > 1e-9) fail('need weights must add up to 1', s.id)

  const seenIds = new Set<string>()
  const seenNames = new Set<string>()
  for (const n of s.neighborhoods) {
    if (seenIds.has(n.id)) fail('duplicate neighborhood id', n.id)
    seenIds.add(n.id)
    if (seenNames.has(n.name)) fail('duplicate neighborhood name', n.name)
    seenNames.add(n.name)

    const { shape } = n
    for (const value of [shape.x, shape.y, shape.radius, shape.seed]) {
      if (!Number.isFinite(value)) fail('shape value must be finite', n.id)
    }
    if (!(shape.radius > 0)) fail('shape.radius must be positive', n.id)
    if (!Number.isInteger(shape.seed)) fail('shape.seed must be an integer', n.id)

    for (const need of NEED_ORDER) {
      const value = n.needs[need]
      if (!Number.isFinite(value) || value < 0 || value > 1) {
        fail(`need coverage "${need}" must be a number in [0, 1]`, n.id)
      }
    }
    if (!(n.slots > 0)) fail('slots must be positive', n.id)
    if (!(n.residents > 0)) fail('residents must be positive', n.id)
    if (n.engagement < 0 || n.engagement > 100) fail('engagement must be in [0, 100]', n.id)
    // Milestone 10: a town only uses district kinds from its own region.
    if (!kindById(loadKinds(), n.kind).regions.includes(s.theme)) {
      fail(`district kind "${n.kind}" is not part of the "${s.theme}" region`, n.id)
    }
  }
  if (seenIds.size !== s.neighborhoods.length) fail('all neighborhoods must have ids')

  for (const n of s.neighborhoods) {
    for (const neighborId of n.neighbors) {
      if (!seenIds.has(neighborId)) fail('unknown neighbor reference', `${n.id} -> ${neighborId}`)
      const other = neighborhoodById(s, neighborId)
      if (!other.neighbors.includes(n.id)) fail('neighbor links must be symmetric', `${n.id} <-> ${neighborId}`)
    }
  }

  // Water (Milestone 8.5, a list of features since Milestone 10): rivers and
  // wadis are polylines, an oasis a closed pool; crossings sit between two
  // neighbours, on a river or wadi.
  const waterIds = new Set<string>()
  for (const w of s.water) {
    if (!w.id || waterIds.has(w.id)) fail('water needs a unique id', w.id)
    waterIds.add(w.id)
    if (!(WATER_KINDS as readonly string[]).includes(w.kind)) fail(`unknown water kind "${w.kind}"`, w.id)
    const minPoints = isPool(w) ? 3 : 2
    if (w.points.length < minPoints) fail(`a ${w.kind} needs at least ${minPoints} points`, w.id)
    for (const p of w.points) {
      if (!Number.isFinite(p.x) || !Number.isFinite(p.y)) fail('water points must be finite', w.id)
    }
    if (!isPool(w) && !(w.halfDepth > 0)) fail('halfDepth must be positive', w.id)
  }

  if (s.seasons !== undefined && !(SEASON_SET_IDS as readonly string[]).includes(s.seasons)) {
    fail(`unknown season set "${s.seasons}"`, s.id)
  }
  if (s.transport !== undefined && !(TRANSPORT_MODES as readonly string[]).includes(s.transport.mode)) {
    fail(`unknown transport mode "${s.transport.mode}"`, s.id)
  }

  const crossingKeys = new Set<string>()
  for (const crossing of s.crossings) {
    const { from, to, point, kind } = crossing
    if (!seenIds.has(from) || !seenIds.has(to)) fail('crossing endpoint does not exist', `${from} -> ${to}`)
    if (from === to) fail('a crossing cannot link a neighborhood to itself', from)
    if (!(CROSSING_KINDS as readonly string[]).includes(kind)) fail(`unknown crossing kind "${kind}"`, `${from} <-> ${to}`)
    const water = waterById(s, crossing.water)
    if (!water) fail('crossing names unknown water', `${from} <-> ${to}: ${crossing.water}`)
    if (isPool(water)) fail('nothing crosses an oasis; districts sit around it', `${from} <-> ${to}`)
    const a = neighborhoodById(s, from)
    const b = neighborhoodById(s, to)
    if (!a.neighbors.includes(to) || !b.neighbors.includes(from)) {
      fail('crossing endpoints must list each other as neighbors', `${from} <-> ${to}`)
    }
    if (!point || !Number.isFinite(point.x) || !Number.isFinite(point.y)) fail('crossing needs a finite point', `${from} <-> ${to}`)
    crossingKeys.add(`${pairKey(from, to)}|${water.id}`)
  }

  // Links may only cross a river or wadi at a crossing, and never an oasis.
  // Adjacency is what bus lines follow, so this is checked once, here.
  for (const n of s.neighborhoods) {
    for (const neighborId of n.neighbors) {
      if (n.id > neighborId) continue
      const other = neighborhoodById(s, neighborId)
      for (const w of s.water) {
        if (!linkCrossesWater(w, n.shape, other.shape)) continue
        if (isPool(w)) fail('neighbors cannot link across an oasis', `${n.id} <-> ${neighborId}`)
        if (!crossingKeys.has(`${pairKey(n.id, neighborId)}|${w.id}`)) {
          fail(`neighbors across the ${w.kind} need a crossing`, `${n.id} <-> ${neighborId}`)
        }
      }
    }
  }
}

function pairKey(a: string, b: string): string {
  return a < b ? `${a}|${b}` : `${b}|${a}`
}

// The first crossing between two neighbourhoods, if their link crosses water.
export function crossingBetween(s: ScenarioDef, a: string, b: string): CrossingDef | null {
  return crossingsBetween(s, a, b)[0] ?? null
}

// The scenario registry (Milestone 10). Each town is a folder under
// src/data/scenarios/<id>/: the map and start (town.json), its chapters,
// its resident messages and, optionally, its citizen stories. Shared
// catalogs (technologies, projects, wildlife, district kinds) stay global.
// Everything is a static import, so offline play keeps working.

export interface ScenarioContent {
  town: unknown
  milestones: unknown
  messages: unknown
  stories?: unknown
}

const SCENARIOS: Record<string, ScenarioContent> = {
  willowbrook: {
    town: willowbrookTown,
    milestones: willowbrookMilestones,
    messages: willowbrookMessages,
    stories: willowbrookStories,
  },
  hollin_green: {
    town: hollinTown,
    milestones: hollinMilestones,
    messages: hollinMessages,
  },
  // Milestone 10 preview regions, in the plan's order (10.1 to 10.3).
  tala_ifri: {
    town: talaTown,
    milestones: talaMilestones,
    messages: talaMessages,
  },
  kumonotani: {
    town: kumoTown,
    milestones: kumoMilestones,
    messages: kumoMessages,
  },
  remanso_verde: {
    town: remansoTown,
    milestones: remansoMilestones,
    messages: remansoMessages,
  },
}

export const DEFAULT_SCENARIO_ID = 'willowbrook'

export function scenarioIds(): string[] {
  return Object.keys(SCENARIOS)
}

export function hasScenario(id: string): boolean {
  return Object.hasOwn(SCENARIOS, id)
}

export function scenarioContent(id: string): ScenarioContent {
  if (!hasScenario(id)) fail('unknown town', id)
  return SCENARIOS[id]
}

// The scenario is hand-tuned content; validating it on first use is cheap
// and failing here beats failing at draw time. Each town is cached, so
// every caller shares one instance per id.
const cachedScenarios = new Map<string, ScenarioDef>()

export function getScenario(id: string): ScenarioDef {
  let scenario = cachedScenarios.get(id)
  if (!scenario) {
    scenario = withDefaults(scenarioContent(id).town as ScenarioDef)
    if (scenario.id !== id) fail('the town id must match its registry id', `${scenario.id} != ${id}`)
    validateScenario(scenario)
    const problems = regionContentProblems(scenario)
    if (problems.length > 0) fail(problems[0], id)
    cachedScenarios.set(id, scenario)
  }
  return scenario
}

// A save's town name for menus; an unknown id (a save from a newer build)
// shows as itself rather than crashing the slot list.
export function scenarioName(id: string): string {
  return hasScenario(id) ? getScenario(id).name : id
}

// Fill in what a town file may leave out (Milestone 10): the default need
// weights, and full water coverage where water does not count.
function withDefaults(raw: ScenarioDef): ScenarioDef {
  const needWeights = { ...SATISFACTION_WEIGHTS, ...raw.needWeights }
  const neighborhoods = raw.neighborhoods.map((n) =>
    needWeights.water === 0 && n.needs.water === undefined ? { ...n, needs: { ...n.needs, water: 1 } } : n,
  )
  return { ...raw, needWeights, neighborhoods }
}

// Every playable town, in registry order (the main menu's picker).
export function listScenarios(): ScenarioDef[] {
  return scenarioIds().map(getScenario)
}

// The town being played. Set when a game starts or loads (store.replaceState);
// everything that asks loadScenario() follows it.
let activeId = DEFAULT_SCENARIO_ID

export function setActiveScenario(id: string): void {
  getScenario(id) // fail loudly on an unknown id before switching
  activeId = id
}

export function activeScenarioId(): string {
  return activeId
}

export function loadScenario(): ScenarioDef {
  return getScenario(activeId)
}

export function neighborhoodById(s: ScenarioDef, id: string): NeighborhoodDef {
  const found = s.neighborhoods.find((n) => n.id === id)
  if (!found) fail('unknown neighborhood', id)
  return found
}

// World extent of the scenario (every district outline). Used to
// frame the initial camera and to draw the river.
export interface Bounds {
  minX: number
  minY: number
  width: number
  height: number
}

export function scenarioBounds(s: ScenarioDef): Bounds {
  let minX = Infinity
  let minY = Infinity
  let maxX = -Infinity
  let maxY = -Infinity
  for (const n of s.neighborhoods) {
    const box = outlineBox(districtOutline(s, n.id))
    minX = Math.min(minX, box.minX)
    maxX = Math.max(maxX, box.maxX)
    minY = Math.min(minY, box.minY)
    maxY = Math.max(maxY, box.maxY)
  }
  return { minX, minY, width: maxX - minX, height: maxY - minY }
}
