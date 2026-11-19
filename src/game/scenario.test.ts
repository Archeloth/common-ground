import { describe, expect, it } from 'vitest'
import { crossingBetween, loadScenario, scenarioBounds, neighborhoodById, validateScenario } from './scenario'
import { crossingsBetween, linkCrossesWater, townWaterClearance } from './water'
import type { ScenarioDef } from './types'
import { loadKinds } from './kinds'

const scenario = loadScenario()

describe('willowbrook scenario content', () => {
  it('loads exactly the 16 Willowbrook neighborhoods', () => {
    expect(scenario.neighborhoods).toHaveLength(16)
  })

  it('has id, name and kind on every neighborhood', () => {
    for (const n of scenario.neighborhoods) {
      expect(n.id).toBeTruthy()
      expect(n.name).toBeTruthy()
      expect(n.kind).toBeTruthy()
    }
  })

  it('has unique ids and unique names', () => {
    const ids = scenario.neighborhoods.map((n) => n.id)
    const names = scenario.neighborhoods.map((n) => n.name)
    expect(new Set(ids).size).toBe(ids.length)
    expect(new Set(names).size).toBe(names.length)
  })

  it('has finite, positive shapes with integer seeds', () => {
    for (const n of scenario.neighborhoods) {
      const { shape } = n
      expect(Number.isFinite(shape.x)).toBe(true)
      expect(Number.isFinite(shape.y)).toBe(true)
      expect(shape.radius).toBeGreaterThan(0)
      expect(Number.isInteger(shape.seed)).toBe(true)
    }
  })

  it('keeps the six need coverages within [0, 1]', () => {
    for (const n of scenario.neighborhoods) {
      for (const [need, value] of Object.entries(n.needs)) {
        expect(value, `${n.id}.${need}`).toBeGreaterThanOrEqual(0)
        expect(value, `${n.id}.${need}`).toBeLessThanOrEqual(1)
      }
    }
  })

  it('has positive residents and slots, and engagement in [0, 100]', () => {
    for (const n of scenario.neighborhoods) {
      expect(n.residents).toBeGreaterThan(0)
      expect(n.slots).toBeGreaterThan(0)
      expect(n.engagement).toBeGreaterThanOrEqual(0)
      expect(n.engagement).toBeLessThanOrEqual(100)
    }
  })

  it('has neighbor links that resolve and are symmetric', () => {
    for (const n of scenario.neighborhoods) {
      expect(n.neighbors.length).toBeGreaterThan(0)
      for (const neighborId of n.neighbors) {
        const other = neighborhoodById(scenario, neighborId)
        expect(other.neighbors, `${neighborId} should list ${n.id} back`).toContain(n.id)
      }
    }
  })

  it('has one river and two bridges whose endpoints exist and are neighbors', () => {
    expect(scenario.water.map((w) => w.kind)).toEqual(['river'])
    expect(scenario.crossings).toHaveLength(2)
    for (const { from, to, kind } of scenario.crossings) {
      expect(kind).toBe('bridge')
      expect(() => neighborhoodById(scenario, from)).not.toThrow()
      expect(() => neighborhoodById(scenario, to)).not.toThrow()
      expect(neighborhoodById(scenario, from).neighbors).toContain(to)
      expect(neighborhoodById(scenario, to).neighbors).toContain(from)
    }
  })

  it('has bridges crossing the river (one per side of the map)', () => {
    // The fixed layout: Old Town (north-west) <-> Riverside (south-west) and
    // Linden Flats (north-east) <-> Station Quarter (south-east).
    const spans = scenario.crossings.map(({ from, to }) => {
      const a = neighborhoodById(scenario, from)
      const b = neighborhoodById(scenario, to)
      return { a, b, north: Math.min(a.shape.y, b.shape.y), south: Math.max(a.shape.y, b.shape.y) }
    })
    for (const span of spans) {
      expect(span.south - span.north).toBeGreaterThan(150) // across the river band
    }
  })

  // Outlines (shared borders, no overlaps, river clearance) are tested in outline.test.ts.
})

describe('river crossings (bus lines cross only at bridges)', () => {
  it('finds the bridge for a bridged pair in either order', () => {
    expect(crossingBetween(scenario, 'old_town', 'riverside')?.point).toBeDefined()
    expect(crossingBetween(scenario, 'station_quarter', 'linden_flats')?.point).toBeDefined()
    expect(crossingBetween(scenario, 'old_town', 'maple_heights')).toBeNull()
  })

  it('refuses a scenario where neighbours across the river have no crossing', () => {
    const broken: ScenarioDef = structuredClone(scenario)
    const orchard = broken.neighborhoods.find((n) => n.id === 'orchard_lane')!
    const weir = broken.neighborhoods.find((n) => n.id === 'weir_bend')!
    orchard.neighbors.push('weir_bend')
    weir.neighbors.push('orchard_lane')
    expect(() => validateScenario(broken)).toThrow(/across the river need a crossing/)
  })

  it('refuses a river with fewer than two points', () => {
    const broken: ScenarioDef = structuredClone(scenario)
    broken.water[0].points = [{ x: 0, y: 0 }]
    expect(() => validateScenario(broken)).toThrow(/at least 2 points/)
  })

  it('refuses a crossing on water that does not exist', () => {
    const broken: ScenarioDef = structuredClone(scenario)
    broken.crossings[0].water = 'lake'
    expect(() => validateScenario(broken)).toThrow(/unknown water/)
  })
})

// Milestone 10: water is a list of features. Fixtures reuse Willowbrook's
// districts with different water, passed straight to validateScenario.
describe('water features (Milestone 10)', () => {
  it('a town may have no water at all', () => {
    const dry: ScenarioDef = structuredClone(scenario)
    dry.water = []
    dry.crossings = []
    expect(() => validateScenario(dry)).not.toThrow()
    expect(townWaterClearance(dry, { x: 0, y: 0 })).toBe(Infinity)
  })

  it('a wadi is crossed by a ford like a river by a bridge', () => {
    const town: ScenarioDef = structuredClone(scenario)
    town.water[0] = { ...town.water[0], id: 'wadi', kind: 'wadi', halfDepth: 18 }
    town.crossings = town.crossings.map((c) => ({ ...c, kind: 'ford', water: 'wadi' }))
    expect(() => validateScenario(town)).not.toThrow()
    expect(crossingsBetween(town, 'old_town', 'riverside').map((c) => c.kind)).toEqual(['ford'])
  })

  it('a wadi without its fords refuses links across it', () => {
    const town: ScenarioDef = structuredClone(scenario)
    town.water[0] = { ...town.water[0], kind: 'wadi' }
    town.crossings = []
    expect(() => validateScenario(town)).toThrow(/across the wadi need a crossing/)
  })

  it('an oasis pool sits between districts and no link crosses it', () => {
    const pool = [
      { x: 560, y: 560 },
      { x: 620, y: 545 },
      { x: 640, y: 600 },
      { x: 575, y: 610 },
    ]
    const town: ScenarioDef = structuredClone(scenario)
    town.water.push({ id: 'pool', kind: 'oasis', points: pool, halfDepth: 0 })
    expect(townWaterClearance(town, { x: 600, y: 580 })).toBeLessThan(0)
    expect(linkCrossesWater(town.water[1], { x: 500, y: 580 }, { x: 700, y: 580 })).toBe(true)
    expect(linkCrossesWater(town.water[1], { x: 500, y: 500 }, { x: 700, y: 500 })).toBe(false)
  })

  it('refuses a crossing over an oasis', () => {
    const town: ScenarioDef = structuredClone(scenario)
    town.water.push({ id: 'pool', kind: 'oasis', points: [{ x: 0, y: 0 }, { x: 10, y: 0 }, { x: 5, y: 8 }], halfDepth: 0 })
    town.crossings[0] = { ...town.crossings[0], water: 'pool' }
    expect(() => validateScenario(town)).toThrow(/nothing crosses an oasis/)
  })

  it('refuses an unknown water or crossing kind', () => {
    const a: ScenarioDef = structuredClone(scenario)
    ;(a.water[0] as { kind: string }).kind = 'canal'
    expect(() => validateScenario(a)).toThrow(/unknown water kind/)
    const b: ScenarioDef = structuredClone(scenario)
    ;(b.crossings[0] as { kind: string }).kind = 'tunnel'
    expect(() => validateScenario(b)).toThrow(/unknown crossing kind/)
  })
})

describe('regions (Milestone 10)', () => {
  it('every district kind is tagged with at least one region', () => {
    for (const kind of loadKinds()) expect(kind.regions.length).toBeGreaterThan(0)
  })

  it('refuses a town that uses a kind from another region', () => {
    const broken: ScenarioDef = structuredClone(scenario)
    broken.theme = 'sahel'
    expect(() => validateScenario(broken)).toThrow(/not part of the "sahel" region/)
  })

  it('refuses a town without a theme', () => {
    const broken: ScenarioDef = structuredClone(scenario)
    broken.theme = ''
    expect(() => validateScenario(broken)).toThrow(/needs a theme/)
  })
})

describe('scenarioBounds', () => {
  it('encloses every blob and has positive size', () => {
    const b = scenarioBounds(scenario)
    expect(b.width).toBeGreaterThan(0)
    expect(b.height).toBeGreaterThan(0)
    for (const n of scenario.neighborhoods) {
      expect(n.shape.x).toBeGreaterThan(b.minX)
      expect(n.shape.x).toBeLessThan(b.minX + b.width)
      expect(n.shape.y).toBeGreaterThan(b.minY)
      expect(n.shape.y).toBeLessThan(b.minY + b.height)
    }
  })
})
