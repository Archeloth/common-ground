import { describe, expect, it } from 'vitest'
import { loadScenario } from '../../../game/scenario'
import { districtOutline } from '../../../game/outline'
import { distanceToSegment, pointInPolygon } from '../../../game/geometry'
import type { Point } from '../../../game/geometry'
import { WILD_HEIGHT, riverLife, wildsLayout } from './wilds'

const scenario = loadScenario()
const items = wildsLayout(scenario)
const outlines = scenario.neighborhoods.map((n) => districtOutline(scenario, n.id))

function riverDistance(p: Point): number {
  const pts = scenario.river.points
  let best = Infinity
  for (let i = 0; i < pts.length - 1; i++) best = Math.min(best, distanceToSegment(p, pts[i], pts[i + 1]))
  return best
}

describe('the countryside around the town', () => {
  it('is deterministic', () => {
    expect(wildsLayout(scenario)).toEqual(items)
    expect(riverLife(scenario)).toEqual(riverLife(scenario))
  })

  it('has plenty to look at, but not an unbounded amount', () => {
    expect(items.length).toBeGreaterThan(300)
    expect(items.length).toBeLessThan(3000)
    for (const style of ['tree', 'conifer', 'bush', 'tuft', 'flowers', 'reeds', 'lilypad'] as const) {
      expect(items.some((i) => i.style === style), style).toBe(true)
    }
  })

  it('never grows inside a district, nor pokes a crown into one', () => {
    for (const item of items) {
      for (const outline of outlines) {
        expect(pointInPolygon(outline, item.x, item.y), `${item.style} at ${item.x},${item.y}`).toBe(false)
        expect(pointInPolygon(outline, item.x, item.y - WILD_HEIGHT[item.style])).toBe(false)
      }
    }
  })

  it('keeps land plants out of the water, reeds on the banks and lily pads on the river', () => {
    const half = scenario.river.halfDepth
    for (const item of items) {
      const d = riverDistance(item)
      if (item.style === 'lilypad') expect(d).toBeLessThan(half)
      else if (item.style === 'reeds') expect(d).toBeGreaterThan(half - 1)
      else expect(d, item.style).toBeGreaterThan(half + 5)
    }
  })

  it('is sorted back to front', () => {
    for (let i = 1; i < items.length; i++) expect(items[i].y).toBeGreaterThanOrEqual(items[i - 1].y)
  })
})
