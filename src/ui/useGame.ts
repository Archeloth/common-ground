import { useSyncExternalStore } from 'react'
import type { GameStore } from '../game/store'

// Subscribe a component to the game store (the plan's tech table: "exposed to
// React with useSyncExternalStore"). Lives in src/ui so src/game stays free of
// React imports (the boundary rule).
export function useGame(store: GameStore): ReturnType<GameStore['getSnapshot']> {
  return useSyncExternalStore(store.subscribe, store.getSnapshot, store.getSnapshot)
}