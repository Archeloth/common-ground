import { describe, expect, it } from 'vitest'
import { loadScenario } from '../../../game/scenario'
import { districtOutline } from '../../../game/outline'
import { pointInPolygon } from '../../../game/geometry'
import { sceneLayout } from './layout'
import type { Plot } from './layout'

const scenario = loadScenario()

function all(plots: { buildings: Plot[]; greenery: Plot[]; slots: Plot[]; cars: Plot[] }): Plot[] {
  return [...plots.slots, ...plots.buildings, ...plots.greenery, ...plots.cars]
}

describe('scene layout', () => {
  it('is deterministic: the same neighbourhood always gets the same little town', () => {
    for (const n of scenario.neighborhoods) expect(sceneLayout(n)).toEqual(sceneLayout(n))
  })

  it('gives every project slot a plot, in slot order', () => {
    for (const n of scenario.neighborhoods) expect(sceneLayout(n).slots, n.id).toHaveLength(n.slots)
  })

  it('keeps every plot inside its district', () => {
    for (const n of scenario.neighborhoods) {
      const outline = districtOutline(scenario, n.id)
      for (const p of all(sceneLayout(n))) expect(pointInPolygon(outline, p.x, p.y), n.id).toBe(true)
    }
  })

  it('does not stack plots on top of each other', () => {
    for (const n of scenario.neighborhoods) {
      const plots = all(sceneLayout(n))
      for (let i = 0; i < plots.length; i++) {
        for (let j = i + 1; j < plots.length; j++) {
          const same = plots[i].x === plots[j].x && plots[i].y === plots[j].y
          expect(same, `${n.id} #${i} vs #${j}`).toBe(false)
        }
      }
    }
  })

  it('builds each kind from its own pieces', () => {
    const byKind = (kind: string) => scenario.neighborhoods.find((n) => n.kind === kind)!
    expect(sceneLayout(byKind('woodland')).buildings).toHaveLength(0)
    expect(sceneLayout(byKind('woodland')).greenery.length).toBeGreaterThan(8)
    expect(sceneLayout(byKind('farmland')).greenery.some((g) => g.style === 'field')).toBe(true)
    expect(sceneLayout(byKind('apartments')).buildings.every((b) => b.style === 'block')).toBe(true)
  })

  it('places most of the planned buildings (the town does not look empty)', () => {
    for (const n of scenario.neighborhoods) {
      const layout = sceneLayout(n)
      if (n.kind === 'woodland') continue
      expect(layout.buildings.length, n.id).toBeGreaterThanOrEqual(1)
    }
  })
})
