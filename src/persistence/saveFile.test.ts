import { describe, expect, it } from 'vitest'
import { loadScenario } from '../game/scenario'
import { applyCommand, initialState } from '../game/state'
import { TUTORIAL_DONE } from '../game/tutorial'
import {
  createSave,
  CURRENT_SAVE_VERSION,
  migrateSave,
  parseAndLoad,
  SAVE_MIGRATIONS,
  validateSave,
} from './saveFile'

const scenario = loadScenario()

function playedState() {
  const result = applyCommand(initialState(scenario), {
    type: 'startProject',
    neighborhood: 'old_town',
    project: 'community_garden',
  })
  if (!result.ok) throw new Error('test setup failed')
  return result.state
}

describe('versioned save files', function () {
  it('round-trips the state exactly (save to JSON and back)', function () {
    const source = playedState()
    const save = createSave(source, Date.parse('2026-11-10T12:00:00Z'))
    const result = parseAndLoad(JSON.stringify(save))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.save.state).toEqual(source)
      expect(result.save.version).toBe(CURRENT_SAVE_VERSION)
      expect(result.save.savedAt).toBe('2026-11-10T12:00:00.000Z')
    }
  })

  it('rejects JSON that is not a save at all', function () {
    const result = parseAndLoad('{"hello": 1}')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems.length).toBeGreaterThan(0)
  })

  it('rejects broken JSON text', function () {
    const result = parseAndLoad('not json{{{')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems[0]).toContain('JSON')
  })

  it('rejects a save from a newer build', function () {
    const save = { ...createSave(playedState()), version: CURRENT_SAVE_VERSION + 1 }
    const result = parseAndLoad(JSON.stringify(save))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems[0]).toContain('newer')
  })

  it('rejects a save with value problems and reports them', function () {
    const save = createSave(playedState())
    save.state.budget = Number.NaN
    const result = parseAndLoad(JSON.stringify(save))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      expect(result.problems.some((p) => p.includes('budget'))).toBe(true)
    }
  })

  it('validateSave flags a save missing its state', function () {
    const problems = validateSave({
      version: CURRENT_SAVE_VERSION,
      savedAt: '2026-01-01T00:00:00.000Z',
      seed: 1,
    })
    expect(problems.some((p) => p.includes('state'))).toBe(true)
  })

  it('migrates older versions through the table in order', function () {
    const migrations = {
      0: function (s: unknown) { return { ...(s as object), version: 1, fromZero: true } },
      1: function (s: unknown) { return { ...(s as object), version: 2, fromOne: true } },
      2: function (s: unknown) { return { ...(s as object), version: 3, fromTwo: true } },
      3: function (s: unknown) { return { ...(s as object), version: 4, fromThree: true } },
      4: function (s: unknown) { return { ...(s as object), version: 5, fromFour: true } },
      5: function (s: unknown) { return { ...(s as object), version: 6, fromFive: true } },
      6: function (s: unknown) { return { ...(s as object), version: 7, fromSix: true } },
      7: function (s: unknown) { return { ...(s as object), version: 8, fromSeven: true } },
    }
    const migrated = migrateSave({ version: 0 } as never, migrations)
    expect(migrated.version).toBe(8)
    expect((migrated as unknown as { fromFour: boolean }).fromFour).toBe(true)
    expect((migrated as unknown as { fromZero: boolean }).fromZero).toBe(true)
    expect((migrated as unknown as { fromOne: boolean }).fromOne).toBe(true)
    expect((migrated as unknown as { fromTwo: boolean }).fromTwo).toBe(true)
    expect((migrated as unknown as { fromThree: boolean }).fromThree).toBe(true)
  })

  it('rejects a version older than the migration table', function () {
    expect(function () { migrateSave({ version: 0 } as never) }).toThrow(/no migration/)
  })

  it('the shipped migration table covers the earlier shapes (1 to 7)', function () {
    expect(CURRENT_SAVE_VERSION).toBe(8)
    expect(Object.keys(SAVE_MIGRATIONS).map(Number)).toEqual([1, 2, 3, 4, 5, 6, 7])
  })

  it('migrates a version-1 save to version 4, seeding research, engagement, messages and the finished tutorial', function () {
    const original = playedState()
    const v1State = { ...original } as unknown as { [key: string]: unknown }
    delete v1State.research
    delete v1State.milestones
    delete v1State.milestoneNotices
    delete v1State.engagement
    delete v1State.busLines
    delete v1State.messages
    delete v1State.tutorialStep
    const v1 = { version: 1, savedAt: '2026-01-01T00:00:00.000Z', seed: 1, state: v1State }

    const result = parseAndLoad(JSON.stringify(v1))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.save.version).toBe(CURRENT_SAVE_VERSION)
      expect(result.save.state.research).toEqual(loadScenario().start.unlockedTech)
      expect(result.save.state.milestones).toEqual([])
      expect(result.save.state.milestoneNotices).toEqual([])
      expect(result.save.state.engagement.old_town).toBeGreaterThanOrEqual(0)
      expect(result.save.state.busLines).toEqual([])
      expect(result.save.state.messages.old_town).toBe('open')
      expect(result.save.state.tutorialStep).toBe(TUTORIAL_DONE)
      expect(result.save.state.projects).toEqual(original.projects)
      expect(result.save.state.budget).toBe(original.budget)
    }
  })

  it('migrates a version-2 save to version 4, seeding engagement, bus lines and messages', function () {
    const v2 = createSave(playedState()) as unknown as { version: number; state: { [key: string]: unknown } }
    v2.version = 2 // fabricate the pre-M7 shape
    delete v2.state.engagement
    delete v2.state.busLines
    delete v2.state.messages
    delete v2.state.tutorialStep

    const result = parseAndLoad(JSON.stringify(v2))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.save.version).toBe(CURRENT_SAVE_VERSION)
      expect(result.save.state.busLines).toEqual([])
      expect(result.save.state.messages.old_town).toBe('open')
      expect(result.save.state.engagement.linden_flats).toBeGreaterThanOrEqual(0)
      expect(result.save.state.tutorialStep).toBe(TUTORIAL_DONE)
    }
  })

  it('migrates a version-3 save to version 4 with the tutorial finished', function () {
    const v3 = createSave(playedState()) as unknown as { version: number; state: { [key: string]: unknown } }
    v3.version = 3 // fabricate the pre-M8 shape
    delete v3.state.tutorialStep

    const result = parseAndLoad(JSON.stringify(v3))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.save.version).toBe(CURRENT_SAVE_VERSION)
      expect(result.save.state.tutorialStep).toBe(TUTORIAL_DONE)
      expect(result.save.state.projects).toEqual(playedState().projects)
    }
  })

  it('migrates a version-4 save to version 5: running volunteer projects get a full lifetime', function () {
    const played = playedState() // a community garden in Old Town
    const v4 = createSave({ ...played, day: 400 }) as unknown as { version: number; state: { [key: string]: unknown } }
    v4.version = 4 // fabricate the pre-M8.5 shape
    delete v4.state.projectExpiry
    delete v4.state.expiryNotices
    delete v4.state.lastMeeting
    delete v4.state.projectReady
    delete v4.state.history

    const result = parseAndLoad(JSON.stringify(v4))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.save.version).toBe(CURRENT_SAVE_VERSION)
      expect(result.save.state.expiryNotices).toEqual([])
      expect(result.save.state.projectExpiry.old_town[0]).toBe(400 + 36 * 30) // garden: 36 months
      expect(result.save.state.projectExpiry.old_town[1]).toBeNull()
      expect(result.save.state.projects).toEqual(played.projects)
    }
  })

  it('migrates a version-5 save to version 6 with no meetings recorded yet', function () {
    const v5 = createSave(playedState()) as unknown as { version: number; state: { [key: string]: unknown } }
    v5.version = 5
    delete v5.state.lastMeeting
    delete v5.state.projectReady
    delete v5.state.history
    const result = parseAndLoad(JSON.stringify(v5))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.save.version).toBe(CURRENT_SAVE_VERSION)
      expect(result.save.state.lastMeeting).toEqual({})
    }
  })

  it('migrates a version-6 save to version 7 with everything already built', function () {
    const v6 = createSave(playedState()) as unknown as { version: number; state: { [key: string]: unknown } }
    v6.version = 6
    delete v6.state.projectReady
    delete v6.state.history
    const result = parseAndLoad(JSON.stringify(v6))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.save.version).toBe(CURRENT_SAVE_VERSION)
      expect(result.save.state.projectReady.old_town.every((d) => d === null)).toBe(true)
    }
  })

  it('migrates a version-7 save to version 8 with an empty history', function () {
    const v7 = createSave(playedState()) as unknown as { version: number; state: { [key: string]: unknown } }
    v7.version = 7
    delete v7.state.history
    const result = parseAndLoad(JSON.stringify(v7))
    expect(result.ok).toBe(true)
    if (result.ok) expect(result.save.state.history).toEqual([])
  })
})
