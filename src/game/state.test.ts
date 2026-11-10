import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { applyCommand, initialState } from './state'
import type { Command, GameState } from './types'

const scenario = loadScenario()

function gardenStart(neighborhood = 'old_town'): Command {
  return { type: 'start_project', neighborhood, project: 'community_garden' }
}

function solarStart(neighborhood = 'old_town'): Command {
  return { type: 'start_project', neighborhood, project: 'rooftop_solar' }
}

describe('initialState', () => {
  it('mirrors the scenario start values and fills every slot empty', () => {
    const s = initialState(scenario)
    expect(s.budget).toBe(scenario.start.budget)
    expect(s.time).toBe(scenario.start.time)
    for (const n of scenario.neighborhoods) {
      expect(s.projects[n.id]).toHaveLength(n.slots)
      expect(s.projects[n.id].every((slot) => slot === null)).toBe(true)
    }
  })
})

describe('start_project', () => {
  it('charges cost and community time and fills the first free slot', () => {
    const before = initialState(scenario)
    const result = applyCommand(before, gardenStart())
    expect(result.ok).toBe(true)
    if (!result.ok) return
    expect(result.state.budget).toBe(before.budget - 400)
    expect(result.state.time).toBe(before.time - 2)
    expect(result.state.projects.old_town[0]).toBe('community_garden')
    expect(result.state.projects.old_town.filter((s) => s !== null)).toHaveLength(1)
  })

  it('fills the first free slot and leaves the base state reusable', () => {
    const s = initialState(scenario)
    const r1 = applyCommand(s, gardenStart())
    const r2 = applyCommand(s, solarStart())
    expect(r1.ok).toBe(true)
    expect(r2.ok).toBe(true)
    if (!r1.ok || !r2.ok) return
    expect(r1.state.projects.old_town[0]).toBe('community_garden')
    expect(r2.state.projects.old_town[0]).toBe('rooftop_solar')
  })

  it('community garden can be started in every neighborhood', () => {
    for (const n of scenario.neighborhoods) {
      const result = applyCommand(initialState(scenario), gardenStart(n.id))
      expect(result.ok, `garden refused in ${n.id}`).toBe(true)
    }
  })

  it('refuses an unknown neighborhood', () => {
    const result = applyCommand(initialState(scenario), {
      type: 'start_project',
      neighborhood: 'nowhere',
      project: 'community_garden',
    })
    expect(result).toEqual({ ok: false, reason: 'unknown_neighborhood' })
  })

  it('refuses an unknown project', () => {
    const result = applyCommand(initialState(scenario), {
      type: 'start_project',
      neighborhood: 'old_town',
      project: 'wind_turbine',
    })
    expect(result).toEqual({ ok: false, reason: 'unknown_project' })
  })

  it('refuses to start a duplicate project in the same neighborhood', () => {
    const s = initialState(scenario)
    const first = applyCommand(s, gardenStart())
    expect(first.ok).toBe(true)
    const second = applyCommand(first.ok ? first.state : s, gardenStart())
    expect(second).toEqual({ ok: false, reason: 'project_already_active' })
  })

  it('refuses when there is no free slot', () => {
    const full: GameState = {
      budget: 15000,
      time: 6,
      projects: { old_town: ['a', 'b', 'c', 'd'] },
    }
    expect(applyCommand(full, gardenStart())).toEqual({ ok: false, reason: 'no_free_slot' })
  })

  it('refuses a project that is not allowed in the kind (no solar on farmland)', () => {
    const result = applyCommand(initialState(scenario), solarStart('northfield_farms'))
    expect(result).toEqual({ ok: false, reason: 'not_allowed_in_kind' })
  })

  it('refuses when the budget is insufficient', () => {
    const poor: GameState = { ...initialState(scenario), budget: 100 }
    expect(applyCommand(poor, gardenStart())).toEqual({ ok: false, reason: 'insufficient_budget' })
  })

  it('refuses when the community time is insufficient', () => {
    const busy: GameState = { ...initialState(scenario), time: 0 }
    expect(applyCommand(busy, gardenStart())).toEqual({ ok: false, reason: 'insufficient_time' })
  })
})

describe('remove_project', () => {
  it('frees the slot without refunding budget or time', () => {
    const s = initialState(scenario)
    const started = applyCommand(s, gardenStart())
    expect(started.ok).toBe(true)
    if (!started.ok) return
    const removed = applyCommand(started.state, {
      type: 'remove_project',
      neighborhood: 'old_town',
      slot: 0,
    })
    expect(removed.ok).toBe(true)
    if (!removed.ok) return
    expect(removed.state.projects.old_town[0]).toBeNull()
    expect(removed.state.budget).toBe(started.state.budget)
    expect(removed.state.time).toBe(started.state.time)
  })

  it('refuses an invalid slot index', () => {
    for (const slot of [-1, 99]) {
      const result = applyCommand(initialState(scenario), {
        type: 'remove_project',
        neighborhood: 'old_town',
        slot,
      })
      expect(result).toEqual({ ok: false, reason: 'invalid_slot' })
    }
  })

  it('refuses to remove from an empty slot', () => {
    const result = applyCommand(initialState(scenario), {
      type: 'remove_project',
      neighborhood: 'old_town',
      slot: 2,
    })
    expect(result).toEqual({ ok: false, reason: 'empty_slot' })
  })

  it('refuses an unknown neighborhood', () => {
    const result = applyCommand(initialState(scenario), {
      type: 'remove_project',
      neighborhood: 'nowhere',
      slot: 0,
    })
    expect(result).toEqual({ ok: false, reason: 'unknown_neighborhood' })
  })
})

describe('purity & determinism', () => {
  it('never mutates its input, even on success', () => {
    const s = initialState(scenario)
    const snapshot = structuredClone(s)
    const success = applyCommand(s, gardenStart())
    expect(s).toEqual(snapshot)
    const refusal = applyCommand(s, solarStart('northfield_farms'))
    expect(refusal).toEqual({ ok: false, reason: 'not_allowed_in_kind' })
    expect(s).toEqual(snapshot)
    if (success.ok) {
      expect(success.state).not.toBe(s)
      expect(success.state.projects).not.toBe(s.projects)
      expect(success.state.projects.old_town).not.toBe(s.projects.old_town)
    }
  })

  it('same state + same commands gives an identical result', () => {
    const a = initialState(scenario)
    const b = initialState(scenario)
    const r1 = applyCommand(a, gardenStart())
    const r2 = applyCommand(b, gardenStart())
    expect(r1).toEqual(r2)
    if (r1.ok && r2.ok) {
      expect(r1.state).toEqual(r2.state)
      expect(r1.state.budget).toBe(b.budget - 400)
      expect(r1.state.time).toBe(b.time - 2)
    }
  })
})
