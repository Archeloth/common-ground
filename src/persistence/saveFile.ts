import type { GameState } from '../game/types'
import { getScenario } from '../game/scenario'
import { validateGameState } from '../game/validate'
import { TUTORIAL_DONE } from '../game/tutorial'
import { loadProjects } from '../game/projects'
import { projectEndsAt } from '../game/expiry'

// The plan's versioned save format (section "Commands and a versioned save
// format"): { version, savedAt, seed, state }. Every load runs through the
// migration table, so a save made by an older build still opens; anything that
// fails validation reports problems instead of crashing. All functions here
// are pure, so the round-trip, migration and corrupt-save tests run in Node.

export const CURRENT_SAVE_VERSION = 10

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
        research: [...getScenario('willowbrook').start.unlockedTech],
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
    const scenario = getScenario('willowbrook') // every save this old is Willowbrook
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
  // 3 -> 4 (Milestone 8): the tutorial joined the state. A migrating save
  // belongs to a player who already knows how to play, so it starts finished
  // (fresh games begin at step 0).
  3: (save) => {
    const s = save as { state: GameState }
    return {
      ...s,
      version: 4,
      state: { ...s.state, tutorialStep: TUTORIAL_DONE },
    }
  },
  // 4 -> 5 (Milestone 8.5): project lifetimes. Volunteer-run projects already
  // running get a full lifetime from the save's current day (the player never
  // saw a countdown before, so nothing lapses on load); infrastructure stays
  // permanent. No expiry notices are pending yet.
  4: (save) => {
    const s = save as { state: GameState }
    const projects = loadProjects()
    const projectExpiry: Record<string, Array<number | null>> = {}
    for (const [id, slots] of Object.entries(s.state.projects ?? {})) {
      projectExpiry[id] = (slots ?? []).map((projectId) => {
        const def = projectId === null ? undefined : projects.find((p) => p.id === projectId)
        return def?.durationMonths === undefined ? null : projectEndsAt(s.state.day, def.durationMonths)
      })
    }
    return {
      ...s,
      version: 5,
      state: { ...s.state, projectExpiry, expiryNotices: [] },
    }
  },
  // 5 -> 6: town meeting cooldowns. No district has a recorded meeting yet.
  5: (save) => {
    const s = save as { state: GameState }
    return { ...s, version: 6, state: { ...s.state, lastMeeting: {} } }
  },
  // 6 -> 7: construction time. Everything in an older town is already built.
  6: (save) => {
    const s = save as { state: GameState }
    const projectReady: Record<string, Array<number | null>> = {}
    for (const [id, slots] of Object.entries(s.state.projects ?? {})) projectReady[id] = (slots ?? []).map(() => null)
    return { ...s, version: 7, state: { ...s.state, projectReady } }
  },
  // 7 -> 8: the town history chart. An older town's story starts now.
  7: (save) => {
    const s = save as { state: GameState }
    return { ...s, version: 8, state: { ...s.state, history: [] } }
  },
  // 8 -> 9: the wildlife journal and citizen stories. They start empty; the
  // next monthly check fills in whatever the town already supports.
  8: (save) => {
    const s = save as { state: GameState }
    return { ...s, version: 9, state: { ...s.state, wildlife: {}, wildlifeNotices: [], stories: {}, storyNotices: [] } }
  },
  // 9 -> 10 (Milestone 10): more than one town. Every older save is Willowbrook.
  9: (save) => {
    const s = save as { state: GameState }
    return { ...s, version: 10, state: { ...s.state, scenarioId: 'willowbrook' } }
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