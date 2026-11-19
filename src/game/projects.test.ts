import { describe, expect, it } from 'vitest'
import { loadProjects } from './projects'
import { loadTechnologies } from './technologies'
import { projectsFor } from './regionContent'
import { getScenario, listScenarios } from './scenario'
import { transportOf } from './transport'
import { NEIGHBORHOOD_KINDS } from './types'

describe('projects catalog', () => {
  const projects = loadProjects()

  it("Willowbrook has the fifteen projects of the Milestone 8.5 catalog", () => {
    expect(projectsFor(getScenario('willowbrook')).map((p) => p.id).sort()).toEqual([
      'bike_car_share',
      'community_garden',
      'compost_point',
      'energy_coop',
      'heat_pump_scheme',
      'local_food_market',
      'pocket_meadow',
      'rain_garden',
      'recycling_point',
      'repair_cafe',
      'retrofit_program',
      'rooftop_solar',
      'safe_streets',
      'street_trees',
      'workshop_series',
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

  it('does something: need effects, engagement or Knowledge, all valid', () => {
    const needs = new Set(['energy', 'food', 'mobility', 'green', 'waste', 'housing', 'water'])
    for (const p of projects) {
      expect(p.effects.length + p.engagement + p.knowledgePerMonth, p.id).toBeGreaterThan(0)
      for (const effect of p.effects) {
        expect(needs.has(effect.need)).toBe(true)
        expect(Number.isFinite(effect.change) && effect.change !== 0).toBe(true)
      }
    }
  })

  it('is gated by research, and every researched tech yields something to build', () => {
    const techIds = new Set(loadTechnologies().map((tech) => tech.id))
    for (const p of projects) {
      expect(p.requiresTech && techIds.has(p.requiresTech), p.id).toBe(true)
    }
    // Every tech except a town's transport (which unlocks lines, not a slot
    // project) unlocks at least one project: research always pays off in play.
    const transport = new Set(listScenarios().map((s) => transportOf(s).requiresTech))
    for (const id of techIds) {
      if (transport.has(id)) continue
      expect(projects.some((p) => p.requiresTech === id), id).toBe(true)
    }
  })

  it('raises every need through at least one project', () => {
    for (const need of ['energy', 'food', 'mobility', 'green', 'waste', 'housing']) {
      expect(projects.some((p) => p.effects.some((e) => e.need === need)), need).toBe(true)
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
