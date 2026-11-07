import { describe, expect, it } from 'vitest'
import { kindById, loadKinds } from './kinds'
import { loadScenario } from './scenario'
import { NEIGHBORHOOD_KINDS } from './types'

const kinds = loadKinds()

describe('neighborhood kinds catalog', () => {
  it('covers the Kind union exactly (no missing, no extra)', () => {
    const ids = kinds.map((k) => k.id).sort()
    expect(ids).toEqual([...NEIGHBORHOOD_KINDS].sort())
    expect(kinds).toHaveLength(NEIGHBORHOOD_KINDS.length)
  })

  it('every kind has a name, a description and positive default slots', () => {
    for (const kind of kinds) {
      expect(kind.name.trim().length, kind.id).toBeGreaterThan(0)
      expect(kind.description.trim().length, kind.id).toBeGreaterThan(0)
      expect(kind.defaultSlots, kind.id).toBeGreaterThan(0)
    }
  })

  it('resolves every kind in the scenario', () => {
    const scenario = loadScenario()
    for (const n of scenario.neighborhoods) {
      expect(() => kindById(kinds, n.kind), `${n.id} -> ${n.kind}`).not.toThrow()
    }
  })

  it('rejects an unknown kind via kindById', () => {
    expect(() => kindById(kinds, 'moon_colony' as never)).toThrow(/unknown kind/)
  })
})
