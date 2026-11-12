import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { applyCommand, initialState } from './state'
import { tick } from './tick'
import type { Command, GameState } from './types'

const scenario = loadScenario()
const MAX_DAYS = 36 * 30 // the plan's chapter 1 should be reachable within ~3 years

// Two simple, deterministic bot strategies (the plan's "bot playthrough" tool):
// they differ in build order, which is exactly what the Milestone 7 exit test
// wants — "two different playthroughs reach the same goal by different routes".

function makeAct(order: Array<[string, string]>) {
  let cursor = 0
  return (state: GameState): Command | null => {
    for (let i = 0; i < order.length; i++) {
      const index = (cursor + i) % order.length
      const [neighborhood, project] = order[index]
      const command: Command = { type: 'startProject', neighborhood, project }
      if (applyCommand(state, command).ok) {
        cursor = index
        return command
      }
    }
    // Community time is the scarce resource: spend idle months on town meetings.
    for (const n of scenario.neighborhoods) {
      const command: Command = { type: 'townMeeting', neighborhood: n.id }
      if (applyCommand(state, command).ok) return command
    }
    return null
  }
}

// Route A: food-first — gardens everywhere (which also raise engagement), then
// the retrofit programmes the milestone needs.
function routeA() {
  const gardens = scenario.neighborhoods.map((n) => [n.id, 'community_garden'] as [string, string])
  const retrofits = scenario.neighborhoods.map((n) => [n.id, 'retrofit_program'] as [string, string])
  return makeAct([...gardens, ...retrofits])
}

// Route B: retrofit-first — the three milestone retrofits up front, the Linden
// Flats garden last, then a security blanket of more gardens.
function routeB() {
  const retrofitFirst = ['old_town', 'station_quarter', 'meadow_rise'].map(
    (id) => [id, 'retrofit_program'] as [string, string],
  )
  const lindenGarden: [string, string] = ['linden_flats', 'community_garden']
  const rest = scenario.neighborhoods
    .filter((n) => n.id !== 'old_town' && n.id !== 'station_quarter' && n.id !== 'meadow_rise')
    .map((n) => [n.id, 'retrofit_program'] as [string, string])
  const moreGardens = scenario.neighborhoods
    .filter((n) => n.id !== 'linden_flats')
    .map((n) => [n.id, 'community_garden'] as [string, string])
  return makeAct([...retrofitFirst, lindenGarden, ...rest, ...moreGardens])
}

function play(act: (state: GameState) => Command | null): GameState {
  let state = initialState(scenario)
  for (let day = 0; day < MAX_DAYS; day++) {
    if (day % 30 === 0) {
      // A few actions at the start of each month, while resources allow.
      for (let attempt = 0; attempt < 6; attempt++) {
        const command = act(state)
        if (command === null) break
        const result = applyCommand(state, command)
        if (!result.ok) break
        state = result.state
      }
    }
    state = tick(state)
    if (state.milestones.includes('first_steps')) return state
  }
  return state
}

describe('Milestone 7 exit test: two playthroughs, one goal', () => {
  it('the food-first route completes "First steps"', () => {
    const state = play(routeA())
    expect(state.milestones).toContain('first_steps')
    expect(state.day).toBeLessThanOrEqual(MAX_DAYS)
  })

  it('the retrofit-first route completes "First steps" too', () => {
    const state = play(routeB())
    expect(state.milestones).toContain('first_steps')
    expect(state.day).toBeLessThanOrEqual(MAX_DAYS)
  })

  it('the two routes really did take different routes', () => {
    // Compare the first few builds of each playthrough.
    const firstBuilds = (act: (s: GameState) => Command | null): string[] => {
      let state = initialState(scenario)
      const builds: string[] = []
      for (let day = 0; day < 120 && builds.length < 6; day++) {
        if (day % 30 !== 0) {
          state = tick(state)
          continue
        }
        const command = act(state)
        if (command !== null && command.type === 'startProject') {
          const result = applyCommand(state, command)
          if (result.ok) {
            builds.push(`${command.neighborhood}:${command.project}`)
            state = result.state
            continue
          }
        }
        state = tick(state)
      }
      return builds
    }
    const a = firstBuilds(routeA())
    const b = firstBuilds(routeB())
    expect(a[0]).toMatch(/community_garden/)
    expect(b[0]).toMatch(/retrofit_program/)
    expect(a).not.toEqual(b)
  })
})