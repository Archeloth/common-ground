import technologiesCatalog from '../data/technologies.json'
import type { ReadMoreLink } from './readMore'
import { readMoreProblems } from './readMore'

// The research tree (Milestone 6), content-driven like projects and kinds.
// The 8 entries are the plan's three starting chains:
//   energy audits -> retrofits -> heat pumps
//   community gardens -> composting -> local food hubs
//   safe streets -> public transport
// Every card carries an honest "limit" and a confidence tag per the plan's
// content pipeline. sources[] is the plan's "every claim carries a source"
// rule — these are first-draft entries written from general knowledge, so they
// start empty and must be filled before release (see DECISIONS.md).

export type TechBranch = 'energy' | 'food' | 'mobility' | 'circular' | 'ecology' | 'community'
export type Confidence = 'established' | 'emerging' | 'context'

export interface TechSource {
  title: string
  url?: string
  checked?: string // ISO date the claim was last checked
}

export interface TechDef {
  id: string
  name: string
  branch: TechBranch
  cost: number // Knowledge points
  prerequisites: string[] // tech ids that must be researched first
  unlocks: string[] // tech ids unlocked by this one
  benefit: string // what it does in the game ("In the game")
  limit: string // honest real-world trade-off
  confidence: Confidence
  sources: TechSource[]
  readMore: ReadMoreLink[] // Wikipedia articles for further reading
}

const BRANCHES: readonly TechBranch[] = ['energy', 'food', 'mobility', 'circular', 'ecology', 'community']
const CONFIDENCES: readonly Confidence[] = ['established', 'emerging', 'context']

function fail(what: string): never {
  throw new Error(`Technologies data error: ${what}`)
}

interface RawTech {
  id?: string
  name?: string
  branch?: string
  cost?: number
  prerequisites?: string[]
  unlocks?: string[]
  benefit?: string
  limit?: string
  confidence?: string
  sources?: Array<{ title?: string }>
  readMore?: ReadMoreLink[]
}

// Content is static, so it is parsed and validated once and then shared
// (callers must not mutate the result). Milestone 8.6 review: this used to
// re-validate on every call, from tick(), applyCommand() and each render.
let cachedLoadTechnologies: TechDef[] | null = null

export function loadTechnologies(): TechDef[] {
  cachedLoadTechnologies ??= buildLoadTechnologies()
  return cachedLoadTechnologies
}

function buildLoadTechnologies(): TechDef[] {
  const raw = technologiesCatalog as unknown as { technologies?: RawTech[] }
  const techs: TechDef[] = (raw.technologies ?? []).map((t, index) => ({
    id: t.id ?? `#${index}`,
    name: t.name ?? '',
    branch: (t.branch ?? '') as TechBranch,
    cost: t.cost ?? 0,
    prerequisites: t.prerequisites ?? [],
    unlocks: t.unlocks ?? [],
    benefit: t.benefit ?? '',
    limit: t.limit ?? '',
    confidence: (t.confidence ?? '') as Confidence,
    sources: (t.sources ?? []).map((s) => ({ title: s.title ?? '' })),
    readMore: t.readMore ?? [],
  }))

  const ids = new Set<string>()
  for (const tech of techs) {
    if (ids.has(tech.id)) fail(`duplicate technology id "${tech.id}"`)
    ids.add(tech.id)
    if (!tech.name.trim()) fail(`technology "${tech.id}" needs a name`)
    if (!tech.benefit.trim() || !tech.limit.trim()) {
      fail(`technology "${tech.id}" needs benefit and limit texts`)
    }
    if (!Number.isInteger(tech.cost) || tech.cost < 0) {
      fail(`technology "${tech.id}" cost must be a non-negative integer`)
    }
    if (!BRANCHES.includes(tech.branch)) fail(`technology "${tech.id}" has an unknown branch "${tech.branch}"`)
    if (!CONFIDENCES.includes(tech.confidence)) {
      fail(`technology "${tech.id}" has an unknown confidence "${tech.confidence}"`)
    }
  }

  // Two passes so prerequisites/unlocks can reference ids defined anywhere.
  for (const tech of techs) {
    for (const id of [...tech.prerequisites, ...tech.unlocks]) {
      if (!ids.has(id)) fail(`technology "${tech.id}" references unknown technology "${id}"`)
    }
    if (tech.prerequisites.includes(tech.id) || tech.unlocks.includes(tech.id)) {
      fail(`technology "${tech.id}" cannot require or unlock itself`)
    }
    for (const source of tech.sources) {
      if (!source.title.trim()) fail(`technology "${tech.id}" has a source without a title`)
    }
    for (const problem of readMoreProblems(tech.readMore)) fail(`technology "${tech.id}": ${problem}`)
  }

  // No cycles: follow unlocks from every node; revisiting a node on the same
  // path means a cycle (the plan's chains must stay a DAG).
  for (const tech of techs) {
    const visiting = new Set<string>()
    const visit = (id: string): void => {
      if (visiting.has(id)) fail(`unlock chain is cyclic at "${id}"`)
      visiting.add(id)
      const node = techs.find((t) => t.id === id)
      for (const next of node?.unlocks ?? []) visit(next)
      visiting.delete(id)
    }
    visit(tech.id)
  }

  if (techs.length === 0) fail('the catalog lists no technologies')
  return techs
}

export function technologyById(techs: readonly TechDef[], id: string): TechDef {
  const found = techs.find((t) => t.id === id)
  if (!found) fail(`unknown technology "${id}"`)
  return found
}