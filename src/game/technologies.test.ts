import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { loadTechnologies, technologyById } from './technologies'
import { techTreeFor } from './regionContent'

const scenario = loadScenario()

describe('research tree', () => {
  const techs = loadTechnologies()
  const ids = techs.map((t) => t.id)

  it('has the 16 entries across all six branches', () => {
    expect(ids.sort()).toEqual([
      'building_retrofits',
      'community_gardens',
      'community_learning',
      'composting',
      'energy_audits',
      'energy_cooperatives',
      'heat_pumps',
      'local_food_hubs',
      'pollinator_meadows',
      'public_transport',
      'rain_gardens',
      'repair_cafes',
      'safe_streets',
      'separate_collection',
      'shared_mobility',
      'urban_trees',
    ])
    expect(new Set(techs.map((tech) => tech.branch)).size).toBe(6)
  })

  it('has unique, non-empty ids, names, benefits and limits', () => {
    expect(new Set(ids).size).toBe(techs.length)
    for (const tech of techs) {
      expect(tech.name.trim().length).toBeGreaterThan(0)
      expect(tech.benefit.trim().length).toBeGreaterThan(0)
      expect(tech.limit.trim().length).toBeGreaterThan(0)
    }
  })

  it('has non-negative integer knowledge costs', () => {
    for (const tech of techs) {
      expect(Number.isInteger(tech.cost) && tech.cost >= 0).toBe(true)
    }
  })

  it('uses valid branches and confidence tags', () => {
    for (const tech of techs) {
      expect(['energy', 'food', 'mobility', 'circular', 'ecology', 'community']).toContain(tech.branch)
      expect(['established', 'emerging', 'context']).toContain(tech.confidence)
    }
  })

  it('only references existing technologies in prerequisites and unlocks', () => {
    for (const tech of techs) {
      for (const id of [...tech.prerequisites, ...tech.unlocks]) {
        expect(ids).toContain(id)
      }
    }
  })

  it("starts with every free root of Willowbrook's tree researched", () => {
    const freeRoots = techTreeFor(scenario)
      .filter((tech) => tech.prerequisites.length === 0 && tech.cost === 0)
      .map((tech) => tech.id)
    expect(freeRoots.sort()).toEqual(['community_gardens', 'energy_audits', 'pollinator_meadows', 'safe_streets'])
    expect([...scenario.start.unlockedTech].sort()).toEqual(freeRoots)
  })

  it('keeps the unlock graph acyclic (no cycles)', () => {
    const visiting = new Set<string>()
    const visit = (id: string): void => {
      expect(visiting.has(id), `cycle detected at ${id}`).toBe(false)
      visiting.add(id)
      for (const next of technologyById(techs, id).unlocks) visit(next)
      visiting.delete(id)
    }
    for (const tech of techs) visit(tech.id)
  })
})