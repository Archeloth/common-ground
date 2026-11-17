import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { applyCommand, initialState } from './state'
import { tick } from './tick'
import { discoverWildlife, habitatsFor, loadWildlife, speciesById, WILDLIFE_KNOWLEDGE } from './wildlife'
import { finishConstruction } from './testHelpers'
import { TICKS_PER_MONTH } from './constants'
import { validateGameState } from './validate'
import type { GameState } from './types'

const scenario = loadScenario()

function withProject(state: GameState, neighborhood: string, project: string): GameState {
  const r = applyCommand({ ...state, budget: 99999, time: 99, knowledge: 999, research: loadAllTech(state) }, {
    type: 'startProject',
    neighborhood,
    project,
  })
  if (!r.ok) throw new Error(r.reason)
  return finishConstruction(r.state)
}

function loadAllTech(state: GameState): string[] {
  return [...new Set([...state.research, 'building_retrofits', 'composting', 'rain_gardens', 'urban_trees', 'repair_cafes'])]
}

// The first day of a month in the given season (1-based month).
function dayInMonth(month: number): number {
  return (month - 1) * TICKS_PER_MONTH + 1
}

describe('wildlife catalog', () => {
  it('loads a dozen species, each tied to at least one kind of district', () => {
    const species = loadWildlife()
    expect(species.length).toBeGreaterThanOrEqual(10)
    for (const s of species) expect(s.where.length, s.id).toBeGreaterThan(0)
  })

  it('makes every species findable somewhere in Willowbrook', () => {
    const kinds = new Set(scenario.neighborhoods.map((n) => n.kind))
    for (const s of loadWildlife()) expect(s.where.some((k) => kinds.has(k)), s.id).toBe(true)
  })
})

describe('discoverWildlife', () => {
  it('finds the badger in the old woodland straight away and pays one Knowledge', () => {
    const s = initialState(scenario)
    const after = discoverWildlife(s, scenario)
    expect(after.wildlife.badger).toEqual({ day: s.day, neighborhood: 'hollow_wood' })
    expect(after.wildlifeNotices).toEqual(['badger'])
    expect(after.knowledge).toBe(s.knowledge + WILDLIFE_KNOWLEDGE)
    expect(validateGameState(after)).toEqual([])
  })

  it('records at most one new species per check', () => {
    let s = initialState(scenario)
    s = withProject(s, 'riverside', 'rain_garden')
    s = withProject(s, 'northfield_farms', 'pocket_meadow')
    const after = discoverWildlife(s, scenario)
    expect(Object.keys(after.wildlife)).toHaveLength(1)
  })

  it('never records the same species twice', () => {
    const once = discoverWildlife(initialState(scenario), scenario)
    const twice = discoverWildlife(once, scenario)
    expect(twice.wildlife.badger).toEqual(once.wildlife.badger)
    expect(twice.wildlifeNotices.filter((id) => id === 'badger')).toHaveLength(1)
  })

  it('needs the right place and season: frogs come to rain gardens in spring', () => {
    const frog = speciesById('common_frog')!
    let s = withProject(initialState(scenario), 'weir_bend', 'rain_garden')
    expect(habitatsFor({ ...s, day: dayInMonth(7) }, scenario, frog)).toEqual([])
    s = { ...s, day: dayInMonth(4) }
    expect(habitatsFor(s, scenario, frog)).toEqual(['weir_bend'])
  })

  it('happens during the monthly settlement in tick()', () => {
    const s = initialState(scenario)
    const before = tick({ ...s, day: TICKS_PER_MONTH - 1 })
    expect(before.wildlife).toEqual({})
    const settled = tick({ ...s, day: TICKS_PER_MONTH })
    expect(settled.wildlife.badger?.neighborhood).toBe('hollow_wood')
  })

  it('can be dismissed from the notices without forgetting the sighting', () => {
    const found = discoverWildlife(initialState(scenario), scenario)
    const r = applyCommand(found, { type: 'dismissWildlifeNotice', species: 'badger' })
    if (!r.ok) throw new Error(r.reason)
    expect(r.state.wildlifeNotices).toEqual([])
    expect(r.state.wildlife.badger).toBeDefined()
  })
})
