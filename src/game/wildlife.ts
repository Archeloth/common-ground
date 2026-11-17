import type { GameState, NeighborhoodKind, ScenarioDef } from './types'
import { NEIGHBORHOOD_KINDS } from './types'
import type { PlaceCondition } from './conditions'
import { allPlaceConditionsMet, placeConditionProblems } from './conditions'
import { loadProjects } from './projects'
import { loadMilestones } from './milestones'
import type { ReadMoreLink } from './readMore'
import { readMoreProblems } from './readMore'
import catalog from '../data/wildlife.json'

// The wildlife journal (post-Milestone 9). Species live in particular kinds
// of district and turn up once that district meets their conditions (a rain
// garden, enough green space, the right season). The first sighting goes in
// the journal, gives WILDLIFE_KNOWLEDGE and queues a notice. Checked once a
// month, at most one new species per month, so finds arrive one at a time.

export const WILDLIFE_KNOWLEDGE = 1

export interface SpeciesDef {
  id: string
  name: string
  where: NeighborhoodKind[]
  conditions: PlaceCondition[]
  hint: string // shown while the species is still undiscovered
  note: string // a short real-world fact
  confidence: string
  readMore: ReadMoreLink[] // Wikipedia articles for further reading
}

export interface Sighting {
  day: number
  neighborhood: string
}

function fail(what: string): never {
  throw new Error(`Wildlife data error: ${what}`)
}

let cached: SpeciesDef[] | null = null

export function loadWildlife(): SpeciesDef[] {
  cached ??= buildWildlife()
  return cached
}

function buildWildlife(): SpeciesDef[] {
  const raw = (catalog as unknown as { species?: Partial<SpeciesDef>[] }).species ?? []
  const species: SpeciesDef[] = raw.map((s, i) => ({
    id: s.id ?? `#${i}`,
    name: s.name ?? '',
    where: s.where ?? [],
    conditions: s.conditions ?? [],
    hint: s.hint ?? '',
    note: s.note ?? '',
    confidence: s.confidence ?? '',
    readMore: s.readMore ?? [],
  }))
  const ids = {
    projects: new Set(loadProjects().map((p) => p.id)),
    species: new Set(species.map((s) => s.id)),
    milestones: new Set(loadMilestones().map((m) => m.id)),
  }
  const seen = new Set<string>()
  for (const s of species) {
    if (seen.has(s.id)) fail(`duplicate species id "${s.id}"`)
    seen.add(s.id)
    if (!s.name.trim() || !s.hint.trim() || !s.note.trim()) fail(`species "${s.id}" needs a name, hint and note`)
    if (!['established', 'emerging', 'contested'].includes(s.confidence)) fail(`species "${s.id}" needs a confidence tag`)
    if (s.where.length === 0) fail(`species "${s.id}" needs at least one district kind`)
    for (const k of s.where) if (!NEIGHBORHOOD_KINDS.includes(k)) fail(`species "${s.id}" lists unknown kind "${k}"`)
    for (const problem of readMoreProblems(s.readMore)) fail(`species "${s.id}": ${problem}`)
    for (const c of s.conditions) {
      for (const problem of placeConditionProblems(c, ids)) fail(`species "${s.id}": ${problem}`)
    }
  }
  if (species.length === 0) fail('the catalog lists no species')
  return species
}

export function speciesById(id: string): SpeciesDef | undefined {
  return loadWildlife().find((s) => s.id === id)
}

// Every district where the species could be seen right now, in scenario
// order. The first one is where a new species is recorded; the map shows
// discovered species wherever they currently live.
export function habitatsFor(state: GameState, scenario: ScenarioDef, species: SpeciesDef): string[] {
  return scenario.neighborhoods
    .filter((n) => species.where.includes(n.kind) && allPlaceConditionsMet(state, scenario, n, species.conditions))
    .map((n) => n.id)
}

// The month's wildlife check: record at most one new species.
export function discoverWildlife(state: GameState, scenario: ScenarioDef): GameState {
  for (const species of loadWildlife()) {
    if (state.wildlife[species.id]) continue
    const where = habitatsFor(state, scenario, species)[0]
    if (!where) continue
    return {
      ...state,
      wildlife: { ...state.wildlife, [species.id]: { day: state.day, neighborhood: where } },
      wildlifeNotices: [...state.wildlifeNotices, species.id],
      knowledge: state.knowledge + WILDLIFE_KNOWLEDGE,
    }
  }
  return state
}
