import { describe, expect, it, vi } from 'vitest'
import { loadScenario } from './scenario'
import { createGameStore } from './store'
import { initialState } from './state'
import { TICKS_PER_MONTH } from './constants'
import { monthlyIncome, monthlyUpkeep } from './economy'

const scenario = loadScenario()

describe('game store', () => {
  it('starts from the scenario initial state', () => {
    const store = createGameStore()
    expect(store.getState().day).toBe(1)
    expect(store.getState().speed).toBe(0) // starts paused
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
    store.dispatch({ type: 'setSpeed', speed: 1 })
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
    store.dispatch({ type: 'setSpeed', speed: 1 })
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
    for (let i = 0; i < TICKS_PER_MONTH - 1; i++) store.step(250 * (i + 1))
    // The settlement pays what economy.ts says for the state at that moment.
    const before = store.getState()
    const expected = before.budget + monthlyIncome(before, scenario).budget - monthlyUpkeep(before)
    store.step(250 * TICKS_PER_MONTH)
    const state = store.getState()
    expect(state.day).toBe(TICKS_PER_MONTH + 1)
    expect(state.budget).toBe(expected)
  })

  it('getSnapshot returns a stable reference between changes', () => {
    const store = createGameStore()
    const first = store.getSnapshot()
    expect(store.getSnapshot()).toBe(first)
    store.dispatch({ type: 'setSpeed', speed: 2 })
    expect(store.getSnapshot()).not.toBe(first)
  })

  it('replaceState swaps the whole state and notifies (used by the save loader)', () => {
    const store = createGameStore()
    const listener = vi.fn()
    store.subscribe(listener)
    store.replaceState({ ...initialState(loadScenario()), day: 42, speed: 1 })
    expect(store.getState().day).toBe(42)
    expect(listener).toHaveBeenCalledTimes(1)
    // The swap does not disturb the loop clock (1 in-game second still ticks).
    store.step(0)
    store.step(250)
    store.step(500)
    store.step(750)
    store.step(1000)
    expect(store.getState().day).toBe(43)
  })
})
// Regression (Milestone 9 bug report): after switching to another tab and
// back, the clock never resumed and every game stayed on day 1, because hiding
// the tab removed the very listener that should restart the loop.
describe('game store and tab visibility', () => {
  function fakePage() {
    const page = new EventTarget() as EventTarget & { hidden: boolean }
    page.hidden = false
    const frames = new Map<number, (now: number) => void>()
    let nextId = 1
    vi.stubGlobal('document', page)
    vi.stubGlobal('requestAnimationFrame', (cb: (now: number) => void) => {
      frames.set(nextId, cb)
      return nextId++
    })
    vi.stubGlobal('cancelAnimationFrame', (id: number) => frames.delete(id))
    const runFrames = (now: number) => {
      const pending = [...frames.values()]
      frames.clear()
      for (const cb of pending) cb(now)
    }
    const setHidden = (hidden: boolean) => {
      page.hidden = hidden
      page.dispatchEvent(new Event('visibilitychange'))
    }
    return { runFrames, setHidden, pendingFrames: () => frames.size }
  }

  it('resumes ticking when the tab becomes visible again', () => {
    const page = fakePage()
    try {
      const store = createGameStore({ ...initialState(scenario), speed: 1 })
      store.start()
      page.setHidden(true)
      page.setHidden(false)
      // Drive four seconds of frames; the clock must still run.
      for (let t = 0; t <= 4000; t += 250) page.runFrames(t)
      expect(store.getState().day).toBeGreaterThanOrEqual(4)
      store.stop()
    } finally {
      vi.unstubAllGlobals()
    }
  })

  it('stays frozen while hidden, and stop() really stops it', () => {
    const page = fakePage()
    try {
      const store = createGameStore({ ...initialState(scenario), speed: 1 })
      store.start()
      page.setHidden(true)
      expect(page.pendingFrames()).toBe(0) // the loop was halted
      store.stop()
      page.setHidden(false)
      expect(page.pendingFrames()).toBe(0) // a stopped store does not restart
    } finally {
      vi.unstubAllGlobals()
    }
  })
})
