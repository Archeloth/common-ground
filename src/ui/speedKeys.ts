import type { Speed } from '../game/types'

// Keyboard shortcuts for the clock (Milestone 8.6): Space toggles between
// pause and the last running speed; 1, 2 and 3 pick 1x, 2x and 4x. Pure, so
// the mapping is unit-tested; App wires it to keydown.
export function speedForKey(key: string, current: Speed, lastRunning: Speed): Speed | null {
  if (key === ' ' || key === 'Spacebar') return current === 0 ? (lastRunning === 0 ? 1 : lastRunning) : 0
  if (key === '1') return 1
  if (key === '2') return 2
  if (key === '3') return 4
  return null
}

// Typing in a form field must never pause the game or change its speed.
export function isTypingTarget(target: EventTarget | null): boolean {
  if (!(target instanceof HTMLElement)) return false
  const tag = target.tagName
  return tag === 'INPUT' || tag === 'TEXTAREA' || tag === 'SELECT' || target.isContentEditable
}
