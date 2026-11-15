import type { Command, CommandResult, GameState } from './types'
import { loadScenario } from './scenario'
import { applyCommand, initialState } from './state'
import { tick } from './tick'
import { MAX_TICKS_PER_FRAME, TICK_MS } from './constants'

// The tiny store the plan's tech table asks for ("a plain TypeScript state
// object owned by the simulation, exposed to React with useSyncExternalStore").
// This file deliberately has no React import — the hook wrapper lives in
// src/ui/useGame.ts, so the boundary rule (src/game imports nothing from UI,
// and nothing from React) stays intact, and the store is testable in Node.
//
// The fixed-timestep loop is exactly the plan's pattern:
//   acc += dt * speed (speed 0, 1, 2, 4);  while acc >= TICK_MS: state = tick(state).
// Listeners are notified only when a tick or command actually changed the
// state, not on every animation frame; the canvas has its own rAF loop.

const MAX_DELTA_MS = 250 // clamp after the tab was hidden (plan performance note)

export interface GameStore {
  getState(): GameState
  getSnapshot(): GameState // stable reference between changes (useSyncExternalStore)
  subscribe(listener: () => void): () => void
  dispatch(command: Command): CommandResult
  // Swap the whole state (used by the save-loader bootstrap only, never by
  // gameplay — playing goes through dispatch). Notifies subscribers.
  replaceState(state: GameState): void
  start(): void
  stop(): void
  // Advance the simulation clock by the elapsed milliseconds since the last
  // step. Called by the rAF loop; exposed so tests can drive time directly.
  step(now: number): void
}

export function createGameStore(initial?: GameState): GameStore {
  let current = initial ?? initialState(loadScenario())
  const listeners = new Set<() => void>()
  let acc = 0
  let last = -1 // ms of the previous step; < 0 means "clock not started yet"
  let rafId: number | null = null
  let running = false

  function notify(): void {
    for (const listener of listeners) listener()
  }

  function step(now: number): void {
    if (last < 0) {
      // First call initialises the clock without advancing the world.
      last = now
      return
    }
    const dt = Math.min(now - last, MAX_DELTA_MS)
    last = now
    if (current.speed > 0) acc += dt * current.speed
    let ticks = 0
    while (acc >= TICK_MS && ticks < MAX_TICKS_PER_FRAME) {
      current = tick(current)
      acc -= TICK_MS
      ticks++
    }
    if (ticks > 0) notify()
  }

  function dispatch(command: Command): CommandResult {
    const result = applyCommand(current, command)
    if (result.ok) {
      current = result.state
      notify()
    }
    return result
  }

  function replaceState(state: GameState): void {
    current = state
    notify()
  }

  function subscribe(listener: () => void): () => void {
    listeners.add(listener)
    return () => {
      listeners.delete(listener)
    }
  }

  function frame(now: number): void {
    step(now)
    if (running) rafId = requestAnimationFrame(frame)
  }

  // Two separate lifetimes:
  // - `started`: the owner called start() and has not called stop(). The
  //   visibility listener lives exactly this long.
  // - `running`: the animation-frame loop is ticking right now. A hidden tab
  //   halts it (plan performance section: a background tab uses nothing) and
  //   showing the tab again resumes it.
  // They used to be one: hiding the tab called stop(), which also removed the
  // listener, so after the first tab switch the clock never came back and
  // every game stayed on day 1 (Milestone 9 bug report).
  let started = false

  function runLoop(): void {
    if (running || typeof requestAnimationFrame === 'undefined') return
    running = true
    last = -1 // the first frame after a pause only re-initialises the clock
    rafId = requestAnimationFrame(frame)
  }

  function haltLoop(): void {
    running = false
    if (typeof cancelAnimationFrame !== 'undefined' && rafId !== null) {
      cancelAnimationFrame(rafId)
    }
    rafId = null
  }

  function onVisibilityChange(): void {
    if (typeof document !== 'undefined' && document.hidden) haltLoop()
    else if (started) runLoop()
  }

  function start(): void {
    if (started) return
    started = true
    if (typeof document !== 'undefined') {
      document.addEventListener('visibilitychange', onVisibilityChange)
    }
    runLoop()
  }

  function stop(): void {
    started = false
    haltLoop()
    if (typeof document !== 'undefined') {
      document.removeEventListener('visibilitychange', onVisibilityChange)
    }
  }

  return {
    getState: () => current,
    getSnapshot: () => current,
    subscribe,
    dispatch,
    replaceState,
    start,
    stop,
    step,
  }
}