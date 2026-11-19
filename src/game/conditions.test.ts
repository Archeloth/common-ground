import { describe, expect, it } from 'vitest'
import { placeConditionMet, placeConditionProblems } from './conditions'
import { TICKS_PER_MONTH } from './constants'
import { getScenario } from './scenario'
import { initialState } from './state'
import type { ScenarioDef } from './types'

// Milestone 10: season conditions follow the town's own year.
const firstOf = (month: number) => (month - 1) * TICKS_PER_MONTH + 1
const ids = { projects: new Set<string>(), species: new Set<string>(), milestones: new Set<string>() }

describe('season conditions', () => {
  const willowbrook = getScenario('willowbrook')
  const river: ScenarioDef = { ...structuredClone(willowbrook), seasons: 'floodplain' }
  const place = willowbrook.neighborhoods[0]
  const state = (month: number) => ({ ...initialState(willowbrook), day: firstOf(month) })

  it('read the temperate year by default', () => {
    expect(placeConditionMet(state(7), willowbrook, place, { type: 'season', seasons: ['summer'] })).toBe(true)
    expect(placeConditionMet(state(7), willowbrook, place, { type: 'season', seasons: ['high_water'] })).toBe(false)
  })

  it("read a river town's high and low water", () => {
    expect(placeConditionMet(state(4), river, place, { type: 'season', seasons: ['high_water'] })).toBe(true)
    expect(placeConditionMet(state(10), river, place, { type: 'season', seasons: ['high_water'] })).toBe(false)
    expect(placeConditionMet(state(7), river, place, { type: 'season', seasons: ['summer'] })).toBe(false)
  })

  it('accept any known season for shared content, only the set given otherwise', () => {
    expect(placeConditionProblems({ type: 'season', seasons: ['rains'] }, ids)).toEqual([])
    expect(placeConditionProblems({ type: 'season', seasons: ['rains'] }, { ...ids, seasons: new Set(['summer']) })).toEqual([
      'unknown season "rains"',
    ])
    expect(placeConditionProblems({ type: 'season', seasons: ['monsoon'] }, ids)).toEqual(['unknown season "monsoon"'])
  })
})
