import type { ScenarioDef, NeighborhoodDef } from './types'
import { BLOB_Y_SQUASH } from './blob'
import willowbrook from '../data/scenarios/willowbrook.json'

// Content validation lives here so a typo in a scenario JSON fails loudly
// with the offending id instead of drawing a wrong map or crashing later.
// Called once at load and once by the unit tests (plan: "fail loudly").

function fail(what: string, detail = ''): never {
  throw new Error(`Scenario data error: ${what}${detail ? ` — ${detail}` : ''}`)
}

export function validateScenario(s: ScenarioDef): void {
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

    for (const need of Object.values(n.needs)) {
      if (!Number.isFinite(need) || need < 0 || need > 1) {
        fail('need coverage must be a number in [0, 1]', n.id)
      }
    }
    if (!(n.slots > 0)) fail('slots must be positive', n.id)
    if (!(n.residents > 0)) fail('residents must be positive', n.id)
    if (n.engagement < 0 || n.engagement > 100) fail('engagement must be in [0, 100]', n.id)
  }
  if (seenIds.size !== s.neighborhoods.length) fail('all neighborhoods must have ids')

  for (const n of s.neighborhoods) {
    for (const neighborId of n.neighbors) {
      if (!seenIds.has(neighborId)) fail('unknown neighbor reference', `${n.id} -> ${neighborId}`)
      const other = neighborhoodById(s, neighborId)
      if (!other.neighbors.includes(n.id)) fail('neighbor links must be symmetric', `${n.id} <-> ${neighborId}`)
    }
  }

  for (const [from, to] of s.bridges) {
    if (!seenIds.has(from) || !seenIds.has(to)) fail('bridge endpoint does not exist', `${from} -> ${to}`)
    if (from === to) fail('a bridge cannot link a neighborhood to itself', from)
    const a = neighborhoodById(s, from)
    const b = neighborhoodById(s, to)
    if (!a.neighbors.includes(to) || !b.neighbors.includes(from)) {
      fail('bridge endpoints must list each other as neighbors', `${from} <-> ${to}`)
    }
  }
}

// The scenario is hand-tuned content; validating it on every load is cheap
// (16 neighborhoods) and failing here beats failing at draw time. The result
// is cached so App and TownMap can both use the same instance.
let cachedScenario: ScenarioDef | null = null

export function loadScenario(): ScenarioDef {
  if (!cachedScenario) {
    cachedScenario = willowbrook as unknown as ScenarioDef
    validateScenario(cachedScenario)
  }
  return cachedScenario
}

export function neighborhoodById(s: ScenarioDef, id: string): NeighborhoodDef {
  const found = s.neighborhoods.find((n) => n.id === id)
  if (!found) fail('unknown neighborhood', id)
  return found
}

// World extent of the scenario (squash-aware, wobble-envelope padded). Used to
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
    const r = n.shape.radius
    const dx = r * 1.2 // wobble envelope
    const dy = r * 1.2 * BLOB_Y_SQUASH
    minX = Math.min(minX, n.shape.x - dx)
    maxX = Math.max(maxX, n.shape.x + dx)
    minY = Math.min(minY, n.shape.y - dy)
    maxY = Math.max(maxY, n.shape.y + dy)
  }
  return { minX, minY, width: maxX - minX, height: maxY - minY }
}
