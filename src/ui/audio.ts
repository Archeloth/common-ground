import type { Settings } from './settings'

// The audio façade (Milestone 8.6): the main menu's volume settings are wired
// here already, so Milestone 9 only has to add the Web Audio graph and the
// sound files. Until then every call is a deliberate no-op.

export type SoundId = 'click' | 'build' | 'complete' | 'milestone'

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

// Placeholder: Milestone 9 plays the sound at audioLevels(...).effects.
export function playSound(sound: SoundId): void {
  void sound
}
