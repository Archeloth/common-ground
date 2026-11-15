import { audioLevels } from './audio'
import { getSettings } from './settings'
import { setAmbienceWind } from './ambience'

// Background music: "Peaceful Village" (wind and birdsong; CC BY, see
// LICENSES.md), looped quietly under the game. One HTMLAudioElement streams
// it, so the 7 MB file never has to be decoded into memory and the game never
// waits for it. Browsers allow playback only after a user gesture, so it
// starts from the first click (uiSounds.ts). Volume follows Master x Music,
// fades smoothly, and drops while the game is paused.

const TRACK = 'audio/music/peaceful-village-compressed.mp3'
const BASE_LEVEL = 0.55 // music sits under the interface and game sounds
const PAUSED_FACTOR = 0.55
const FADE_STEP_MS = 50
const FADE_MS = 1500

let element: HTMLAudioElement | null = null
let failed = false
let pausedMood = false
let fadeTimer: number | null = null

function targetVolume(): number {
  return Math.min(1, BASE_LEVEL * audioLevels(getSettings()).music * (pausedMood ? PAUSED_FACTOR : 1))
}

// Ease the element's volume toward the target over ~1.5 s.
function fadeToTarget(): void {
  const el = element
  if (!el) return
  if (fadeTimer !== null) window.clearInterval(fadeTimer)
  const step = FADE_STEP_MS / FADE_MS
  fadeTimer = window.setInterval(() => {
    const target = targetVolume()
    const next = el.volume + Math.sign(target - el.volume) * Math.min(Math.abs(target - el.volume), step)
    el.volume = Math.max(0, Math.min(1, next))
    if (Math.abs(el.volume - target) < 0.001) {
      el.volume = target
      if (fadeTimer !== null) window.clearInterval(fadeTimer)
      fadeTimer = null
    }
  }, FADE_STEP_MS)
}

// Call from a user gesture (or after one). Safe to call repeatedly.
export function startMusic(): void {
  if (failed || typeof Audio === 'undefined') return
  if (!element) {
    element = new Audio(`${import.meta.env.BASE_URL}${TRACK}`)
    element.loop = true
    element.preload = 'none'
    element.volume = 0
    if (new URLSearchParams(location.search).has('debug')) {
      // Dev only: let automated checks see the player.
      ;(window as unknown as { __music?: HTMLAudioElement }).__music = element
    }
    element.addEventListener('error', () => {
      // No music after all: let the generated ambience carry the wind instead.
      failed = true
      setAmbienceWind(true)
    })
  }
  if (element.paused) {
    element.play().catch(() => {
      // Autoplay refused (no gesture yet): the next gesture tries again.
    })
  }
  fadeToTarget()
}

// Re-read the settings and the game's mood (paused = a hush).
export function refreshMusic(mood?: { paused?: boolean }): void {
  if (mood?.paused !== undefined) pausedMood = mood.paused
  if (element) fadeToTarget()
}

export function musicElement(): HTMLAudioElement | null {
  return element
}
