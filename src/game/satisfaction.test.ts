import { describe, expect, it } from 'vitest'
import { loadKinds } from './kinds'
import { loadScenario } from './scenario'
import { neighborhoodSatisfaction, satisfactionOf, SATISFACTION_WEIGHTS } from './satisfaction'
import type { Needs } from './types'

const empty: Needs = { energy: 0, food: 0, mobility: 0, green: 0, waste: 0, housing: 0 }
const full: Needs = { energy: 1, food: 1, mobility: 1, green: 1, waste: 1, housing: 1 }

describe('satisfaction placeholder formula', () => {
  it('is 100 when every need is fully covered, 0 when none is', () => {
    expect(satisfactionOf(full)).toBe(100)
    expect(satisfactionOf(empty)).toBe(0)
  })

  it('gives each need exactly its stated weight', () => {
    for (const need of Object.keys(SATISFACTION_WEIGHTS) as (keyof Needs)[]) {
      const needs = { ...empty, [need]: 1 }
      expect(satisfactionOf(needs), need).toBe(Math.round(SATISFACTION_WEIGHTS[need] * 100))
    }
  })

  it('gets the total right on a mixed needs profile', () => {
    const mixed: Needs = { energy: 0.5, food: 1, mobility: 0.5, green: 1, waste: 0.5, housing: 0.5 }
    // 0.2*0.5 + 0.2*1 + 0.15*0.5 + 0.15*1 + 0.1*0.5 + 0.2*0.5 = 0.675
    expect(satisfactionOf(mixed)).toBe(68)
  })

  it('is non-decreasing in every need', () => {
    for (const need of Object.keys(SATISFACTION_WEIGHTS) as (keyof Needs)[]) {
      const low = { ...full, [need]: 0 }
      const high = { ...full, [need]: 1 }
      expect(satisfactionOf(high)).toBeGreaterThanOrEqual(satisfactionOf(low))
    }
  })

  it('yields sensible, different placeholder values for Willowbrook', () => {
    const scenario = loadScenario()
    expect(() => loadKinds()).not.toThrow()
    const values = scenario.neighborhoods.map((n) => neighborhoodSatisfaction(n))
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
    // The exit test for this milestone: click any blob and read different values.
    expect(new Set(values).size).toBeGreaterThan(1)
  })
})
