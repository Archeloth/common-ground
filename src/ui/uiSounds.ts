import { playSound, unlockAudio } from './audio'
import { startMusic } from './music'
import type { SoundId } from './soundMap'
import { SOUND_MAP } from './soundMap'

// Interface sounds by delegation (Milestone 9): every button clicks without
// each component wiring it up. A button may choose its sound with
// data-sound="toggle" (any SoundId), or data-sound="none" when its action
// plays its own sound (starting a project plays "build" from the game events).
// The first pointer or key press also unlocks audio (browser autoplay rules).
export function installUiSounds(): () => void {
  const onFirstGesture = () => {
    unlockAudio()
    startMusic()
  }
  const onClick = (event: MouseEvent) => {
    const target = event.target instanceof Element ? event.target : null
    const control = target?.closest('button, input[type="checkbox"], [role="tab"]')
    if (!control || (control as HTMLButtonElement).disabled) return
    const requested = control.getAttribute('data-sound')
    if (requested === 'none') return
    if (requested && requested in SOUND_MAP) {
      playSound(requested as SoundId)
      return
    }
    playSound(control instanceof HTMLInputElement ? 'toggle' : 'click')
  }
  window.addEventListener('pointerdown', onFirstGesture, true)
  window.addEventListener('keydown', onFirstGesture, true)
  document.addEventListener('click', onClick, true)
  return () => {
    window.removeEventListener('pointerdown', onFirstGesture, true)
    window.removeEventListener('keydown', onFirstGesture, true)
    document.removeEventListener('click', onClick, true)
  }
}
