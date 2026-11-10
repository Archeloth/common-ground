import { describe, expect, it } from 'vitest'
import { loadProjects } from './projects'
import { NEIGHBORHOOD_KINDS } from './types'

describe('projects catalog', () => {
  const projects = loadProjects()

  it('has exactly the three planned projects', () => {
    expect(projects.map((p) => p.id).sort()).toEqual([
      'community_garden',
      'retrofit_program',
      'rooftop_solar',
    ])
  })

  it('has unique, non-empty ids and names and explain texts', () => {
    expect(new Set(projects.map((p) => p.id)).size).toBe(projects.length)
    for (const p of projects) {
      expect(p.name.trim().length).toBeGreaterThan(0)
      expect(p.explain.trim().length).toBeGreaterThan(0)
    }
  })

  it('has positive finite costs and whole months of community time', () => {
    for (const p of projects) {
      expect(Number.isFinite(p.cost) && p.cost > 0).toBe(true)
      expect(Number.isInteger(p.time) && p.time > 0).toBe(true)
    }
  })

  it('has at least one effect on a valid need with a non-zero change', () => {
    const needs = new Set(['energy', 'food', 'mobility', 'green', 'waste', 'housing'])
    for (const p of projects) {
      expect(p.effects.length).toBeGreaterThan(0)
      for (const effect of p.effects) {
        expect(needs.has(effect.need)).toBe(true)
        expect(Number.isFinite(effect.change) && effect.change !== 0).toBe(true)
      }
    }
  })

  it('references only valid kinds and keeps at least two options per kind', () => {
    for (const p of projects) {
      expect(p.allowedKinds.length).toBeGreaterThan(0)
      for (const kind of p.allowedKinds) {
        expect(NEIGHBORHOOD_KINDS).toContain(kind)
      }
    }
    for (const kind of NEIGHBORHOOD_KINDS) {
      const options = projects.filter((p) => p.allowedKinds.includes(kind)).length
      expect(options).toBeGreaterThanOrEqual(2)
    }
  })
})
