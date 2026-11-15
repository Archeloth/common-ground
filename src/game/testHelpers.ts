import type { GameState } from './types'

// Test helper: finish every project still under construction, so a test can
// say "this project is running" without simulating its build days.
export function finishConstruction(state: GameState): GameState {
  const projectReady: GameState['projectReady'] = {}
  for (const [id, days] of Object.entries(state.projectReady ?? {})) projectReady[id] = days.map(() => null)
  return { ...state, projectReady }
}
