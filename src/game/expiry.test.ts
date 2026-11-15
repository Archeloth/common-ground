import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { applyCommand, initialState } from './state'
import { tick } from './tick'
import { activeProjectIds, countActive, isExpired, isUnderConstruction, projectEndsAt } from './expiry'
import { TICKS_PER_MONTH } from './constants'
import type { CommandResult, GameState } from './types'

const scenario = loadScenario()

function ok(result: CommandResult): GameState {
  if (!result.ok) throw new Error(`refused: ${result.reason}`)
  return result.state
}

// A garden (36 months) and rooftop solar (permanent) in School Green.
function withProjects(): GameState {
  let s = initialState(scenario)
  s = ok(applyCommand(s, { type: 'startProject', neighborhood: 'school_green', project: 'community_garden' }))
  s = ok(applyCommand(s, { type: 'startProject', neighborhood: 'school_green', project: 'rooftop_solar' }))
  return s
}

// The garden builds for 14 days; its 36-month lifetime counts from then.
const GARDEN_ENDS = projectEndsAt(1 + 14, 36)

describe('project lifetimes (Milestone 8.5)', () => {
  it('records an expiry day for volunteer projects and null for infrastructure', () => {
    const s = withProjects()
    expect(s.projectExpiry.school_green[0]).toBe(GARDEN_ENDS)
    expect(s.projectExpiry.school_green[1]).toBeNull()
  })

  it('stops counting an expired project, but keeps its slot', () => {
    const s = { ...withProjects(), day: GARDEN_ENDS }
    expect(isExpired(s, 'school_green', 0)).toBe(true)
    expect(s.projects.school_green[0]).toBe('community_garden')
    expect(activeProjectIds(s, 'school_green')).toEqual(['rooftop_solar'])
    expect(countActive(s, 'community_garden')).toBe(0)
  })

  it('raises one notice on the day the project lapses, and only once', () => {
    let s = { ...withProjects(), day: GARDEN_ENDS - 1 }
    s = tick(s)
    expect(s.expiryNotices).toEqual(['school_green:0'])
    s = tick(tick(s))
    expect(s.expiryNotices).toEqual(['school_green:0'])
  })

  it('drops the lapsed effects: food drifts back toward the base value', () => {
    let running = withProjects()
    for (let i = 0; i < 200; i++) running = tick(running)
    let lapsed = { ...running, day: GARDEN_ENDS }
    for (let i = 0; i < 200; i++) lapsed = tick(lapsed)
    expect(lapsed.neighborhoods.school_green.needs.food).toBeLessThan(running.neighborhoods.school_green.needs.food)
  })

  it('refuses renewal for permanent projects and too early', () => {
    const s = withProjects()
    expect(applyCommand(s, { type: 'renewProject', neighborhood: 'school_green', slot: 1 })).toEqual({
      ok: false,
      reason: 'project_permanent',
    })
    expect(applyCommand(s, { type: 'renewProject', neighborhood: 'school_green', slot: 0 })).toEqual({
      ok: false,
      reason: 'renew_too_early',
    })
    expect(applyCommand(s, { type: 'renewProject', neighborhood: 'school_green', slot: 2 })).toEqual({
      ok: false,
      reason: 'empty_slot',
    })
  })

  it('renews in the last months from the old end day, for Volunteers only', () => {
    const early = { ...withProjects(), day: GARDEN_ENDS - 2 * TICKS_PER_MONTH }
    const renewed = ok(applyCommand(early, { type: 'renewProject', neighborhood: 'school_green', slot: 0 }))
    expect(renewed.projectExpiry.school_green[0]).toBe(projectEndsAt(GARDEN_ENDS, 36))
    expect(renewed.budget).toBe(early.budget)
    expect(renewed.time).toBeLessThan(early.time)
  })

  it('renews a lapsed project from today and clears its notice', () => {
    const lapsedDay = GARDEN_ENDS + 50
    const lapsed = { ...withProjects(), day: lapsedDay, expiryNotices: ['school_green:0'] }
    const renewed = ok(applyCommand(lapsed, { type: 'renewProject', neighborhood: 'school_green', slot: 0 }))
    expect(renewed.projectExpiry.school_green[0]).toBe(projectEndsAt(lapsedDay, 36))
    expect(renewed.expiryNotices).toEqual([])
    expect(activeProjectIds(renewed, 'school_green')).toContain('community_garden')
  })

  it('refuses renewal without enough Volunteers', () => {
    const lapsed = { ...withProjects(), day: GARDEN_ENDS, time: 0 }
    expect(applyCommand(lapsed, { type: 'renewProject', neighborhood: 'school_green', slot: 0 })).toEqual({
      ok: false,
      reason: 'insufficient_time',
    })
  })

  it('clears the expiry day and the notice when the project is removed', () => {
    const lapsed = { ...withProjects(), day: GARDEN_ENDS, expiryNotices: ['school_green:0'] }
    const removed = ok(applyCommand(lapsed, { type: 'removeProject', neighborhood: 'school_green', slot: 0 }))
    expect(removed.projectExpiry.school_green[0]).toBeNull()
    expect(removed.expiryNotices).toEqual([])
  })

  it('dismisses a single notice', () => {
    const s = { ...withProjects(), expiryNotices: ['school_green:0', 'old_town:1'] }
    const after = ok(applyCommand(s, { type: 'dismissExpiryNotice', notice: 'school_green:0' }))
    expect(after.expiryNotices).toEqual(['old_town:1'])
  })

  it('builds before it works: no effects or upkeep until its ready day', () => {
    let s = initialState(scenario)
    s = ok(applyCommand(s, { type: 'startProject', neighborhood: 'school_green', project: 'community_garden' }))
    expect(s.projectReady.school_green[0]).toBe(1 + 14)
    expect(isUnderConstruction(s, 'school_green', 0)).toBe(true)
    expect(activeProjectIds(s, 'school_green')).toEqual([])
    for (let i = 0; i < 13; i++) s = tick(s)
    expect(activeProjectIds(s, 'school_green')).toEqual([])
    s = tick(s) // day 15: finished
    expect(s.projectReady.school_green[0]).toBeNull()
    expect(activeProjectIds(s, 'school_green')).toEqual(['community_garden'])
  })

  it('forgets the ready day when a project is removed mid-build', () => {
    let s = initialState(scenario)
    s = ok(applyCommand(s, { type: 'startProject', neighborhood: 'school_green', project: 'community_garden' }))
    s = ok(applyCommand(s, { type: 'removeProject', neighborhood: 'school_green', slot: 0 }))
    expect(s.projectReady.school_green[0]).toBeNull()
  })
})

describe('renew all (playtest)', () => {
  // Gardens in two districts, both lapsed.
  function twoLapsed(): GameState {
    let s = withProjects()
    s = ok(applyCommand(s, { type: 'startProject', neighborhood: 'old_town', project: 'community_garden' }))
    return { ...s, day: GARDEN_ENDS + 10, time: 50, expiryNotices: ['school_green:0', 'old_town:0'] }
  }

  it('renews every lapsed project and clears the notices', () => {
    const renewed = ok(applyCommand(twoLapsed(), { type: 'renewAll' }))
    expect(isExpired(renewed, 'school_green', 0)).toBe(false)
    expect(isExpired(renewed, 'old_town', 0)).toBe(false)
    expect(renewed.expiryNotices).toEqual([])
  })

  it('renews as many as the volunteers allow', () => {
    const s = twoLapsed()
    const one = ok(applyCommand(s, { type: 'renewProject', neighborhood: 'old_town', slot: 0 }))
    const costOfFirst = s.time - one.time
    const partial = ok(applyCommand({ ...s, time: costOfFirst }, { type: 'renewAll' }))
    const stillLapsed = ['school_green', 'old_town'].filter((id) => isExpired(partial, id, 0))
    expect(stillLapsed).toHaveLength(1)
  })

  it('is refused when nothing has lapsed, or no volunteers are left', () => {
    expect(applyCommand(withProjects(), { type: 'renewAll' })).toEqual({ ok: false, reason: 'nothing_to_renew' })
    expect(applyCommand({ ...twoLapsed(), time: 0 }, { type: 'renewAll' })).toEqual({
      ok: false,
      reason: 'insufficient_time',
    })
  })
})
