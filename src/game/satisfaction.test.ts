import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { satisfactionOf, shortfalls, SATISFACTION_WEIGHTS } from './satisfaction'
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

  it('yields sensible, different satisfaction values for Willowbrook', () => {
    const scenario = loadScenario()
    const values = scenario.neighborhoods.map((n) => satisfactionOf(n.needs))
    for (const v of values) {
      expect(v).toBeGreaterThanOrEqual(0)
      expect(v).toBeLessThanOrEqual(100)
    }
    // Milestone 2 exit test: click any blob and read different values.
    expect(new Set(values).size).toBeGreaterThan(1)
  })

  it('shortfalls lists the largest gaps first, capped by count', () => {
    const needs: Needs = {
      energy: 0.9,
      food: 0.4,
      mobility: 0.7,
      green: 0.6,
      waste: 0.9,
      housing: 0.3,
    }
    expect(shortfalls(needs, 3).map((r) => r.need)).toEqual(['housing', 'food', 'green'])
    expect(shortfalls(needs, 3)[0].coverage).toBe(0.3)
  })

  it('shortfalls is empty when every need is fully covered', () => {
    expect(shortfalls(full, 3)).toEqual([])
  })

  it('shortfalls is deterministic for equal gaps', () => {
    const allEqual: Needs = { energy: 0.5, food: 0.5, mobility: 0.5, green: 0.5, waste: 0.5, housing: 0.5 }
    expect(shortfalls(allEqual, 3).map((r) => r.need)).toEqual(['energy', 'food', 'mobility'])
  })
})
