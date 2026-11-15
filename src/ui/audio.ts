import type { Settings } from './settings'
import { getSettings } from './settings'
import { SOUND_MAP } from './soundMap'
import type { SoundId } from './soundMap'

export type { SoundId } from './soundMap'

// Sound effects through Web Audio (Milestone 9). Browsers only allow audio
// after a user gesture, so the AudioContext is created by unlockAudio() on the
// first pointer or key press; until then playSound() is silent. Buffers are
// fetched and decoded once, in the background, right after unlocking.

export interface AudioLevels {
  music: number // effective 0..1 after master volume and mute
  effects: number
}

export function audioLevels(settings: Settings): AudioLevels {
  if (settings.muted) return { music: 0, effects: 0 }
  return {
    music: settings.masterVolume * settings.musicVolume,
    effects: settings.masterVolume * settings.effectsVolume,
  }
}

let context: AudioContext | null = null
const buffers = new Map<string, AudioBuffer>()
const lastPlayed = new Map<SoundId, number>()
// The same sound twice within this window is one sound (e.g. a click that
// also starts a project): avoids harsh doubling.
const DEBOUNCE_MS = 60

function fileUrl(file: string): string {
  return `${import.meta.env.BASE_URL}audio/${file}`
}

async function loadBuffers(ctx: AudioContext): Promise<void> {
  const files = new Set(Object.values(SOUND_MAP).flatMap((def) => def.files))
  await Promise.all(
    [...files].map(async (file) => {
      try {
        const response = await fetch(fileUrl(file))
        const data = await response.arrayBuffer()
        buffers.set(file, await ctx.decodeAudioData(data))
      } catch {
        // A missing or broken file just stays silent.
      }
    }),
  )
}

export function audioContext(): AudioContext | null {
  return context
}

// Call from a user gesture. Safe to call repeatedly.
export function unlockAudio(): void {
  if (context) {
    if (context.state === 'suspended') void context.resume()
    return
  }
  const Ctor = typeof window === 'undefined' ? undefined : window.AudioContext
  if (!Ctor) return
  context = new Ctor()
  void loadBuffers(context)
}

export function playSound(sound: SoundId): void {
  const ctx = context
  if (!ctx) return
  const effects = audioLevels(getSettings()).effects
  if (effects <= 0) return
  const now = performance.now()
  if (now - (lastPlayed.get(sound) ?? -Infinity) < DEBOUNCE_MS) return
  lastPlayed.set(sound, now)
  const def = SOUND_MAP[sound]
  const file = def.files[Math.floor(Math.random() * def.files.length)]
  const buffer = buffers.get(file)
  if (!buffer) return
  const source = ctx.createBufferSource()
  source.buffer = buffer
  // A touch of pitch variety (±4%) keeps repeated sounds from feeling robotic.
  source.playbackRate.value = 0.96 + Math.random() * 0.08
  const gain = ctx.createGain()
  gain.gain.value = Math.min(4, def.gain * effects)
  source.connect(gain).connect(ctx.destination)
  source.start()
}
