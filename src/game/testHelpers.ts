import type { GameState } from './types'
import { loadWildlife } from './wildlife'

// Test helper: every species already in the journal, so a test about the
// monthly settlement is not nudged by a +1 Knowledge discovery.
export function withJournalComplete(state: GameState): GameState {
  const wildlife: GameState['wildlife'] = {}
  for (const s of loadWildlife()) wildlife[s.id] = { day: 1, neighborhood: 'hollow_wood' }
  return { ...state, wildlife }
}

// Test helper: finish every project still under construction, so a test can
// say "this project is running" without simulating its build days.
export function finishConstruction(state: GameState): GameState {
  const projectReady: GameState['projectReady'] = {}
  for (const [id, days] of Object.entries(state.projectReady ?? {})) projectReady[id] = days.map(() => null)
  return { ...state, projectReady }
}
