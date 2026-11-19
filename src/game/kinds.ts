import type { NeighborhoodKind } from './types'
import { NEIGHBORHOOD_KINDS } from './types'
import kindsCatalog from '../data/neighborhoods.json'

export interface KindDef {
  id: NeighborhoodKind
  name: string
  description: string
  defaultSlots: number
  // Regions this kind belongs to (Milestone 10): a scenario may only use
  // kinds tagged with its theme, e.g. "temperate".
  regions: string[]
}

function fail(what: string): never {
  throw new Error(`Kinds data error: ${what}`)
}

// The kind catalog is content (data/neighborhoods.json), not code. The union
// type in types.ts is derived from NEIGHBORHOOD_KINDS, so a new kind forces an
// entry here and the tests keep the two sides equal (plan: content is data,
// and a typo fails loudly with the offending id).
// Content is static, so it is parsed and validated once and then shared
// (callers must not mutate the result). Milestone 8.6 review: this used to
// re-validate on every call, from tick(), applyCommand() and each render.
let cachedLoadKinds: KindDef[] | null = null

export function loadKinds(): KindDef[] {
  cachedLoadKinds ??= buildLoadKinds()
  return cachedLoadKinds
}

function buildLoadKinds(): KindDef[] {
  const raw = kindsCatalog as unknown as {
    kinds: Array<{ id: string; name?: string; description?: string; defaultSlots?: number; regions?: string[] }>
  }

  const kinds: KindDef[] = raw.kinds.map((k) => ({
    id: k.id as NeighborhoodKind,
    name: k.name ?? '',
    description: k.description ?? '',
    defaultSlots: k.defaultSlots ?? 0,
    regions: k.regions ?? [],
  }))

  const ids = new Set<string>()
  for (const kind of kinds) {
    if (ids.has(kind.id)) fail(`duplicate kind "${kind.id}"`)
    ids.add(kind.id)
    if (!kind.name.trim()) fail(`kind "${kind.id}" needs a name`)
    if (!kind.description.trim()) fail(`kind "${kind.id}" needs a description`)
    if (!(kind.defaultSlots > 0)) fail(`kind "${kind.id}" needs a positive defaultSlots`)
    if (kind.regions.length === 0 || kind.regions.some((r) => typeof r !== 'string' || !r.trim())) {
      fail(`kind "${kind.id}" needs at least one region`)
    }
  }

  for (const unionId of NEIGHBORHOOD_KINDS) {
    if (!ids.has(unionId)) fail(`catalog is missing kind "${unionId}"`)
  }
  if (ids.size !== NEIGHBORHOOD_KINDS.length) fail('catalog lists kinds that are not in the union')

  return kinds
}

export function kindById(kinds: readonly KindDef[], id: NeighborhoodKind): KindDef {
  const found = kinds.find((k) => k.id === id)
  if (!found) fail(`unknown kind "${id}"`)
  return found
}
