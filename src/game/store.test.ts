import { describe, expect, it, vi } from 'vitest'
import { loadScenario } from './scenario'
import { createGameStore } from './store'
import { BUDGET_PER_RESIDENT_PER_MONTH, TICKS_PER_MONTH } from './constants'

const scenario = loadScenario()

describe('game store', () => {
  it('starts from the scenario initial state', () => {
    const store = createGameStore()
    expect(store.getState().day).toBe(1)
    expect(store.getState().speed).toBe(1)
    expect(store.getState().budget).toBe(scenario.start.budget)
  })

  it('dispatches commands and notifies subscribers', () => {
    const store = createGameStore()
    const listener = vi.fn()
    store.subscribe(listener)
    const result = store.dispatch({ type: 'setSpeed', speed: 4 })
    expect(result.ok).toBe(true)
    expect(store.getState().speed).toBe(4)
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('does not notify on a refused command', () => {
    const store = createGameStore()
    const listener = vi.fn()
    store.subscribe(listener)
    const result = store.dispatch({
      type: 'startProject',
      neighborhood: 'northfield_farms',
      project: 'rooftop_solar',
    })
    expect(result).toEqual({ ok: false, reason: 'not_allowed_in_kind' })
    expect(listener).not.toHaveBeenCalled()
  })

  it('stops notifying after unsubscribe', () => {
    const store = createGameStore()
    const listener = vi.fn()
    const unsubscribe = store.subscribe(listener)
    store.dispatch({ type: 'setSpeed', speed: 2 })
    expect(listener).toHaveBeenCalledTimes(1)
    unsubscribe()
    store.dispatch({ type: 'setSpeed', speed: 1 })
    expect(listener).toHaveBeenCalledTimes(1)
  })

  it('advances one tick per simulated second at speed 1', () => {
    const store = createGameStore()
    store.step(0) // initialise the clock
    store.step(250)
    store.step(500)
    store.step(750)
    store.step(1000) // 1 second elapsed -> 1 tick
    expect(store.getState().day).toBe(2)
  })

  it('respects the speed multiplier (1s at 4x = 4 ticks)', () => {
    const store = createGameStore()
    store.dispatch({ type: 'setSpeed', speed: 4 })
    store.step(0)
    store.step(250)
    store.step(500)
    store.step(750)
    store.step(1000)
    expect(store.getState().day).toBe(5)
  })

  it('accumulates sub-tick fractions toward the next tick', () => {
    const store = createGameStore()
    store.step(0)
    store.step(250) // 0.25 tick
    store.step(500) // 0.5 tick
    store.step(750) // 0.75 tick
    expect(store.getState().day).toBe(1)
    store.step(1000) // 1.0 tick
    expect(store.getState().day).toBe(2)
  })

  it('freezes while paused (speed 0)', () => {
    const store = createGameStore()
    store.dispatch({ type: 'setSpeed', speed: 0 })
    store.step(0)
    for (let i = 0; i < 40; i++) store.step(250 * (i + 1))
    expect(store.getState().day).toBe(1)
  })

  it('settles budget income monthly through the loop', () => {
    const store = createGameStore()
    store.dispatch({ type: 'setSpeed', speed: 4 })
    store.step(0)
    // At 4x, 250 ms of elapsed time advances one in-game day.
    for (let i = 0; i < TICKS_PER_MONTH; i++) store.step(250 * (i + 1))
    const state = store.getState()
    expect(state.day).toBe(TICKS_PER_MONTH + 1)
    const residents = scenario.neighborhoods.reduce((sum, n) => sum + n.residents, 0)
    expect(state.budget).toBe(scenario.start.budget + Math.round(residents * BUDGET_PER_RESIDENT_PER_MONTH))
  })

  it('getSnapshot returns a stable reference between changes', () => {
    const store = createGameStore()
    const first = store.getSnapshot()
    expect(store.getSnapshot()).toBe(first)
    store.dispatch({ type: 'setSpeed', speed: 2 })
    expect(store.getSnapshot()).not.toBe(first)
  })
})