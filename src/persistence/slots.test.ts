import { describe, expect, it } from 'vitest'
import { loadScenario } from '../game/scenario'
import { initialState } from '../game/state'
import { createSave } from './saveFile'
import type { SaveDb } from './db'
import { loadSlot, readSlotMeta, saveSlot, SLOT_KEYS } from './slots'

const scenario = loadScenario()

function memoryDb(initial: Record<string, string> = {}): SaveDb {
  const store = { ...initial }
  return {
    read: async (key) => store[key] ?? null,
    write: async (key, json) => {
      store[key] = json
    },
    remove: async (key) => {
      delete store[key]
    },
    keys: async () => Object.keys(store),
    close: () => {},
  }
}

describe('save slots', () => {
  it('lists the autosave slot and three manual slots', () => {
    expect(SLOT_KEYS).toEqual(['auto', 's1', 's2', 's3'])
  })

  it('round-trips a save into a slot', async () => {
    const db = memoryDb()
    const save = createSave(initialState(scenario))
    await saveSlot(db, 's1', save)
    const result = await loadSlot(db, 's1')
    expect(result).toEqual({ save, problems: [] })
  })

  it('overwrites a slot (transactional put)', async () => {
    const db = memoryDb()
    const first = createSave(initialState(scenario), 1000)
    const second = createSave({ ...initialState(scenario), day: 7 }, 2000)
    await saveSlot(db, 's2', first)
    await saveSlot(db, 's2', second)
    const result = await loadSlot(db, 's2')
    expect(result).toEqual({ save: second, problems: [] })
    expect(result.save?.state.day).toBe(7)
  })

  it('an empty slot loads as null with no problems', async () => {
    const result = await loadSlot(memoryDb(), 's1')
    expect(result).toEqual({ save: null, problems: [] })
  })

  it('a corrupt slot loads as null and reports problems instead of throwing', async () => {
    const db = memoryDb({ s3: 'not json at all' })
    const result = await loadSlot(db, 's3')
    expect(result.save).toBeNull()
    expect(result.problems.length).toBeGreaterThan(0)
  })

  it('reads meta (day + savedAt) for the save menu', async () => {
    const db = memoryDb()
    await saveSlot(db, 'auto', createSave({ ...initialState(scenario), day: 14 }, 42))
    const meta = await readSlotMeta(db, 'auto')
    expect(meta?.day).toBe(14)
    expect(meta?.savedAt).toBeTruthy()
    expect(await readSlotMeta(db, 's9')).toBeNull()
  })
})