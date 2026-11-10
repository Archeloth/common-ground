import type { NeedId, NeighborhoodKind, ProjectDef } from './types'
import { NEIGHBORHOOD_KINDS } from './types'
import projectsCatalog from '../data/projects.json'

function fail(what: string): never {
  throw new Error(`Projects data error: ${what}`)
}

const NEED_IDS: readonly NeedId[] = ['energy', 'food', 'mobility', 'green', 'waste', 'housing']


interface RawProjectEffect {
  need?: string
  change?: number
}

interface RawProject {
  id?: string
  name?: string
  explain?: string
  cost?: number
  time?: number
  engagement?: number
  effects?: RawProjectEffect[]
  allowedKinds?: string[]
}

// The projects catalog is content (data/projects.json), not code. loadProjects
// validates it loudly so a typo fails at startup with the offending id — the
// same pattern as loadScenario/loadKinds (plan: content is data, fail loudly).
export function loadProjects(): ProjectDef[] {
  const raw = projectsCatalog as unknown as { projects?: RawProject[] }
  const projects: ProjectDef[] = (raw.projects ?? []).map((p, index) => ({
    id: p.id ?? `#${index}`,
    name: p.name ?? '',
    explain: p.explain ?? '',
    cost: p.cost ?? 0,
    time: p.time ?? 0,
    engagement: p.engagement ?? 0,
    effects: (p.effects ?? []).map((e) => ({ need: e.need as NeedId, change: e.change ?? 0 })),
    allowedKinds: (p.allowedKinds ?? []) as NeighborhoodKind[],
  }))

  const ids = new Set<string>()
  for (const p of projects) {
    if (ids.has(p.id)) fail(`duplicate project id "${p.id}"`)
    ids.add(p.id)
    if (!p.name.trim()) fail(`project "${p.id}" needs a name`)
    if (!p.explain.trim()) fail(`project "${p.id}" needs an explain text`)
    if (!(Number.isFinite(p.cost) && p.cost > 0)) fail(`project "${p.id}" needs a positive cost`)
    if (!(Number.isInteger(p.time) && p.time > 0)) fail(`project "${p.id}" needs whole months of community time`)
    if (!Number.isFinite(p.engagement)) fail(`project "${p.id}" engagement must be a number`)
    if (p.effects.length === 0) fail(`project "${p.id}" needs at least one effect`)
    for (const e of p.effects) {
      if (!NEED_IDS.includes(e.need)) fail(`project "${p.id}" has an unknown need "${e.need}"`)
      if (!(Number.isFinite(e.change) && e.change !== 0)) {
        fail(`project "${p.id}" effect changes must be non-zero numbers`)
      }
    }
    if (p.allowedKinds.length === 0) fail(`project "${p.id}" needs at least one allowed kind`)
    for (const kind of p.allowedKinds) {
      if (!NEIGHBORHOOD_KINDS.includes(kind)) fail(`project "${p.id}" has an unknown kind "${kind}"`)
    }
  }

  // Plan balance rule: every neighborhood kind keeps at least two project options.
  for (const kind of NEIGHBORHOOD_KINDS) {
    const options = projects.filter((p) => p.allowedKinds.includes(kind)).length
    if (options < 2) fail(`kind "${kind}" has fewer than two project options`)
  }

  if (projects.length === 0) fail('the catalog lists no projects')
  return projects
}

export function projectById(projects: readonly ProjectDef[], id: string): ProjectDef {
  const found = projects.find((p) => p.id === id)
  if (!found) fail(`unknown project "${id}"`)
  return found
}
