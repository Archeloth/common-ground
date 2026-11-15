import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { applyCommand, initialState } from './state'
import { loadMilestones, milestoneCompleted, townSatisfaction } from './milestones'
import type { MilestoneCondition, MilestoneDef } from './milestones'
import type { Command, GameState } from './types'

const scenario = loadScenario()
const milestones = loadMilestones()
const firstMilestone = milestones[0]

describe('milestones catalog', () => {
  it('has five chapters with unique ids and rewards', () => {
    expect(milestones).toHaveLength(5)
    expect(new Set(milestones.map((m) => m.id)).size).toBe(5)
    for (const m of milestones) {
      expect(m.name.trim().length).toBeGreaterThan(0)
      expect(m.goal.trim().length).toBeGreaterThan(0)
      expect(m.conditions.length).toBeGreaterThan(0)
      expect(m.reward.knowledge).toBeGreaterThanOrEqual(0)
      expect(m.chapter).toBeGreaterThanOrEqual(1)
    }
  })

  it('starts with the "First steps" chapter', () => {
    expect(firstMilestone.id).toBe('first_steps')
    expect(firstMilestone.chapter).toBe(1)
  })
})

describe('milestone conditions', () => {
  it('detects a project placed in a specific neighborhood', () => {
    const def: MilestoneDef = {
      ...firstMilestone,
      conditions: [{ type: 'projectIn', neighborhood: 'linden_flats', project: 'community_garden' }],
    }
    const fresh = initialState(scenario)
    expect(milestoneCompleted(fresh, def, scenario)).toBe(false)
    const started = applyCommand(fresh, {
      type: 'startProject',
      neighborhood: 'linden_flats',
      project: 'community_garden',
    })
    expect(started.ok).toBe(true)
    if (started.ok) expect(milestoneCompleted(started.state, def, scenario)).toBe(true)
  })

  it('counts projects town-wide and filled slots', () => {
    let state: GameState = { ...initialState(scenario), research: [...initialState(scenario).research, 'building_retrofits'] }
    const start = (command: Command): void => {
      const result = applyCommand(state, command)
      if (result.ok) state = result.state
    }
    start({ type: 'startProject', neighborhood: 'old_town', project: 'retrofit_program' })
    start({ type: 'startProject', neighborhood: 'station_quarter', project: 'retrofit_program' })

    const twoRetrofits: MilestoneDef = {
      ...firstMilestone,
      conditions: [{ type: 'projectCount', project: 'retrofit_program', min: 2 }],
    }
    expect(milestoneCompleted(state, twoRetrofits, scenario)).toBe(true)

    const threeSlots: MilestoneDef = {
      ...firstMilestone,
      conditions: [{ type: 'slotsFilled', min: 3 }],
    }
    expect(milestoneCompleted(state, threeSlots, scenario)).toBe(false)
    start({ type: 'startProject', neighborhood: 'old_town', project: 'community_garden' })
    expect(milestoneCompleted(state, threeSlots, scenario)).toBe(true)
  })

  it('averages a need across the town', () => {
    const def: MilestoneDef = {
      ...firstMilestone,
      conditions: [{ type: 'needsAverage', need: 'mobility', min: 0.9 }],
    }
    const relaxed: MilestoneCondition[] = [{ type: 'needsAverage', need: 'mobility', min: 0.1 }]
    const fresh = initialState(scenario)
    expect(milestoneCompleted(fresh, def, scenario)).toBe(false)
    expect(milestoneCompleted(fresh, { ...firstMilestone, conditions: relaxed }, scenario)).toBe(true)
  })

  it('computes the resident-weighted town satisfaction', () => {
    const fresh = initialState(scenario)
    const boosted = {
      ...fresh,
      neighborhoods: {
        ...fresh.neighborhoods,
        old_town: { ...fresh.neighborhoods.old_town, satisfaction: 95 },
      },
    }
    expect(townSatisfaction(boosted, scenario)).toBeGreaterThan(townSatisfaction(fresh, scenario))
  })

  it('the first milestone completes after a scripted playthrough (exit test)', () => {
    let state: GameState = { ...initialState(scenario), research: [...initialState(scenario).research, 'building_retrofits'] }
    const start = (command: Command): void => {
      const result = applyCommand(state, command)
      if (result.ok) state = result.state
    }
    start({ type: 'startProject', neighborhood: 'linden_flats', project: 'community_garden' })
    for (const id of ['old_town', 'station_quarter', 'meadow_rise']) {
      start({ type: 'startProject', neighborhood: id, project: 'retrofit_program' })
    }
    const ready: GameState = {
      ...state,
      neighborhoods: Object.fromEntries(
        scenario.neighborhoods.map((n) => [n.id, { ...state.neighborhoods[n.id], satisfaction: 70 }]),
      ),
    }
    expect(townSatisfaction(ready, scenario)).toBeGreaterThanOrEqual(60)
    expect(milestoneCompleted(ready, firstMilestone, scenario)).toBe(true)
  })
})