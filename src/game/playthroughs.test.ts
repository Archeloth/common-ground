import { afterEach, describe, expect, it } from 'vitest'
import { getScenario, loadScenario, setActiveScenario } from './scenario'
import { loadMilestones } from './milestones'
import { applyCommand, initialState } from './state'
import { tick } from './tick'
import type { Command, GameState } from './types'

const scenario = loadScenario()
const MAX_DAYS = 36 * 30 // the plan's chapter 1 should be reachable within ~3 years

// Two simple, deterministic bot strategies (the plan's "bot playthrough" tool):
// they differ in build order, which is exactly what the Milestone 7 exit test
// wants — "two different playthroughs reach the same goal by different routes".

function makeAct(order: Array<[string, string]>, research: string[] = ['building_retrofits'], busLines: Array<[string, string]> = []) {
  let cursor = 0
  return (state: GameState): Command | null => {
    // Research first whenever it is affordable: projects are gated by it.
    for (const tech of research) {
      const command: Command = { type: 'research', tech }
      if (applyCommand(state, command).ok) return command
    }
    for (const [from, to] of busLines) {
      const command: Command = { type: 'startBusLine', from, to }
      if (applyCommand(state, command).ok) return command
    }
    for (let i = 0; i < order.length; i++) {
      const index = (cursor + i) % order.length
      const [neighborhood, project] = order[index]
      const command: Command = { type: 'startProject', neighborhood, project }
      if (applyCommand(state, command).ok) {
        cursor = index
        return command
      }
    }
    // Volunteers are the scarce resource: spend idle months on town meetings.
    for (const n of loadScenario().neighborhoods) {
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

function play(
  act: (state: GameState) => Command | null,
  goal = 'first_steps',
  maxDays = MAX_DAYS,
  town = scenario,
): GameState {
  let state = initialState(town)
  for (let day = 0; day < maxDays; day++) {
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
    if (state.milestones.includes(goal)) return state
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
        let command = act(state)
        while (command !== null && command.type === 'research') {
          const researched = applyCommand(state, command)
          if (!researched.ok) break
          state = researched.state
          command = act(state)
        }
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

// Milestone 8.5: with safe streets, bus lines and shared mobility in the
// catalog, chapter 2 ("Getting around") is reachable by a mobility-first bot.
describe('chapter 2 is reachable with the new mobility content', () => {
  it('a mobility-first route completes "Getting around"', () => {
    const streets = scenario.neighborhoods.map((n) => [n.id, 'safe_streets'] as [string, string])
    const shares = scenario.neighborhoods.map((n) => [n.id, 'bike_car_share'] as [string, string])
    const gardens = scenario.neighborhoods.map((n) => [n.id, 'community_garden'] as [string, string])
    const retrofits = ['old_town', 'station_quarter', 'linden_flats', 'meadow_rise'].map(
      (id) => [id, 'retrofit_program'] as [string, string],
    )
    const act = makeAct(
      [['linden_flats', 'community_garden'], ...retrofits, ...streets, ...shares, ...gardens],
      ['building_retrofits', 'public_transport', 'shared_mobility', 'community_learning'],
      [
        ['southgate_retail', 'mill_yard'],
        ['maple_heights', 'old_town'],
        ['clay_hill', 'linden_flats'],
      ],
    )
    const state = play(act, 'getting_around', 6 * 12 * 30)
    expect(state.milestones).toContain('first_steps')
    expect(state.milestones).toContain('getting_around')
  })
})

// Milestone 10 exit test: the plumbing works for a second town. A generic bot
// (gardens, meadows and retrofits everywhere, then safe streets and a bus line
// over a footbridge) plays Hollin Green through every chapter.
describe('Hollin Green can be played from start to finish', () => {
  afterEach(() => setActiveScenario('willowbrook'))

  it('a simple bot completes all three chapters', () => {
    setActiveScenario('hollin_green')
    const town = getScenario('hollin_green')
    const each = (project: string) => town.neighborhoods.map((n) => [n.id, project] as [string, string])
    const act = makeAct(
      [
        ['hollin_square', 'community_garden'],
        ['hazel_copse', 'pocket_meadow'],
        ...each('retrofit_program'),
        ...each('safe_streets'),
        ...each('rooftop_solar'),
        ...each('community_garden'),
        ...each('compost_point'),
      ],
      ['building_retrofits', 'public_transport', 'community_learning', 'composting'],
      [['hollin_square', 'brook_meadows']],
    )
    const chapters = loadMilestones('hollin_green')
    const last = chapters[chapters.length - 1].id
    const state = play(act, last, 4 * 12 * 30, town)
    expect(state.milestones).toEqual(expect.arrayContaining(chapters.map((m) => m.id)))
  })
})
