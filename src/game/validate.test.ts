import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { applyCommand, initialState } from './state'
import { validateGameState } from './validate'
import type { GameState } from './types'

const scenario = loadScenario()

describe('validateGameState', () => {
  it('accepts the initial state', () => {
    expect(validateGameState(initialState(scenario))).toEqual([])
  })

  it('accepts a played state', () => {
    const result = applyCommand(initialState(scenario), {
      type: 'startProject',
      neighborhood: 'old_town',
      project: 'community_garden',
    })
    expect(result.ok).toBe(true)
    if (result.ok) expect(validateGameState(result.state)).toEqual([])
  })

  it('rejects non-object input', () => {
    for (const bad of [null, 'x', 42, [], true]) {
      expect(validateGameState(bad).length, String(bad)).toBeGreaterThan(0)
    }
  })

  it('reports bad resources with their path', () => {
    const s = initialState(scenario)
    expect(validateGameState({ ...s, budget: -5 }).some((m) => m.includes('budget'))).toBe(true)
    expect(validateGameState({ ...s, knowledge: Number.NaN }).some((m) => m.includes('knowledge'))).toBe(true)
    expect(validateGameState({ ...s, speed: 3 }).some((m) => m.includes('speed'))).toBe(true)
    expect(validateGameState({ ...s, day: -1 }).some((m) => m.includes('day'))).toBe(true)
  })

  it('rejects out-of-range needs and satisfaction', () => {
    const s = structuredClone(initialState(scenario)) as GameState
    s.neighborhoods.old_town.needs.food = 1.4
    expect(validateGameState(s).some((m) => m.includes('needs.food'))).toBe(true)

    const s2 = structuredClone(initialState(scenario)) as GameState
    s2.neighborhoods.old_town.satisfaction = -3
    expect(validateGameState(s2).some((m) => m.includes('satisfaction'))).toBe(true)
  })

  it('rejects an unknown project in a slot', () => {
    const s = structuredClone(initialState(scenario)) as GameState
    s.projects.old_town = ['nope', null, null, null]
    expect(validateGameState(s).some((m) => m.includes('unknown project'))).toBe(true)
  })

  it('rejects wrong slot counts', () => {
    const s = structuredClone(initialState(scenario)) as GameState
    s.projects.hollow_wood = [null]
    expect(validateGameState(s).some((m) => m.includes('slots'))).toBe(true)
  })

  it('rejects a non-finite number anywhere', () => {
    const s = structuredClone(initialState(scenario)) as GameState
    s.time = Infinity
    expect(validateGameState(s).some((m) => m.includes('non-finite'))).toBe(true)
  })
})