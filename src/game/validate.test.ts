import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { applyCommand, initialState } from './state'
import { loadTechnologies } from './technologies'
import { loadMilestones } from './milestones'
import { TUTORIAL_DONE } from './tutorial'
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

  it('rejects unknown research ids', () => {
    const s = structuredClone(initialState(scenario)) as GameState
    s.research = [...s.research, 'cold_fusion']
    expect(validateGameState(s).some((m) => m.includes('research'))).toBe(true)
  })

  it('rejects unknown milestone ids in the notices', () => {
    const s = structuredClone(initialState(scenario)) as GameState
    s.milestoneNotices = ['no_such_chapter']
    expect(validateGameState(s).some((m) => m.includes('milestoneNotices'))).toBe(true)
  })

  it('accepts a state with researched techs and completed milestones', () => {
    const s = structuredClone(initialState(scenario)) as GameState
    s.research = [...s.research, 'building_retrofits']
    s.milestones = ['first_steps']
    s.milestoneNotices = ['first_steps']
    // Loaders agree with the catalog (valid ids), so validation stays quiet.
    expect(validateGameState(s)).toEqual([])
    expect(loadTechnologies().length).toBe(8)
    expect(loadMilestones().length).toBe(5)
  })
})

describe('validateGameState tutorialStep (Milestone 8)', function () {
  it('accepts the initial and done values', function () {
    const fresh = initialState(scenario)
    expect(validateGameState(fresh)).toEqual([])
    const finished = { ...fresh, tutorialStep: TUTORIAL_DONE }
    expect(validateGameState(finished)).toEqual([])
  })

  it('rejects a tutorialStep outside the valid range', function () {
    for (const bad of [-1, 1.5, 99]) {
      const s = structuredClone(initialState(scenario)) as GameState
      s.tutorialStep = bad as number
      expect(validateGameState(s).some((m) => m.includes('tutorialStep')), String(bad)).toBe(true)
    }
  })
})