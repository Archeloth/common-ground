import { describe, expect, it } from 'vitest'
import { fitsRegion, projectsFor, regionContentProblems, techTreeFor } from './regionContent'
import { getScenario, listScenarios } from './scenario'
import { loadProjects } from './projects'
import { loadTechnologies, technologyById } from './technologies'
import type { ScenarioDef } from './types'

// Milestone 10: research and projects tagged by region. Fixtures are clones
// of a real town passed straight to the pure functions, never registered.

const willowbrook = getScenario('willowbrook')
const fixture = (change: (s: ScenarioDef) => void): ScenarioDef => {
  const s = structuredClone(willowbrook)
  change(s)
  return s
}

describe('region tags', () => {
  it('an untagged entry fits every region; a tagged one only its own', () => {
    expect(fitsRegion({}, 'sahel')).toBe(true)
    expect(fitsRegion({ regions: ['sahel'] }, 'sahel')).toBe(true)
    expect(fitsRegion({ regions: ['sahel'] }, 'temperate')).toBe(false)
  })

  it.each(listScenarios().map((s) => [s.id, s] as const))('%s has a complete, reachable tree', (_id, town) => {
    expect(regionContentProblems(town)).toEqual([])
    const tree = techTreeFor(town)
    const freeRoots = tree.filter((t) => t.prerequisites.length === 0 && t.cost === 0).map((t) => t.id)
    expect([...town.start.unlockedTech].sort()).toEqual(freeRoots.sort())
  })

  it('temperate towns share the whole catalog today', () => {
    expect(techTreeFor(willowbrook)).toHaveLength(loadTechnologies().length)
    expect(projectsFor(willowbrook)).toHaveLength(loadProjects().length)
  })
})

describe('a town that leaves things out', () => {
  it('drops excluded research and projects from its lists', () => {
    const town = fixture((s) => (s.research = { exclude: ['energy_cooperatives', 'energy_coop'] }))
    expect(techTreeFor(town).map((t) => t.id)).not.toContain('energy_cooperatives')
    expect(projectsFor(town).map((p) => p.id)).not.toContain('energy_coop')
    expect(regionContentProblems(town)).toEqual([])
  })

  it('refuses a project whose research the town cannot do', () => {
    const town = fixture((s) => (s.research = { exclude: ['heat_pumps'] }))
    expect(regionContentProblems(town).join(' ')).toMatch(/heat_pump_scheme.*cannot research/)
  })

  it('refuses research whose prerequisite is missing, and a missing starting tech', () => {
    const needsRetrofits = technologyById(loadTechnologies(), 'heat_pumps').prerequisites[0]
    const town = fixture((s) => (s.research = { exclude: [needsRetrofits, 'energy_audits'] }))
    const problems = regionContentProblems(town).join(' ')
    expect(problems).toMatch(/heat_pumps.*does not have/)
    expect(problems).toMatch(/starting technology "energy_audits"/)
  })

  it('refuses a town where a district kind is left with fewer than two projects', () => {
    const woodland = loadProjects()
      .filter((p) => p.allowedKinds.includes('woodland'))
      .map((p) => p.id)
    const town = fixture((s) => (s.research = { exclude: woodland.slice(1) }))
    expect(regionContentProblems(town).join(' ')).toMatch(/"woodland" has fewer than two/)
  })

  it('refuses an exclusion that names nothing', () => {
    const town = fixture((s) => (s.research = { exclude: ['perpetual_motion'] }))
    expect(regionContentProblems(town).join(' ')).toMatch(/unknown research or project "perpetual_motion"/)
  })
})
