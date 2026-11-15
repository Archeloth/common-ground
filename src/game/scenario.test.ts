import { describe, expect, it } from 'vitest'
import { bridgeBetween, loadScenario, scenarioBounds, neighborhoodById, validateScenario } from './scenario'
import type { ScenarioDef } from './types'
import { BLOB_Y_SQUASH } from './blob'

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

  it('has bridges whose endpoints exist and are neighbors', () => {
    expect(scenario.bridges).toHaveLength(2)
    for (const { from, to } of scenario.bridges) {
      expect(() => neighborhoodById(scenario, from)).not.toThrow()
      expect(() => neighborhoodById(scenario, to)).not.toThrow()
      expect(neighborhoodById(scenario, from).neighbors).toContain(to)
      expect(neighborhoodById(scenario, to).neighbors).toContain(from)
    }
  })

  it('has bridges crossing the river (one per side of the map)', () => {
    // The fixed layout: Old Town (north-west) <-> Riverside (south-west) and
    // Linden Flats (north-east) <-> Station Quarter (south-east).
    const spans = scenario.bridges.map(({ from, to }) => {
      const a = neighborhoodById(scenario, from)
      const b = neighborhoodById(scenario, to)
      return { a, b, north: Math.min(a.shape.y, b.shape.y), south: Math.max(a.shape.y, b.shape.y) }
    })
    for (const span of spans) {
      expect(span.south - span.north).toBeGreaterThan(150) // across the river band
    }
  })

  it('does not let any two blobs overlap (squash-aware)', () => {
    for (let i = 0; i < scenario.neighborhoods.length; i++) {
      for (let j = i + 1; j < scenario.neighborhoods.length; j++) {
        const a = scenario.neighborhoods[i]
        const b = scenario.neighborhoods[j]
        const dx = a.shape.x - b.shape.x
        const dy = (a.shape.y - b.shape.y) / BLOB_Y_SQUASH
        const dist = Math.hypot(dx, dy)
        expect(dist, `${a.id} vs ${b.id}`).toBeGreaterThanOrEqual(a.shape.radius + b.shape.radius)
      }
    }
  })
})

describe('river crossings (bus lines cross only at bridges)', () => {
  it('finds the bridge for a bridged pair in either order', () => {
    expect(bridgeBetween(scenario, 'old_town', 'riverside')?.point).toBeDefined()
    expect(bridgeBetween(scenario, 'station_quarter', 'linden_flats')?.point).toBeDefined()
    expect(bridgeBetween(scenario, 'old_town', 'maple_heights')).toBeNull()
  })

  it('refuses a scenario where neighbours across the river have no bridge', () => {
    const broken: ScenarioDef = structuredClone(scenario)
    const orchard = broken.neighborhoods.find((n) => n.id === 'orchard_lane')!
    const weir = broken.neighborhoods.find((n) => n.id === 'weir_bend')!
    orchard.neighbors.push('weir_bend')
    weir.neighbors.push('orchard_lane')
    expect(() => validateScenario(broken)).toThrow(/across the river need a bridge/)
  })

  it('refuses a river with fewer than two points', () => {
    const broken: ScenarioDef = structuredClone(scenario)
    broken.river.points = [{ x: 0, y: 0 }]
    expect(() => validateScenario(broken)).toThrow(/river/)
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
