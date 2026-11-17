import type { GameState, ScenarioDef } from './types'
import type { PlaceCondition } from './conditions'
import { allPlaceConditionsMet, placeConditionProblems } from './conditions'
import { loadProjects } from './projects'
import { loadMilestones } from './milestones'
import { loadWildlife } from './wildlife'
import catalog from '../data/stories.json'

// Citizen stories (post-Milestone 9): a handful of recurring residents whose
// short notes change as their district improves. Each chapter has conditions
// checked against the resident's own district. Once a month at most one new
// chapter arrives, introductions first, so the notes never pile up.

export type Accessory = 'none' | 'cap' | 'hat' | 'helmet' | 'glasses' | 'scarf' | 'apron'

export interface Avatar {
  skin: string
  hair: string
  shirt: string
  accessory: Accessory
}

export interface ChapterDef {
  when: PlaceCondition[]
  text: string
}

export interface ResidentDef {
  id: string
  name: string
  role: string
  neighborhood: string
  avatar: Avatar
  chapters: ChapterDef[]
}

const ACCESSORIES: readonly Accessory[] = ['none', 'cap', 'hat', 'helmet', 'glasses', 'scarf', 'apron']
const COLOUR = /^#[0-9a-f]{6}$/i

function fail(what: string): never {
  throw new Error(`Stories data error: ${what}`)
}

let cached: ResidentDef[] | null = null

export function loadStories(scenario: ScenarioDef): ResidentDef[] {
  cached ??= buildStories(scenario)
  return cached
}

function buildStories(scenario: ScenarioDef): ResidentDef[] {
  const residents = ((catalog as unknown as { residents?: ResidentDef[] }).residents ?? []).map((r) => ({ ...r }))
  const ids = {
    projects: new Set(loadProjects().map((p) => p.id)),
    species: new Set(loadWildlife().map((s) => s.id)),
    milestones: new Set(loadMilestones().map((m) => m.id)),
  }
  const seen = new Set<string>()
  for (const r of residents) {
    if (!r.id || seen.has(r.id)) fail(`missing or duplicate resident id "${r.id}"`)
    seen.add(r.id)
    if (!r.name?.trim() || !r.role?.trim()) fail(`resident "${r.id}" needs a name and role`)
    if (!scenario.neighborhoods.some((n) => n.id === r.neighborhood)) {
      fail(`resident "${r.id}" lives in unknown district "${r.neighborhood}"`)
    }
    const a = r.avatar
    if (!a || ![a.skin, a.hair, a.shirt].every((c) => COLOUR.test(c)) || !ACCESSORIES.includes(a.accessory)) {
      fail(`resident "${r.id}" needs an avatar with three #rrggbb colours and a known accessory`)
    }
    if (!Array.isArray(r.chapters) || r.chapters.length === 0) fail(`resident "${r.id}" needs chapters`)
    r.chapters.forEach((ch, i) => {
      if (!ch.text?.trim()) fail(`resident "${r.id}" chapter ${i + 1} needs text`)
      if (!Array.isArray(ch.when) || ch.when.length === 0) fail(`resident "${r.id}" chapter ${i + 1} needs conditions`)
      for (const c of ch.when) for (const p of placeConditionProblems(c, ids)) fail(`resident "${r.id}" chapter ${i + 1}: ${p}`)
    })
  }
  if (residents.length === 0) fail('the catalog lists no residents')
  return residents
}

export function residentById(scenario: ScenarioDef, id: string): ResidentDef | undefined {
  return loadStories(scenario).find((r) => r.id === id)
}

// "resident:chapterIndex" (0-based) keys in storyNotices.
export function storyNoticeKey(resident: string, chapter: number): string {
  return `${resident}:${chapter}`
}

export function parseStoryNoticeKey(key: string): { resident: string; chapter: number } | null {
  const match = /^([a-z0-9_]+):(\d+)$/.exec(key)
  return match ? { resident: match[1], chapter: Number(match[2]) } : null
}

// The month's story check: reveal at most one chapter. Among the residents
// whose next chapter is ready, the one with the fewest chapters so far goes
// first (introductions before follow-ups), then catalog order.
export function advanceStories(state: GameState, scenario: ScenarioDef): GameState {
  let best: { resident: ResidentDef; reached: number } | null = null
  for (const resident of loadStories(scenario)) {
    const reached = state.stories[resident.id] ?? 0
    const next = resident.chapters[reached]
    if (!next) continue
    const home = scenario.neighborhoods.find((n) => n.id === resident.neighborhood)
    if (!home || !allPlaceConditionsMet(state, scenario, home, next.when)) continue
    if (!best || reached < best.reached) best = { resident, reached }
  }
  if (!best) return state
  return {
    ...state,
    stories: { ...state.stories, [best.resident.id]: best.reached + 1 },
    storyNotices: [...state.storyNotices, storyNoticeKey(best.resident.id, best.reached)],
  }
}
