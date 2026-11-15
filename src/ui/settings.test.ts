import { describe, expect, it } from 'vitest'
import { defaultSettings, parseSettings, readSettings, writeSettings } from './settings'

const defaults = defaultSettings(false)

describe('settings', () => {
  it('falls back to defaults for nothing, garbage or the wrong shape', () => {
    expect(parseSettings(null, defaults)).toEqual(defaults)
    expect(parseSettings('{not json', defaults)).toEqual(defaults)
    expect(parseSettings('42', defaults)).toEqual(defaults)
  })

  it('keeps valid values, clamps volumes and ignores wrong types', () => {
    const parsed = parseSettings(
      JSON.stringify({ masterVolume: 3, musicVolume: -1, effectsVolume: 'loud', largeText: true, muted: 'yes' }),
      defaults,
    )
    expect(parsed.masterVolume).toBe(1)
    expect(parsed.musicVolume).toBe(0)
    expect(parsed.effectsVolume).toBe(defaults.effectsVolume)
    expect(parsed.largeText).toBe(true)
    expect(parsed.muted).toBe(defaults.muted)
  })

  it('survives storage that throws on every call', () => {
    const broken = {
      getItem: () => {
        throw new Error('blocked')
      },
      setItem: () => {
        throw new Error('blocked')
      },
    }
    expect(() => readSettings(broken)).not.toThrow()
    expect(() => writeSettings(defaults, broken)).not.toThrow()
  })

  it('round-trips through a storage', () => {
    const memory = new Map<string, string>()
    const store = { getItem: (k: string) => memory.get(k) ?? null, setItem: (k: string, v: string) => void memory.set(k, v) }
    writeSettings({ ...defaults, pauseOnPanels: true, masterVolume: 0.25 }, store)
    const read = readSettings(store)
    expect(read.pauseOnPanels).toBe(true)
    expect(read.masterVolume).toBe(0.25)
  })
})
