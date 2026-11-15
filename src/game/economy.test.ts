import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { applyCommand, initialState } from './state'
import { tick } from './tick'
import { monthlyIncome } from './economy'
import { TICKS_PER_MONTH } from './constants'
import type { GameState } from './types'

const scenario = loadScenario()

// Advance to the day before a month boundary, then one more tick settles it.
function settle(state: GameState): GameState {
  return tick({ ...state, day: TICKS_PER_MONTH })
}

describe('monthlyIncome (shown in the top bar)', () => {
  it('is exactly what the monthly settlement pays', () => {
    const s = initialState(scenario)
    const income = monthlyIncome(s, scenario)
    const after = settle(s)
    expect(after.budget - s.budget).toBe(income.budget)
    expect(after.time - s.time).toBe(income.time)
    expect(after.knowledge - s.knowledge).toBe(income.knowledge)
  })

  it('adds the Knowledge of running workshops', () => {
    let s: GameState = { ...initialState(scenario), research: [...initialState(scenario).research, 'community_learning'] }
    const before = monthlyIncome(s, scenario).knowledge
    const started = applyCommand(s, { type: 'startProject', neighborhood: 'school_green', project: 'workshop_series' })
    if (!started.ok) throw new Error(started.reason)
    s = started.state
    expect(monthlyIncome(s, scenario).knowledge).toBe(before + 2)
    expect(settle(s).knowledge - s.knowledge).toBe(before + 2)
  })

  it('grows Volunteers with engagement', () => {
    const s = initialState(scenario)
    const engaged = {
      ...s,
      engagement: Object.fromEntries(scenario.neighborhoods.map((n) => [n.id, 100])),
    }
    expect(monthlyIncome(engaged, scenario).time).toBeGreaterThan(monthlyIncome(s, scenario).time)
  })
})
