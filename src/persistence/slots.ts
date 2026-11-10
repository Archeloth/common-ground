import type { SaveDb } from './db'
import type { SaveFile } from './saveFile'
import { parseAndLoad } from './saveFile'

// The four save slots: one autosave (overwritten automatically) and the three
// manual slots the player uses. The autosave slot is kept separate so an
// automatic save never clobbers a manual one.

export const SLOT_KEYS = ['auto', 's1', 's2', 's3'] as const
export type SlotKey = (typeof SLOT_KEYS)[number]

export interface SlotMeta {
  day: number
  savedAt: string
}

export interface SlotLoadResult {
  save: SaveFile | null
  problems: string[] // non-empty only when the slot held a broken save
}

export async function saveSlot(db: SaveDb, key: string, save: SaveFile): Promise<void> {
  await db.write(key, JSON.stringify(save))
}

export async function loadSlot(db: SaveDb, key: string): Promise<SlotLoadResult> {
  const json = await db.read(key)
  if (json === null) return { save: null, problems: [] }
  const result = parseAndLoad(json)
  return result.ok ? { save: result.save, problems: [] } : { save: null, problems: result.problems }
}

export async function readSlotMeta(db: SaveDb, key: string): Promise<SlotMeta | null> {
  const { save } = await loadSlot(db, key)
  return save ? { day: save.state.day, savedAt: save.savedAt } : null
}