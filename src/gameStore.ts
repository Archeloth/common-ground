import { createGameStore } from './game/store'

// The one game store for the page. Its own module so that the crash screen
// (src/ui/ErrorBoundary.tsx) can still reach the town after the UI has failed:
// "never lose a player's town" (development plan).
export const store = createGameStore()
