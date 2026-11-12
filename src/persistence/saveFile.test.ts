import { describe, expect, it } from 'vitest'
import { loadScenario } from '../game/scenario'
import { applyCommand, initialState } from '../game/state'
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

describe('versioned save files', () => {
  it('round-trips the state exactly (save -> JSON -> load)', () => {
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

  it('rejects JSON that is not a save at all', () => {
    const result = parseAndLoad('{"hello": 1}')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems.length).toBeGreaterThan(0)
  })

  it('rejects broken JSON text', () => {
    const result = parseAndLoad('not json{{{')
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems[0]).toContain('JSON')
  })

  it('rejects a save from a newer build', () => {
    const save = { ...createSave(playedState()), version: CURRENT_SAVE_VERSION + 1 }
    const result = parseAndLoad(JSON.stringify(save))
    expect(result.ok).toBe(false)
    if (!result.ok) expect(result.problems[0]).toContain('newer')
  })

  it('rejects a save with value problems and reports them', () => {
    const save = createSave(playedState())
    save.state.budget = Number.NaN
    const result = parseAndLoad(JSON.stringify(save))
    expect(result.ok).toBe(false)
    if (!result.ok) {
      // NaN is not valid JSON, so it round-trips as null — still rejected.
      expect(result.problems.some((p) => p.includes('budget'))).toBe(true)
    }
  })

  it('validateSave flags a save missing its state', () => {
    const problems = validateSave({
      version: CURRENT_SAVE_VERSION,
      savedAt: '2026-01-01T00:00:00.000Z',
      seed: 1,
    })
    expect(problems.some((p) => p.includes('state'))).toBe(true)
  })

  it('migrates older versions through the table in order', () => {
    const migrations = {
      0: (s: unknown) => ({ ...(s as object), version: 1, fromZero: true }),
      1: (s: unknown) => ({ ...(s as object), version: 2, fromOne: true }),
      2: (s: unknown) => ({ ...(s as object), version: 3, fromTwo: true }),
    }
    const migrated = migrateSave({ version: 0 } as never, migrations)
    expect(migrated.version).toBe(3)
    expect((migrated as unknown as { fromZero: boolean }).fromZero).toBe(true)
    expect((migrated as unknown as { fromOne: boolean }).fromOne).toBe(true)
    expect((migrated as unknown as { fromTwo: boolean }).fromTwo).toBe(true)
  })

  it('rejects a version older than the migration table', () => {
    expect(() => migrateSave({ version: 0 } as never)).toThrow(/no migration/)
  })

  it('the shipped migration table covers the earlier shapes (1 and 2)', () => {
    expect(CURRENT_SAVE_VERSION).toBe(3)
    expect(Object.keys(SAVE_MIGRATIONS).map(Number)).toEqual([1, 2])
  })

  it('migrates a version-1 save to version 2, seeding research from the scenario', () => {
    const original = playedState()
    const v1State = { ...original } as unknown as { [key: string]: unknown }
    delete v1State.research
    delete v1State.milestones
    delete v1State.milestoneNotices
    const v1 = { version: 1, savedAt: '2026-01-01T00:00:00.000Z', seed: 1, state: v1State }

    const result = parseAndLoad(JSON.stringify(v1))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.save.version).toBe(CURRENT_SAVE_VERSION)
      expect(result.save.state.research).toEqual(loadScenario().start.unlockedTech)
      expect(result.save.state.milestones).toEqual([])
      expect(result.save.state.milestoneNotices).toEqual([])
      // Milestone 7 fields arrive too (v2 -> v3 side of the chain).
      expect(result.save.state.engagement.old_town).toBeGreaterThanOrEqual(0)
      expect(result.save.state.busLines).toEqual([])
      expect(result.save.state.messages.old_town).toBe('open')
      // Everything else survives the migration untouched.
      expect(result.save.state.projects).toEqual(original.projects)
      expect(result.save.state.budget).toBe(original.budget)
    }
  })

  it('migrates a version-2 save to version 3, seeding engagement, bus lines and messages', () => {
    const v2 = createSave(playedState()) as unknown as { version: number; state: { [key: string]: unknown } }
    v2.version = 2 // fabricate the pre-M7 shape
    delete v2.state.engagement
    delete v2.state.busLines
    delete v2.state.messages

    const result = parseAndLoad(JSON.stringify(v2))
    expect(result.ok).toBe(true)
    if (result.ok) {
      expect(result.save.version).toBe(CURRENT_SAVE_VERSION)
      expect(result.save.state.busLines).toEqual([])
      expect(result.save.state.messages.old_town).toBe('open')
      expect(result.save.state.engagement.linden_flats).toBeGreaterThanOrEqual(0)
    }
  })
})