import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { applyCommand, initialState } from './state'
import { tick } from './tick'
import { loadMilestones } from './milestones'
import {
  BUDGET_PER_RESIDENT_PER_MONTH,
  COMMUNITY_TIME_BASE_PER_MONTH,
  COMMUNITY_TIME_ENGAGEMENT_FACTOR,
  TICKS_PER_MONTH,
} from './constants'
import type { Command, GameState } from './types'

const scenario = loadScenario()

function startGarden(neighborhood: string): Command {
  return { type: 'startProject', neighborhood, project: 'community_garden' }
}

function runTicks(state: GameState, count: number): GameState {
  let s = state
  for (let i = 0; i < count; i++) s = tick(s)
  return s
}

describe('tick', () => {
  it('advances the day and never mutates its input', () => {
    const s = initialState(scenario)
    const snapshot = structuredClone(s)
    const next = tick(s)
    expect(next.day).toBe(2)
    expect(s.day).toBe(1)
    expect(s).toEqual(snapshot)
  })

  it('runs the monthly settlement on every 30th day: budget income + community time', () => {
    const s = initialState(scenario)
    const residents = scenario.neighborhoods.reduce((sum, n) => sum + n.residents, 0)
    const avgEngagement =
      scenario.neighborhoods.reduce((sum, n) => sum + n.engagement, 0) / scenario.neighborhoods.length
    const income = Math.round(residents * BUDGET_PER_RESIDENT_PER_MONTH)
    const regen = COMMUNITY_TIME_BASE_PER_MONTH + Math.round((avgEngagement / 100) * COMMUNITY_TIME_ENGAGEMENT_FACTOR)

    // The plan: 30 ticks = one month; nothing moves before the 30th day.
    const justBefore = runTicks(s, TICKS_PER_MONTH - 1)
    expect(justBefore.day).toBe(TICKS_PER_MONTH)
    expect(justBefore.budget).toBe(s.budget)
    expect(justBefore.time).toBe(s.time)

    const afterMonth = runTicks(s, TICKS_PER_MONTH)
    expect(afterMonth.day).toBe(TICKS_PER_MONTH + 1)
    expect(afterMonth.budget).toBe(s.budget + income)
    expect(afterMonth.time).toBe(s.time + regen)

    const afterTwoMonths = runTicks(s, 2 * TICKS_PER_MONTH)
    expect(afterTwoMonths.budget).toBe(s.budget + 2 * income)
  })

  it('moves needs toward the project-effect target, monotonically and bounded', () => {
    const started = applyCommand(initialState(scenario), startGarden('old_town'))
    expect(started.ok).toBe(true)
    if (!started.ok) return
    const baseFood = started.state.neighborhoods.old_town.needs.food // 0.75
    const t1 = runTicks(started.state, 50).neighborhoods.old_town.needs.food
    const t2 = runTicks(started.state, 100).neighborhoods.old_town.needs.food
    expect(t1).toBeGreaterThan(baseFood)
    expect(t2).toBeGreaterThanOrEqual(t1)
    // Target = 0.75 + 0.12 (community garden) = 0.87; coverage never overshoots.
    expect(t2).toBeLessThanOrEqual(0.87)
    for (const value of Object.values(runTicks(started.state, 50).neighborhoods.old_town.needs)) {
      expect(value).toBeGreaterThanOrEqual(0)
      expect(value).toBeLessThanOrEqual(1)
    }
  })

  it('lets needs fall back to their base level after a project is removed', () => {
    const s = initialState(scenario)
    const started = applyCommand(s, startGarden('old_town'))
    if (!started.ok) return
    const grown = runTicks(started.state, 60).neighborhoods.old_town.needs.food
    expect(grown).toBeGreaterThan(0.75)

    const removed = applyCommand(runTicks(started.state, 60), {
      type: 'removeProject',
      neighborhood: 'old_town',
      slot: 0,
    })
    if (!removed.ok) return
    const fallen = runTicks(removed.state, 60).neighborhoods.old_town.needs.food
    expect(fallen).toBeLessThan(grown)
    expect(fallen).toBeGreaterThanOrEqual(0.75)
  })

  it('moves the displayed satisfaction 5% of the way to the target each tick', () => {
    const s = initialState(scenario)
    // Force a large lag between the displayed value and the weighted target.
    const lagged: GameState = {
      ...s,
      neighborhoods: {
        ...s.neighborhoods,
        old_town: { ...s.neighborhoods.old_town, satisfaction: 20 },
      },
    }
    const target = s.neighborhoods.old_town.satisfaction // ~59 from the weighted formula
    const after = tick(lagged).neighborhoods.old_town.satisfaction
    // 20 + (59 - 20) * 0.05 = 21.95, rounded to 1 decimal => ~22.0
    expect(after).toBeGreaterThan(21.5)
    expect(after).toBeLessThan(22.5)
    // Converges toward the target without overshooting it.
    const converged = runTicks(lagged, 100).neighborhoods.old_town.satisfaction
    expect(converged).toBeLessThan(target + 1)
    expect(converged).toBeGreaterThan(target - 10)
  })

  it('starting a garden changes the reasons list the panel shows (exit test)', () => {
    const s = initialState(scenario)
    // Hollow Wood's food is a top-3 shortfall, so a food project should move it.
    const before = s.neighborhoods.hollow_wood.reasons.map((r) => r.need)
    expect(before).toEqual(['mobility', 'food', 'housing'])

    const started = applyCommand(s, startGarden('hollow_wood'))
    expect(started.ok).toBe(true)
    if (!started.ok) return

    const after = runTicks(started.state, 40)
    const reasonNeeds = after.neighborhoods.hollow_wood.reasons.map((r) => r.need)
    const foodCoverage = after.neighborhoods.hollow_wood.needs.food
    expect(foodCoverage).toBeGreaterThan(s.neighborhoods.hollow_wood.needs.food)
    expect(reasonNeeds).not.toEqual(before) // the order of the shortfalls changed
    // And the top-3 is still meaningful data (coverage ascending = gap descending).
    for (let i = 1; i < reasonNeeds.length; i++) {
      const a = after.neighborhoods.hollow_wood.reasons[i - 1].coverage
      const b = after.neighborhoods.hollow_wood.reasons[i].coverage
      expect(a).toBeLessThanOrEqual(b)
    }
  })

  it('does not complete any milestone in a fresh town', () => {
    const s = runTicks(initialState(scenario), 5)
    expect(s.milestones).toEqual([])
    expect(s.milestoneNotices).toEqual([])
  })

  it('completes the first milestone once: notices and pays knowledge exactly once', () => {
    const first = loadMilestones()[0]
    let state = initialState(scenario)
    const start = (command: Command) => {
      const result = applyCommand(state, command)
      if (result.ok) state = result.state
    }
    start({ type: 'startProject', neighborhood: 'linden_flats', project: 'community_garden' })
    for (const id of ['old_town', 'station_quarter', 'meadow_rise']) {
      start({ type: 'startProject', neighborhood: id, project: 'retrofit_program' })
    }
    // Push displayed satisfaction over the goal; tick smooths it but it stays.
    // Messages are all marked done so they don't muddy the milestone rewards.
    const boosted = {
      ...state,
      neighborhoods: Object.fromEntries(
        scenario.neighborhoods.map((n) => [
          n.id,
          { ...state.neighborhoods[n.id], satisfaction: 70 },
        ]),
      ),
      messages: Object.fromEntries(scenario.neighborhoods.map((n) => [n.id, 'done'])) as GameState['messages'],
    }

    const after = tick(boosted)
    expect(after.milestones).toContain('first_steps')
    expect(after.milestoneNotices).toEqual(['first_steps'])
    expect(after.knowledge).toBe(boosted.knowledge + first.reward.knowledge)

    // Idempotent: no double-completion, and the notice stays until dismissed.
    const again = tick(after)
    expect(again.milestones).toEqual(after.milestones)
    expect(again.milestoneNotices).toEqual(['first_steps'])
    expect(again.knowledge).toBe(after.knowledge)
  })

  it('shares food surplus to adjacent neighborhoods at 70% efficiency', () => {
    let state = initialState(scenario)
    const result = applyCommand(state, {
      type: 'startProject',
      neighborhood: 'northfield_farms', // food 0.95 + garden 0.12 -> surplus 0.07
      project: 'community_garden',
    })
    expect(result.ok).toBe(true)
    if (!result.ok) return
    state = result.state

    const grown = runTicks(state, 60)
    const weirBend = grown.neighborhoods.weir_bend.needs.food
    expect(weirBend).toBeGreaterThan(0.72) // lifted by imported surplus
    expect(weirBend).toBeLessThanOrEqual(0.75)
    // The sharer keeps its own full food coverage (only surplus flows out).
    expect(grown.neighborhoods.northfield_farms.needs.food).toBeGreaterThanOrEqual(0.95)
  })

  it('a bus line adds mobility coverage to both linked neighborhoods', () => {
    let state = initialState(scenario)
    const research = applyCommand(state, { type: 'research', tech: 'public_transport' })
    if (!research.ok) throw new Error('research failed')
    state = research.state
    const line = applyCommand(state, { type: 'startBusLine', from: 'old_town', to: 'riverside' })
    if (!line.ok) throw new Error(`bus line failed: ${line.reason}`)
    state = line.state

    const grown = runTicks(state, 60)
    expect(grown.neighborhoods.old_town.needs.mobility).toBeGreaterThan(0.45 + 0.1)
    expect(grown.neighborhoods.riverside.needs.mobility).toBeGreaterThan(0.55 + 0.1)
  })

  it('running gardens raise engagement by +5 each month, capped at 100', () => {
    const started = applyCommand(initialState(scenario), {
      type: 'startProject',
      neighborhood: 'old_town',
      project: 'community_garden',
    })
    expect(started.ok).toBe(true)
    if (!started.ok) return
    const afterMonth = runTicks(started.state, 30)
    expect(afterMonth.engagement.old_town).toBe(50 + 5)

    const hot = { ...started.state, engagement: { ...started.state.engagement, old_town: 99 } }
    expect(runTicks(hot, 30).engagement.old_town).toBe(100)
  })

  it('fulfils a resident message once and pays its reward exactly once', () => {
    let state = initialState(scenario)
    const started = applyCommand(state, {
      type: 'startProject',
      neighborhood: 'old_town',
      project: 'retrofit_program',
    })
    if (!started.ok) return
    state = started.state
    expect(state.messages.old_town).toBe('open')

    const after = tick(state)
    expect(after.messages.old_town).toBe('done')
    expect(after.knowledge).toBe(state.knowledge + 5) // old_town message reward

    const again = tick(after)
    expect(again.knowledge).toBe(after.knowledge) // no double payments
    expect(again.messages.old_town).toBe('done')
  })
})

describe('tutorial auto-advance (Milestone 8)', function () {
  it('keeps the intro step until the player taps Continue', function () {
    const s = initialState(scenario)
    expect(tick(s).tutorialStep).toBe(0)
    const started = applyCommand(s, startGarden('school_green'))
    if (!started.ok) throw new Error('garden refused')
    expect(tick(started.state).tutorialStep).toBe(0) // the intro step still blocks
  })

  it('completes the garden step once the player continues and a garden runs', function () {
    let state = initialState(scenario)
    const cont = applyCommand(state, { type: 'tutorialNext' })
    if (!cont.ok) throw new Error('tutorialNext refused')
    state = cont.state
    const garden = applyCommand(state, startGarden('school_green'))
    if (!garden.ok) throw new Error('garden refused')
    state = tick(garden.state)
    expect(state.tutorialStep).toBe(2) // garden done, watch step active
  })
})