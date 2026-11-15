import { describe, expect, it } from 'vitest'
import { SOUND_MAP } from './soundMap'

// The shipped sound files, listed by Vite (lazy: nothing is loaded).
const shipped = new Set(
  Object.keys(import.meta.glob('../../public/audio/*.wav')).map((path) => path.split('/').pop()),
)

describe('sound map', () => {
  it('points every sound at files that exist in public/audio', () => {
    expect(shipped.size).toBeGreaterThan(0)
    for (const [id, def] of Object.entries(SOUND_MAP)) {
      expect(def.files.length, id).toBeGreaterThan(0)
      for (const file of def.files) expect(shipped.has(file), `${id}: ${file}`).toBe(true)
    }
  })

  it('has a sensible gain for every sound', () => {
    for (const [id, def] of Object.entries(SOUND_MAP)) {
      expect(def.gain, id).toBeGreaterThan(0)
      expect(def.gain, id).toBeLessThanOrEqual(4)
    }
  })
})
