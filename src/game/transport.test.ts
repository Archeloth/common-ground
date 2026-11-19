import { describe, expect, it } from 'vitest'
import { getScenario, validateScenario } from './scenario'
import { TRANSPORT_MODES, transportOf } from './transport'
import { regionContentProblems } from './regionContent'
import type { ScenarioDef } from './types'

// Milestone 10: each town names how its districts are linked. Fixtures are
// clones of Willowbrook passed straight to the pure checks.

const willowbrook = getScenario('willowbrook')

describe('transport per town', () => {
  it('defaults to buses unlocked by public transport', () => {
    expect(transportOf(willowbrook)).toEqual({ mode: 'bus', requiresTech: 'public_transport' })
  })

  it('takes the mode and research a town names', () => {
    const town: ScenarioDef = { ...structuredClone(willowbrook), transport: { mode: 'boat', requiresTech: 'shared_mobility' } }
    expect(transportOf(town)).toEqual({ mode: 'boat', requiresTech: 'shared_mobility' })
    expect(regionContentProblems(town)).toEqual([])
  })

  it('refuses an unknown mode', () => {
    const town = { ...structuredClone(willowbrook), transport: { mode: 'tram' } } as unknown as ScenarioDef
    expect(() => validateScenario(town)).toThrow(/unknown transport mode "tram"/)
  })

  it('refuses transport research the town cannot do', () => {
    const town: ScenarioDef = { ...structuredClone(willowbrook), research: { exclude: ['public_transport'] } }
    expect(regionContentProblems(town).join(' ')).toMatch(/transport needs "public_transport"/)
  })

  it('lists three modes', () => {
    expect([...TRANSPORT_MODES]).toEqual(['bus', 'minibus', 'boat'])
  })
})
