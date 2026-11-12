import type { GameState } from '../game/types'
import { loadScenario } from '../game/scenario'
import { validateGameState } from '../game/validate'

// The plan's versioned save format (section "Commands and a versioned save
// format"): { version, savedAt, seed, state }. Every load runs through the
// migration table, so a save made by an older build still opens; anything that
// fails validation reports problems instead of crashing. All functions here
// are pure, so the round-trip, migration and corrupt-save tests run in Node.

export const CURRENT_SAVE_VERSION = 3

export interface SaveFile {
  version: number
  savedAt: string // ISO timestamp of when the save was written
  seed: number // reserved for seeded freeplay; today blob shapes live in the scenario
  state: GameState
}

export type Migration = (save: unknown) => unknown
export type SaveMigrations = Record<number, Migration>

// Migrations run in order from the save's version up to CURRENT_SAVE_VERSION.
export const SAVE_MIGRATIONS: SaveMigrations = {
  // 1 -> 2 (Milestone 6): the research tree and chapter milestones joined the
  // GameState. Seed research from the scenario's starting techs; the milestone
  // arrays start empty.
  1: (save) => {
    const s = save as { state: GameState }
    return {
      ...s,
      version: 2,
      state: {
        ...s.state,
        research: [...loadScenario().start.unlockedTech],
        milestones: [],
        milestoneNotices: [],
      },
    }
  },
  // 2 -> 3 (Milestone 7): dynamic engagement, bus lines and resident messages.
  // Engagement and messages seed from the scenario's neighborhoods; bus lines
  // did not exist before, so the town starts with none.
  2: (save) => {
    const s = save as { state: GameState }
    const scenario = loadScenario()
    const engagement: Record<string, number> = {}
    const messages: Record<string, 'open' | 'done'> = {}
    for (const n of scenario.neighborhoods) {
      engagement[n.id] = n.engagement
      messages[n.id] = 'open'
    }
    return {
      ...s,
      version: 3,
      state: { ...s.state, engagement, busLines: [], messages },
    }
  },
}

export function createSave(state: GameState, now: number = Date.now()): SaveFile {
  return {
    version: CURRENT_SAVE_VERSION,
    savedAt: new Date(now).toISOString(),
    seed: 1,
    state,
  }
}

// Apply migrations in order. Throws if the save is not an object, has no
// numeric version, is older than the table knows, or is newer than this build.
export function migrateSave(raw: unknown, migrations: SaveMigrations = SAVE_MIGRATIONS): SaveFile {
  if (raw === null || typeof raw !== 'object') {
    throw new Error('save is not an object')
  }
  const { version } = raw as { version?: unknown }
  if (!Number.isInteger(version)) {
    throw new Error('save has no numeric version field')
  }
  if ((version as number) > CURRENT_SAVE_VERSION) {
    throw new Error(`save version ${String(version)} is newer than this build (${CURRENT_SAVE_VERSION})`)
  }
  let migrated: unknown = raw
  let currentVersion = version as number
  while (currentVersion < CURRENT_SAVE_VERSION) {
    const step = migrations[currentVersion]
    if (!step) {
      throw new Error(`no migration available from save version ${currentVersion}`)
    }
    migrated = step(migrated)
    currentVersion++
  }
  return migrated as SaveFile
}

export type LoadResult = { ok: true; save: SaveFile } | { ok: false; problems: string[] }

// From raw JSON text to a validated SaveFile. Returns problems instead of
// throwing so the UI can show a friendly message and keep the old save.
export function parseAndLoad(json: string): LoadResult {
  try {
    const raw: unknown = JSON.parse(json)
    const migrated = migrateSave(raw)
    const problems = validateSave(migrated)
    if (problems.length > 0) return { ok: false, problems }
    return { ok: true, save: migrated }
  } catch (error) {
    return { ok: false, problems: [error instanceof Error ? error.message : 'unknown parse error'] }
  }
}

export function validateSave(save: unknown): string[] {
  const problems: string[] = []
  if (save === null || typeof save !== 'object') return ['save must be an object']
  const s = save as Record<string, unknown>
  if (!Number.isInteger(s.version) || (s.version as number) < 1) {
    problems.push('save.version must be an integer >= 1')
  }
  if (typeof s.savedAt !== 'string' || Number.isNaN(Date.parse(s.savedAt))) {
    problems.push('save.savedAt must be a valid date string')
  }
  if (typeof s.seed !== 'number' || !Number.isFinite(s.seed)) {
    problems.push('save.seed must be a finite number')
  }
  problems.push(...validateGameState(s.state))
  return problems
}