import { useEffect } from 'react'

// Escape closes a popover (only the topmost layer: it handles the key in the
// capture phase and marks it, so the panel underneath stays open).
//
// Milestone 8.5 also closed drawers on any click outside them; playtesting
// found that annoying (you could not pan the map with the Town overview open),
// so drawers now close only with their button, their x, or Escape.
export function useEscapeToClose(active: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!active) return
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault() // closes only this layer, not the panel below
      onClose()
    }
    window.addEventListener('keydown', onKeyDown, true)
    return () => window.removeEventListener('keydown', onKeyDown, true)
  }, [active, onClose])
}
