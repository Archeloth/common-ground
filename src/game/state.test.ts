import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { applyCommand, initialState, meetingReadyIn } from './state'
import type { Command, GameState } from './types'
import { TUTORIAL_DONE } from './tutorial'

const scenario = loadScenario()

function gardenStart(neighborhood = 'old_town'): Command {
  return { type: 'startProject', neighborhood, project: 'community_garden' }
}

function solarStart(neighborhood = 'old_town'): Command {
  return { type: 'startProject', neighborhood, project: 'rooftop_solar' }
}

describe('initialState', () => {
  it('mirrors the scenario start values and fills every slot empty', () => {
    const s = initialState(scenario)
    expect(s.budget).toBe(scenario.start.budget)
    expect(s.time).toBe(scenario.start.time)
    expect(s.knowledge).toBe(scenario.start.knowledge ?? 0)
    expect(s.research).toEqual(scenario.start.unlockedTech)
    expect(s.milestones).toEqual([])
    expect(s.milestoneNotices).toEqual([])
    expect(s.day).toBe(1)
    expect(s.speed).toBe(0) // a new town starts paused
    for (const n of scenario.neighborhoods) {
      expect(s.projects[n.id]).toHaveLength(n.slots)
      expect(s.projects[n.id].every((slot) => slot === null)).toBe(true)
      expect(s.neighborhoods[n.id].needs).toEqual(n.needs)
      expect(s.neighborhoods[n.id].satisfaction).toBeGreaterThanOrEqual(0)
      expect(s.neighborhoods[n.id].satisfaction).toBeLessThanOrEqual(100)
      expect(s.neighborhoods[n.id].reasons.length).toBeGreaterThan(0)
      expect(s.neighborhoods[n.id].reasons.length).toBeLessThanOrEqual(3)
    }
  })
})

describe('startProject', () => {
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
      type: 'startProject',
      neighborhood: 'nowhere',
      project: 'community_garden',
    })
    expect(result).toEqual({ ok: false, reason: 'unknown_neighborhood' })
  })

  it('refuses an unknown project', () => {
    const result = applyCommand(initialState(scenario), {
      type: 'startProject',
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
    const base = initialState(scenario)
    const full: GameState = {
      ...base,
      projects: { ...base.projects, old_town: ['a', 'b', 'c', 'd'] },
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

describe('removeProject', () => {
  it('frees the slot without refunding budget or time', () => {
    const s = initialState(scenario)
    const started = applyCommand(s, gardenStart())
    expect(started.ok).toBe(true)
    if (!started.ok) return
    const removed = applyCommand(started.state, {
      type: 'removeProject',
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
        type: 'removeProject',
        neighborhood: 'old_town',
        slot,
      })
      expect(result).toEqual({ ok: false, reason: 'invalid_slot' })
    }
  })

  it('refuses to remove from an empty slot', () => {
    const result = applyCommand(initialState(scenario), {
      type: 'removeProject',
      neighborhood: 'old_town',
      slot: 2,
    })
    expect(result).toEqual({ ok: false, reason: 'empty_slot' })
  })

  it('refuses an unknown neighborhood', () => {
    const result = applyCommand(initialState(scenario), {
      type: 'removeProject',
      neighborhood: 'nowhere',
      slot: 0,
    })
    expect(result).toEqual({ ok: false, reason: 'unknown_neighborhood' })
  })
})

describe('research', () => {
  it('researches a technology, spending knowledge', () => {
    const s = initialState(scenario)
    const result = applyCommand(s, { type: 'research', tech: 'building_retrofits' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.research).toContain('building_retrofits')
      expect(result.state.knowledge).toBe((scenario.start.knowledge ?? 0) - 10)
    }
  })

  it('refuses an unknown technology', () => {
    const result = applyCommand(initialState(scenario), { type: 'research', tech: 'cold_fusion' })
    expect(result).toEqual({ ok: false, reason: 'unknown_tech' })
  })

  it('refuses an already-researched technology', () => {
    const result = applyCommand(initialState(scenario), { type: 'research', tech: 'energy_audits' })
    expect(result).toEqual({ ok: false, reason: 'already_researched' })
  })

  it('refuses when prerequisites are missing', () => {
    // heat_pumps needs building_retrofits, which needs energy_audits.
    const result = applyCommand(initialState(scenario), { type: 'research', tech: 'heat_pumps' })
    expect(result).toEqual({ ok: false, reason: 'prerequisites_not_met' })
  })

  it('refuses when knowledge is insufficient', () => {
    const poor: GameState = { ...initialState(scenario), knowledge: 5 }
    const result = applyCommand(poor, { type: 'research', tech: 'building_retrofits' })
    expect(result).toEqual({ ok: false, reason: 'insufficient_knowledge' })
  })

  it('leaves the input untouched on success and refusal', () => {
    const s = initialState(scenario)
    const snapshot = structuredClone(s)
    applyCommand(s, { type: 'research', tech: 'building_retrofits' })
    applyCommand(s, { type: 'research', tech: 'heat_pumps' })
    expect(s).toEqual(snapshot)
  })
})

describe('clearMilestoneNotices', () => {
  it('empties the notice queue', () => {
    const s: GameState = { ...initialState(scenario), milestoneNotices: ['first_steps'] }
    const result = applyCommand(s, { type: 'clearMilestoneNotices' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.state.milestoneNotices).toEqual([])
  })
})

describe('engagement time discount', () => {
  it('halves the community-time cost at engagement 100', () => {
    const s = initialState(scenario)
    const hot = { ...s, engagement: { ...s.engagement, old_town: 100 } }
    const result = applyCommand(hot, {
      type: 'startProject',
      neighborhood: 'old_town',
      project: 'community_garden',
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.state.time).toBe(hot.time - 1) // 2 -> 1
  })

  it('subtracts the discounted cost, not the list cost', () => {
    const s = { ...initialState(scenario), research: [...initialState(scenario).research, 'building_retrofits'] }
    const engaged = { ...s, engagement: { ...s.engagement, old_town: 50 } }
    const result = applyCommand(engaged, {
      type: 'startProject',
      neighborhood: 'old_town',
      project: 'retrofit_program',
    })
    expect(result.ok).toBe(true)
    if (result.ok) {
      // 1 * (1 - 50/200) = 0.75 -> rounds to 1; unchanged at this engagement.
      expect(result.state.time).toBe(engaged.time - 1)
    }
  })
})

describe('townMeeting', () => {
  it('raises engagement by 10 and costs one community time', () => {
    const s = initialState(scenario)
    const result = applyCommand(s, { type: 'townMeeting', neighborhood: 'old_town' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.engagement.old_town).toBe(s.engagement.old_town + 10)
      expect(result.state.time).toBe(s.time - 1)
    }
  })

  it('clamps engagement at 100', () => {
    const s = { ...initialState(scenario), engagement: { ...initialState(scenario).engagement, old_town: 95 } }
    const result = applyCommand(s, { type: 'townMeeting', neighborhood: 'old_town' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.state.engagement.old_town).toBe(100)
  })

  it('refuses an unknown neighborhood', () => {
    const result = applyCommand(initialState(scenario), { type: 'townMeeting', neighborhood: 'nowhere' })
    expect(result).toEqual({ ok: false, reason: 'unknown_neighborhood' })
  })

  it('refuses when community time is exhausted', () => {
    const busy = { ...initialState(scenario), time: 0 }
    const result = applyCommand(busy, { type: 'townMeeting', neighborhood: 'old_town' })
    expect(result).toEqual({ ok: false, reason: 'insufficient_time' })
  })

  it('leaves the input untouched', () => {
    const s = initialState(scenario)
    const snapshot = structuredClone(s)
    applyCommand(s, { type: 'townMeeting', neighborhood: 'old_town' })
    expect(s).toEqual(snapshot)
  })
})

describe('town meeting cooldown', () => {
  it('allows one meeting per district every two months', () => {
    const s = { ...initialState(scenario), time: 10 }
    const first = applyCommand(s, { type: 'townMeeting', neighborhood: 'old_town' })
    if (!first.ok) throw new Error(first.reason)
    expect(applyCommand(first.state, { type: 'townMeeting', neighborhood: 'old_town' })).toEqual({
      ok: false,
      reason: 'meeting_cooldown',
    })
    expect(meetingReadyIn(first.state, 'old_town')).toBe(60)
    const later = { ...first.state, day: first.state.day + 59 }
    expect(applyCommand(later, { type: 'townMeeting', neighborhood: 'old_town' }).ok).toBe(false)
    const ready = { ...first.state, day: first.state.day + 60 }
    expect(applyCommand(ready, { type: 'townMeeting', neighborhood: 'old_town' }).ok).toBe(true)
  })

  it('keeps each district on its own rhythm', () => {
    const s = { ...initialState(scenario), time: 10 }
    const first = applyCommand(s, { type: 'townMeeting', neighborhood: 'old_town' })
    if (!first.ok) throw new Error(first.reason)
    expect(applyCommand(first.state, { type: 'townMeeting', neighborhood: 'riverside' }).ok).toBe(true)
  })
})

describe('startBusLine', () => {
  const researched = (): GameState => {
    // Enough Knowledge for the research (it costs more than the start gives).
    const rich = { ...initialState(scenario), knowledge: 50 }
    const result = applyCommand(rich, { type: 'research', tech: 'public_transport' })
    if (!result.ok) throw new Error(`research refused: ${result.reason}`)
    return result.state
  }

  it('links two adjacent neighborhoods and costs 1,000 budget', () => {
    const s = researched()
    const result = applyCommand(s, { type: 'startBusLine', from: 'old_town', to: 'riverside' })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.busLines).toEqual([['old_town', 'riverside']])
      expect(result.state.budget).toBe(s.budget - 1000)
    }
  })

  it('needs the public transport research', () => {
    const result = applyCommand(initialState(scenario), {
      type: 'startBusLine',
      from: 'old_town',
      to: 'riverside',
    })
    expect(result).toEqual({ ok: false, reason: 'prerequisites_not_met' })
  })

  it('refuses a non-adjacent pair', () => {
    const result = applyCommand(researched(), { type: 'startBusLine', from: 'old_town', to: 'hollow_wood' })
    expect(result).toEqual({ ok: false, reason: 'not_adjacent' })
  })

  it('refuses a duplicate line regardless of order', () => {
    const first = applyCommand(researched(), { type: 'startBusLine', from: 'old_town', to: 'riverside' })
    expect(first.ok).toBe(true)
    if (!first.ok) return
    const second = applyCommand(first.state, { type: 'startBusLine', from: 'riverside', to: 'old_town' })
    expect(second).toEqual({ ok: false, reason: 'bus_line_exists' })
  })

  it('refuses an unknown end', () => {
    const result = applyCommand(researched(), { type: 'startBusLine', from: 'old_town', to: 'nowhere' })
    expect(result).toEqual({ ok: false, reason: 'unknown_neighborhood' })
  })

  it('refuses when the budget is too low', () => {
    const poor = { ...researched(), budget: 500 }
    const result = applyCommand(poor, { type: 'startBusLine', from: 'old_town', to: 'riverside' })
    expect(result).toEqual({ ok: false, reason: 'insufficient_budget' })
  })
})
  describe('setSpeed', () => {
  it('sets the simulation speed', () => {
    const s = initialState(scenario)
    const result = applyCommand(s, { type: 'setSpeed', speed: 4 })
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.state.speed).toBe(4)
      expect(result.state.day).toBe(1) // unchanged
    }
  })

  it('refuses a speed outside the allowed set', () => {
    // The union type only allows 0/1/2/4, so cast to simulate bad input.
    const result = applyCommand(initialState(scenario), {
      type: 'setSpeed',
      speed: 3 as 0 | 1 | 2 | 4,
    })
    expect(result).toEqual({ ok: false, reason: 'invalid_speed' })
  })

  it('leaves the input untouched', () => {
    const s = initialState(scenario)
    const snapshot = structuredClone(s)
    applyCommand(s, { type: 'setSpeed', speed: 0 })
    expect(s).toEqual(snapshot)
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
describe('tutorialNext (Milestone 8)', function () {
  it('advances one step at a time', function () {
    const s = initialState(scenario)
    const first = applyCommand(s, { type: 'tutorialNext' })
    if (!first.ok) throw new Error('tutorialNext refused')
    expect(first.state.tutorialStep).toBe(1)
    const second = applyCommand(first.state, { type: 'tutorialNext' })
    if (!second.ok) throw new Error('tutorialNext refused')
    expect(second.state.tutorialStep).toBe(2)
  })

  it('clamps at the done sentinel', function () {
    const finished = { ...initialState(scenario), tutorialStep: TUTORIAL_DONE }
    const result = applyCommand(finished, { type: 'tutorialNext' })
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.state.tutorialStep).toBe(TUTORIAL_DONE)
  })

  it('does not mutate its input', function () {
    const s = initialState(scenario)
    const snapshot = structuredClone(s)
    applyCommand(s, { type: 'tutorialNext' })
    expect(s).toEqual(snapshot)
  })
})