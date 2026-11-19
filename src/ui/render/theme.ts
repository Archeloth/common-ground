import type { NeighborhoodKind } from '../../game/types'
import { COLORS, KIND_COLORS } from './colors'
import { PALETTE, rebuildSwatches } from './sprites/kit'
import type { KindRecipe } from './scene/layout'
import { RECIPES } from './scene/layout'
import type { SeasonLook } from './scene/season'
import { SEASON_LOOKS } from './scene/season'
import { DEFAULT_TRACK, setMusicTrack } from '../music'
import type { GreeneryStyle } from './scene/layout'
import type { WildStyle } from './scene/wilds'
import { SAHEL } from './themes/sahel'
import { EAST_ASIA } from './themes/eastAsia'

// A region's look (Milestone 10). Every sprite is drawn in code, so a region
// is a theme object: palette overrides, kind colours and layout recipes,
// season looks, a music track and the interface's accent colour. The town's
// scenario names its theme; the game screen wears it, the menu the default.
//
// The drawing code reads live tables (PALETTE, COLORS, KIND_COLORS, RECIPES,
// SEASON_LOOKS), the same pattern as the seasons and the need palettes:
// applyTheme refills them in place.

type Palette = { -readonly [K in keyof typeof PALETTE]: (typeof PALETTE)[K] }

export interface RegionTheme {
  id: string
  palette: Partial<Record<keyof Palette, string>> // overrides of the base palette
  colors: Partial<Record<keyof typeof COLORS, string>> // overrides of the map colours
  kindColors: Partial<Record<NeighborhoodKind, string>>
  recipes: Partial<Record<NeighborhoodKind, KindRecipe>>
  seasonLooks: Record<string, SeasonLook>
  music: string
  accent: { primary: string; strong: string; soft: string }
  // The countryside (Milestone 10): how much grows there (1 = Willowbrook's),
  // and which regional plant stands in for a temperate one (an acacia for a
  // tree, a palm for a conifer).
  wilds: { density: number; swap: Partial<Record<WildStyle, GreeneryStyle>> }
}

// The base tables as first loaded: the temperate look.
const BASE_PALETTE = { ...PALETTE } as Record<string, unknown>
const BASE_COLORS = { ...COLORS } as Record<string, string>

// Willowbrook's look, exactly as it was drawn before themes existed.
export const TEMPERATE: RegionTheme = {
  id: 'temperate',
  palette: {},
  colors: {},
  kindColors: { ...KIND_COLORS },
  recipes: { ...RECIPES },
  seasonLooks: { ...SEASON_LOOKS },
  music: DEFAULT_TRACK,
  accent: { primary: '#3f6a3a', strong: '#345a30', soft: '#d6e8cc' },
  wilds: { density: 1, swap: {} },
}

export const THEMES: Record<string, RegionTheme> = { temperate: TEMPERATE, sahel: SAHEL, east_asia: EAST_ASIA }

export function hasTheme(id: string): boolean {
  return Object.hasOwn(THEMES, id)
}

export function themeById(id: string): RegionTheme {
  return hasTheme(id) ? THEMES[id] : TEMPERATE
}

function refill(target: object, source: object): void {
  const table = target as Record<string, unknown>
  for (const key of Object.keys(table)) delete table[key]
  Object.assign(table, source)
}

let current: RegionTheme = TEMPERATE

export function currentTheme(): RegionTheme {
  return current
}

// Wear a theme. Cheap when it is already worn, so it can follow every store
// update. The district caches are keyed by town, so nothing stale is drawn.
export function applyTheme(theme: RegionTheme): void {
  if (theme === current) return
  refill(PALETTE, { ...BASE_PALETTE, ...theme.palette })
  rebuildSwatches()
  refill(COLORS, { ...BASE_COLORS, ...theme.colors })
  refill(KIND_COLORS, theme.kindColors)
  refill(RECIPES, theme.recipes)
  refill(SEASON_LOOKS, theme.seasonLooks)
  setMusicTrack(theme.music)
  if (typeof document !== 'undefined') {
    const style = document.documentElement.style
    style.setProperty('--primary', theme.accent.primary)
    style.setProperty('--primary-strong', theme.accent.strong)
    style.setProperty('--primary-soft', theme.accent.soft)
  }
  current = theme
}
