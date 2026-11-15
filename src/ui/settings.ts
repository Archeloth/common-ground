import { useSyncExternalStore } from 'react'

// Player preferences (Milestone 8.6 main menu): audio volumes, reduced motion,
// text size and "pause when panels open". These are per-device UI settings,
// not part of a saved town, so they live in localStorage. Every access is
// wrapped: private windows and blocked storage fall back to the defaults.

export interface Settings {
  masterVolume: number // 0..1
  musicVolume: number // 0..1, music and ambience
  interfaceVolume: number // 0..1, clicks, tabs, toggles, drawers
  gameVolume: number // 0..1, building, research, rewards, chapters
  muted: boolean
  reducedMotion: boolean
  largeText: boolean
  pauseOnPanels: boolean
}

const STORAGE_KEY = 'common-ground.settings'

function systemPrefersReducedMotion(): boolean {
  try {
    return typeof window !== 'undefined' && window.matchMedia('(prefers-reduced-motion: reduce)').matches
  } catch {
    return false
  }
}

export function defaultSettings(reducedMotion = systemPrefersReducedMotion()): Settings {
  return {
    masterVolume: 0.8,
    musicVolume: 0.6,
    interfaceVolume: 0.7,
    gameVolume: 0.8,
    muted: false,
    reducedMotion,
    largeText: false,
    pauseOnPanels: false,
  }
}

function volume(value: unknown, fallback: number): number {
  return typeof value === 'number' && Number.isFinite(value) ? Math.min(1, Math.max(0, value)) : fallback
}

function flag(value: unknown, fallback: boolean): boolean {
  return typeof value === 'boolean' ? value : fallback
}

// Pure: turn whatever is stored (or nothing, or garbage) into valid settings.
export function parseSettings(raw: string | null, defaults: Settings): Settings {
  if (!raw) return defaults
  let data: Record<string, unknown>
  try {
    const parsed: unknown = JSON.parse(raw)
    if (parsed === null || typeof parsed !== 'object') return defaults
    data = parsed as Record<string, unknown>
  } catch {
    return defaults
  }
  return {
    masterVolume: volume(data.masterVolume, defaults.masterVolume),
    musicVolume: volume(data.musicVolume, defaults.musicVolume),
    // Older saves of the settings had one Effects slider: it seeds both.
    interfaceVolume: volume(data.interfaceVolume ?? data.effectsVolume, defaults.interfaceVolume),
    gameVolume: volume(data.gameVolume ?? data.effectsVolume, defaults.gameVolume),
    muted: flag(data.muted, defaults.muted),
    reducedMotion: flag(data.reducedMotion, defaults.reducedMotion),
    largeText: flag(data.largeText, defaults.largeText),
    pauseOnPanels: flag(data.pauseOnPanels, defaults.pauseOnPanels),
  }
}

type StorageLike = Pick<Storage, 'getItem' | 'setItem'>

function storage(): StorageLike | null {
  try {
    return typeof localStorage === 'undefined' ? null : localStorage
  } catch {
    return null
  }
}

export function readSettings(store: StorageLike | null = storage()): Settings {
  try {
    return parseSettings(store?.getItem(STORAGE_KEY) ?? null, defaultSettings())
  } catch {
    return defaultSettings()
  }
}

export function writeSettings(settings: Settings, store: StorageLike | null = storage()): void {
  try {
    store?.setItem(STORAGE_KEY, JSON.stringify(settings))
  } catch {
    // Storage full or blocked: the settings still apply for this visit.
  }
}

// --- a tiny external store, so any component can read settings ----------------

let current: Settings | null = null
const listeners = new Set<() => void>()

export function getSettings(): Settings {
  current ??= readSettings()
  return current
}

export function updateSettings(patch: Partial<Settings>): void {
  current = { ...getSettings(), ...patch }
  writeSettings(current)
  applySettingsToDocument(current)
  for (const listener of listeners) listener()
}

function subscribe(listener: () => void): () => void {
  listeners.add(listener)
  return () => {
    listeners.delete(listener)
  }
}

export function useSettings(): Settings {
  return useSyncExternalStore(subscribe, getSettings, getSettings)
}

// Reduced motion and text size are page-wide: attributes on <html> that the
// CSS (and the canvas, through the hook) respond to.
export function applySettingsToDocument(settings: Settings): void {
  if (typeof document === 'undefined') return
  const root = document.documentElement
  root.dataset.motion = settings.reducedMotion ? 'reduced' : 'full'
  root.dataset.text = settings.largeText ? 'large' : 'normal'
}
