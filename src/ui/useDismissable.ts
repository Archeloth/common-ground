import { useEffect } from 'react'
import type { RefObject } from 'react'

// Close a popover when the pointer goes down outside it, or on Escape
// (Milestone 8.5 playtest feedback: "click away from save and research panel
// should close the panel"). `active` lets the caller attach the listeners only
// while the popover is open.
export function useDismissable(ref: RefObject<HTMLElement | null>, active: boolean, onClose: () => void): void {
  useEffect(() => {
    if (!active) return
    const onPointerDown = (event: PointerEvent) => {
      const root = ref.current
      if (root && event.target instanceof Node && !root.contains(event.target)) onClose()
    }
    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key !== 'Escape' || event.defaultPrevented) return
      event.preventDefault() // closes only this layer, not the panel below
      onClose()
    }
    // Capture phase, so a click that starts a canvas drag still closes it.
    document.addEventListener('pointerdown', onPointerDown, true)
    window.addEventListener('keydown', onKeyDown, true)
    return () => {
      document.removeEventListener('pointerdown', onPointerDown, true)
      window.removeEventListener('keydown', onKeyDown, true)
    }
  }, [ref, active, onClose])
}
