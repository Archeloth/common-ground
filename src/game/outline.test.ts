import { describe, expect, it } from 'vitest'
import { loadScenario, bridgeBetween } from './scenario'
import { districtOutline, OUTLINE_STEPS } from './outline'
import { distanceToSegment, pointInPolygon } from './geometry'
import type { Point } from './geometry'
import type { NeighborhoodDef } from './types'

const scenario = loadScenario()
const all = scenario.neighborhoods

function distanceToOutline(p: Point, outline: readonly Point[]): number {
  let best = Infinity
  for (let i = 0; i < outline.length - 1; i++) best = Math.min(best, distanceToSegment(p, outline[i], outline[i + 1]))
  return best
}

function gapBetween(a: NeighborhoodDef, b: NeighborhoodDef): number {
  const oa = districtOutline(scenario, a.id)
  const ob = districtOutline(scenario, b.id)
  return Math.min(...oa.map((p) => distanceToOutline(p, ob)))
}

function landLinked(a: NeighborhoodDef, b: NeighborhoodDef): boolean {
  return a.neighbors.includes(b.id) && bridgeBetween(scenario, a.id, b.id) === null
}

describe('district outlines', () => {
  it('are deterministic, closed and sampled at OUTLINE_STEPS', () => {
    for (const n of all) {
      const outline = districtOutline(scenario, n.id)
      expect(outline).toHaveLength(OUTLINE_STEPS + 1)
      expect(outline[0].x).toBeCloseTo(outline[OUTLINE_STEPS].x, 6)
      expect(outline[0].y).toBeCloseTo(outline[OUTLINE_STEPS].y, 6)
      for (const p of outline) expect(Number.isFinite(p.x) && Number.isFinite(p.y), n.id).toBe(true)
    }
  })

  it('always contain their own centre, with room around it', () => {
    for (const n of all) {
      const outline = districtOutline(scenario, n.id)
      expect(pointInPolygon(outline, n.shape.x, n.shape.y), n.id).toBe(true)
      expect(distanceToOutline(n.shape, outline), n.id).toBeGreaterThan(n.shape.radius * 0.3)
    }
  })

  it('never overlap one another', () => {
    for (const a of all) {
      for (const b of all) {
        if (a.id === b.id) continue
        const ob = districtOutline(scenario, b.id)
        for (const p of districtOutline(scenario, a.id)) {
          // Pull each point a hair toward its own centre: seam points lie on the shared edge.
          const dx = a.shape.x - p.x
          const dy = a.shape.y - p.y
          const len = Math.hypot(dx, dy) || 1
          const q = { x: p.x + (dx / len) * 1.5, y: p.y + (dy / len) * 1.5 }
          expect(pointInPolygon(ob, q.x, q.y), `${a.id} inside ${b.id}`).toBe(false)
        }
      }
    }
  })

  it('makes districts connected by land share a border', () => {
    for (const a of all) {
      for (const b of all) {
        if (a.id >= b.id || !landLinked(a, b)) continue
        const ob = districtOutline(scenario, b.id)
        const touching = districtOutline(scenario, a.id).filter((p) => distanceToOutline(p, ob) < 2)
        expect(touching.length, `${a.id} | ${b.id}`).toBeGreaterThanOrEqual(3)
      }
    }
  })

  it('keeps open ground between districts that are not connected by land', () => {
    for (const a of all) {
      for (const b of all) {
        if (a.id >= b.id || landLinked(a, b)) continue
        expect(gapBetween(a, b), `${a.id} | ${b.id}`).toBeGreaterThan(4)
      }
    }
  })

  it('stays clear of the river and its bank', () => {
    const river = scenario.river
    for (const n of all) {
      for (const p of districtOutline(scenario, n.id)) {
        let d = Infinity
        for (let i = 0; i < river.points.length - 1; i++) d = Math.min(d, distanceToSegment(p, river.points[i], river.points[i + 1]))
        expect(d, n.id).toBeGreaterThan(river.halfDepth + 5)
      }
    }
  })
})
