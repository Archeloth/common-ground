import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { applyCommand, initialState } from './state'
import { tick } from './tick'
import { monthlyIncome, monthlyUpkeep, projectKnowledgeIncome, volunteerCap } from './economy'
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

describe('balance pass: scarcity', () => {
  const withProjects = (): GameState => {
    let s: GameState = { ...initialState(scenario), budget: 50000, knowledge: 100 }
    for (const tech of ['building_retrofits', 'community_learning']) {
      const r = applyCommand(s, { type: 'research', tech })
      if (r.ok) s = r.state
    }
    for (const [neighborhood, project] of [
      ['old_town', 'rooftop_solar'],
      ['old_town', 'retrofit_program'],
      ['school_green', 'community_garden'],
    ] as const) {
      const r = applyCommand({ ...s, time: 20 }, { type: 'startProject', neighborhood, project })
      if (!r.ok) throw new Error(r.reason)
      s = r.state
    }
    return s
  }

  it('charges upkeep for running projects and bus lines (5% of price)', () => {
    const s = withProjects()
    // solar 900, retrofit 600, garden 400 -> 45 + 30 + 20
    expect(monthlyUpkeep(s)).toBe(95)
    expect(monthlyUpkeep({ ...s, busLines: [['old_town', 'riverside']] })).toBe(95 + 60)
  })

  it('does not charge for a lapsed project', () => {
    const s = withProjects()
    const lapsed = { ...s, day: s.projectExpiry.school_green[0]! + 1 }
    expect(monthlyUpkeep(lapsed)).toBe(75)
  })

  it('pays upkeep in the settlement, and money never goes below zero', () => {
    const s = withProjects()
    const income = monthlyIncome(s, scenario).budget
    const settled = settle(s)
    expect(settled.budget).toBe(s.budget + income - monthlyUpkeep(s))
    const broke = settle({ ...s, busLines: Array.from({ length: 80 }, () => ['old_town', 'riverside'] as [string, string]), budget: 0 })
    expect(broke.budget).toBe(0)
  })

  it('pays a happy town more tax', () => {
    const s = initialState(scenario)
    const happy = {
      ...s,
      neighborhoods: Object.fromEntries(
        Object.entries(s.neighborhoods).map(([id, n]) => [id, { ...n, satisfaction: 85 }]),
      ),
    }
    expect(monthlyIncome(happy, scenario).budget).toBeGreaterThan(monthlyIncome(s, scenario).budget)
  })

  it('caps the volunteer pool: the excess drifts away', () => {
    const s = { ...initialState(scenario), time: 500 }
    const cap = volunteerCap(s, scenario)
    expect(cap).toBeLessThan(30)
    expect(tick(s).time).toBe(cap)
  })

  it('gives workshops diminishing returns (1 series: 2/month, 4 series: 4/month)', () => {
    let s: GameState = { ...initialState(scenario), budget: 50000, knowledge: 100, time: 50 }
    const r = applyCommand(s, { type: 'research', tech: 'community_learning' })
    if (!r.ok) throw new Error(r.reason)
    s = r.state
    const build = (neighborhood: string) => {
      const result = applyCommand(s, { type: 'startProject', neighborhood, project: 'workshop_series' })
      if (!result.ok) throw new Error(result.reason)
      s = result.state
    }
    build('old_town')
    expect(projectKnowledgeIncome(s)).toBe(2)
    for (const id of ['school_green', 'meadow_rise', 'station_quarter']) build(id)
    expect(projectKnowledgeIncome(s)).toBe(4) // not 8
  })
})
