import { describe, expect, it } from 'vitest'
import { loadScenario } from './scenario'
import { applyCommand, initialState } from './state'
import { tick } from './tick'
import type { Command, GameState } from './types'

const scenario = loadScenario()

// The plan's determinism acceptance test (M4 #5): run 1,000 ticks with the same
// seed and command script twice — the states must be identical. No Math.random
// and no Date.now appear anywhere in the simulation, so this holds.
function script(): GameState {
  let state = initialState(scenario)
  let total = 0

  const advance = (ticks: number): void => {
    for (let i = 0; i < ticks; i++) state = tick(state)
    total += ticks
  }
  const commandAt = (command: Command, atTotal: number): void => {
    advance(atTotal - total)
    const result = applyCommand(state, command)
    if (!result.ok) throw new Error(`script command failed: ${result.reason}`)
    state = result.state
  }

  commandAt({ type: 'startProject', neighborhood: 'old_town', project: 'community_garden' }, 10)
  commandAt({ type: 'startProject', neighborhood: 'meadow_rise', project: 'rooftop_solar' }, 250)
  commandAt({ type: 'removeProject', neighborhood: 'old_town', slot: 0 }, 470)
  commandAt({ type: 'setSpeed', speed: 4 }, 600)
  advance(400) // total = 1,000 ticks exactly

  return state
}

describe('determinism (plan M4 exit #5)', () => {
  it('same seed and commands give the same state after 1,000 ticks', () => {
    const a = script()
    const b = script()
    expect(a).toEqual(b)
    expect(JSON.stringify(a)).toBe(JSON.stringify(b))
  })

  it('the state survives a JSON round-trip unchanged (save-ready)', () => {
    const parsed = JSON.parse(JSON.stringify(script())) as GameState
    expect(parsed).toEqual(script())
  })

  it('the script really runs 1,000 ticks and lands in the second month', () => {
    const state = script()
    expect(state.day).toBe(1001)
    expect(state.budget).toBeGreaterThan(15000)
  })
})