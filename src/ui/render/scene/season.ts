import type { Season } from '../../../game/calendar'
import { PALETTE, mix } from '../sprites/kit'

// How each season colours the town (Milestone 9 polish; visual only, the sim
// ignores seasons). Districts are cached per season, so a change of season
// redraws the town four times a year.

export interface SeasonLook {
  season: Season
  // The district ground is mixed towards `tint` by `amount`.
  tint: string
  amount: number
  leaves: { leaf: string; leafLight: string; leafDark: string }
  conifer: string
  fields: { wheat: string; crop: string }
  snow: boolean
  // 0..1: how much small wildlife (bees, butterflies, birds) is about.
  life: number
  // How often birds sing in the ambience (lower is more often).
  birds: number
  // How much water a wadi carries, and how high a river runs (Milestone 10).
  water: 'dry' | 'low' | 'normal' | 'high'
  // Flowering trees (cherry, kapok); the leaf colour when nothing flowers.
  blossom?: string
}

const SUMMER_LEAVES = { leaf: '#69a85c', leafLight: '#86c271', leafDark: '#4a8a4f' }

export const SEASON_LOOKS: Record<Season, SeasonLook> = {
  spring: {
    season: 'spring',
    tint: '#d8efb6',
    amount: 0.12,
    leaves: { leaf: '#7dbd62', leafLight: '#a4d67e', leafDark: '#5e9f55' },
    conifer: '#3f7d55',
    fields: { wheat: '#c9d97a', crop: '#a6d06f' },
    snow: false,
    life: 1,
    birds: 0.8,
    water: 'normal',
  },
  summer: {
    season: 'summer',
    tint: '#e9dc8f',
    amount: 0.06,
    leaves: SUMMER_LEAVES,
    conifer: '#3f7d55',
    fields: { wheat: '#e6c86a', crop: '#9bc469' },
    snow: false,
    life: 1,
    birds: 1,
    water: 'low',
  },
  autumn: {
    season: 'autumn',
    tint: '#d9a35c',
    amount: 0.1,
    leaves: { leaf: '#e0913f', leafLight: '#efbd4f', leafDark: '#c4613b' },
    conifer: '#3e7653',
    fields: { wheat: '#d9b77a', crop: '#b9a35f' },
    snow: false,
    life: 0.6,
    birds: 1.6,
    water: 'normal',
  },
  winter: {
    season: 'winter',
    tint: '#f1f5f7',
    amount: 0.5,
    leaves: { leaf: '#a89a8c', leafLight: '#bdb2a4', leafDark: '#8f8174' },
    conifer: '#4a7a62',
    fields: { wheat: '#eef1f2', crop: '#e7ecec' },
    snow: true,
    life: 0.2,
    birds: 3.5,
    water: 'high',
  },
}

// The look for a season id; a season without its own look (a theme still
// being drawn) falls back to summer rather than failing to draw.
export function seasonLook(season: Season): SeasonLook {
  return SEASON_LOOKS[season] ?? SEASON_LOOKS.summer
}

// The season currently painted. The sprites read PALETTE, so a season swaps
// its leaf and field colours there before a district is drawn.
let current: SeasonLook = SEASON_LOOKS.summer

export function applySeason(look: SeasonLook): void {
  current = look
  const palette = PALETTE as unknown as Record<string, string>
  palette.leaf = look.leaves.leaf
  palette.leafLight = look.leaves.leafLight
  palette.leafDark = look.leaves.leafDark
  palette.conifer = look.conifer
  palette.wheat = look.fields.wheat
  palette.crop = look.fields.crop
  palette.blossom = look.blossom ?? look.leaves.leafLight
}

export function snowing(): boolean {
  return current.snow
}

export function seasonalGround(colour: string, look: SeasonLook): string {
  return mix(colour, look.tint, look.amount)
}

const SNOW = '#f8fafb'

// Snow on the shape just filled (its path is still the current path): covers
// it from `fromY` down to `toY`. Does nothing outside winter.
export function snowOnPath(
  ctx: CanvasRenderingContext2D | OffscreenCanvasRenderingContext2D,
  fromY: number,
  toY: number,
): void {
  if (!current.snow) return
  ctx.save()
  ctx.clip()
  ctx.fillStyle = SNOW
  ctx.fillRect(-1e5, fromY, 2e5, toY - fromY)
  ctx.restore()
}
