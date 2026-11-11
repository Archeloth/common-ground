import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { applyCommand, initialState } from './state'
import { tick } from './tick'
import { loadTechnologies } from './technologies'
import { loadMilestones } from './milestones'
import type { Command, GameState } from './types'

const scenario = loadScenario()

// A busy playthrough: three projects, a removal, a speed change and 1,000 ticks.
function runChaoticScript(): GameState {
  let state = initialState(scenario)
  const start = (command: Command): void => {
    const result = applyCommand(state, command)
    if (result.ok) state = result.state
  }

  start({ type: 'startProject', neighborhood: 'old_town', project: 'community_garden' })
  start({ type: 'startProject', neighborhood: 'mill_yard', project: 'rooftop_solar' })
  start({ type: 'startProject', neighborhood: 'northfield_farms', project: 'retrofit_program' })
  start({ type: 'research', tech: 'building_retrofits' })

  for (let i = 0; i < 1000; i++) {
    state = tick(state)
    if (i === 200) start({ type: 'removeProject', neighborhood: 'old_town', slot: 0 })
    if (i === 500) start({ type: 'setSpeed', speed: 4 })
  }
  return state
}

function expectNoNonFinite(value: unknown, path: string): void {
  if (typeof value === 'number') {
    expect(Number.isFinite(value), path).toBe(true)
  } else if (Array.isArray(value)) {
    value.forEach((item, index) => expectNoNonFinite(item, `${path}[${index}]`))
  } else if (value !== null && typeof value === 'object') {
    for (const [key, v] of Object.entries(value)) expectNoNonFinite(v, `${path}.${key}`)
  }
}

describe('state invariants (plan M4 exit #5)', () => {
  it('has no NaN, Infinity or other non-finite numbers anywhere', () => {
    const state = runChaoticScript()
    const json = JSON.stringify(state)
    expect(json).not.toContain('NaN')
    expect(json).not.toContain('Infinity')
    expectNoNonFinite(state, 'state')
  })

  it('keeps every value within its documented range', () => {
    const state = runChaoticScript()
    expect(Number.isInteger(state.day) && state.day > 0).toBe(true)
    expect([0, 1, 2, 4]).toContain(state.speed)
    expect(state.budget).toBeGreaterThanOrEqual(0)
    expect(state.time).toBeGreaterThanOrEqual(0)
    expect(state.knowledge).toBeGreaterThanOrEqual(0)

    for (const [id, sim] of Object.entries(state.neighborhoods)) {
      expect(sim.satisfaction, id).toBeGreaterThanOrEqual(0)
      expect(sim.satisfaction, id).toBeLessThanOrEqual(100)
      for (const [need, value] of Object.entries(sim.needs)) {
        expect(value, `${id}.${need}`).toBeGreaterThanOrEqual(0)
        expect(value, `${id}.${need}`).toBeLessThanOrEqual(1)
      }
      expect(sim.reasons.length, id).toBeLessThanOrEqual(3)
      for (let i = 1; i < sim.reasons.length; i++) {
        // Reasons are ordered by gap: coverage ascending (biggest gap first).
        expect(sim.reasons[i - 1].coverage, id).toBeLessThanOrEqual(sim.reasons[i].coverage)
      }
    }

    for (const n of scenario.neighborhoods) {
      expect(state.projects[n.id], n.id).toHaveLength(n.slots)
    }

    const techIds = new Set(loadTechnologies().map((t) => t.id))
    const milestoneIds = new Set(loadMilestones().map((m) => m.id))
    for (const id of state.research) expect(techIds.has(id), `research.${id}`).toBe(true)
    for (const id of state.milestones) expect(milestoneIds.has(id), `milestone ${id}`).toBe(true)
    for (const id of state.milestoneNotices) {
      expect(milestoneIds.has(id), `notice ${id}`).toBe(true)
    }
  })
})