import type { NeedId, NeighborhoodKind } from '../../game/types'
import type { NeedPalette } from '../settings'

// One flat ~12-colour palette — placeholder art, tuned by eye later
// (development plan, "Art plan for an open-source project"). Nothing here is
// "design"; it is the cheapest thing that reads as a town.

export const COLORS = {
  ground: '#ccd6b8',
  river: '#7fa3c4',
  riverBank: '#a7b98e',
  bridgeDeck: '#b48a5e', // fixed river bridges (Milestone 8.5)
  bridgeRail: '#6e5136',
  bridgeShadow: 'rgba(31, 43, 28, 0.25)',
  selectedStroke: '#1f2b1c',
  labelBackground: 'rgba(255, 255, 255, 0.92)',
  bus: '#46618f', // dashed bus-line strokes (Milestone 7)
  pulse: '#c4592b', // pulsing tutorial highlight rings (Milestone 8)
  badge: '#b4561f', // expired-project badge (Milestone 8.5)
} as const

// One colour per need (Milestone 9): need bars, effect chips and the
// floating "+12% Food" labels all use it, so a need is recognisable at a
// glance. Always shown next to the need's name or icon, never alone.
//
// Validated with the dataviz skill's palette checker on the panel surface
// (#fbfcf7): lightness band, chroma floor, colour-blind separation and the
// normal-vision floor all pass for neighbours in this order. Energy and
// housing sit below 3:1 contrast, so every use carries a visible label or
// icon (and the history chart has a table view). Violet and blue are too close
// for some colour-blind players when compared directly, so the history chart
// draws needs as separate small charts, never six lines on one plot.
const STANDARD_NEED_COLORS: Record<NeedId, string> = {
  energy: '#eda100',
  food: '#e34948',
  mobility: '#2a78d6',
  green: '#0ca30c',
  waste: '#6250d6',
  housing: '#e87ba4',
}

// The colour-blind palette (Settings > Need colours), built on the Okabe-Ito
// hues with a deeper green. Validated the same way, but stricter: every PAIR
// (not just neighbours) passes colour-blind separation (worst 9.0, protan) and
// the normal-vision floor (worst 15.6). In the standard palette, Food red and
// Green space green are almost the same colour for deuteranopes (2.5).
// Energy, Waste and Housing are below 3:1 contrast, handled as above.
const COLOUR_BLIND_NEED_COLORS: Record<NeedId, string> = {
  energy: '#e69f00',
  food: '#d55e00',
  mobility: '#0072b2',
  green: '#008c66',
  waste: '#56b4e9',
  housing: '#cc79a7',
}

export const NEED_PALETTES: Record<NeedPalette, Readonly<Record<NeedId, string>>> = {
  standard: STANDARD_NEED_COLORS,
  colourBlind: COLOUR_BLIND_NEED_COLORS,
}

// The live need colours. Like the sprite PALETTE and the seasons, the chosen
// palette is copied in place (applyNeedPalette, from the settings), so every
// reader - bars, chips, chart and map - follows the setting.
export const NEED_COLORS: Record<NeedId, string> = { ...STANDARD_NEED_COLORS }

export function applyNeedPalette(palette: NeedPalette): void {
  Object.assign(NEED_COLORS, NEED_PALETTES[palette])
}

export const KIND_COLORS: Record<NeighborhoodKind, string> = {
  old_town: '#c98f6b', // warm terracotta
  apartments: '#9aaab3', // slate blue
  suburb: '#a8bd84', // soft green
  riverside: '#6fb2a6', // teal
  industrial_edge: '#9b988f', // concrete grey
  retail_park: '#8f93c2', // muted indigo
  farmland: '#c6bd6d', // hay yellow
  woodland: '#4f8f57', // deep green
}

// Darken/lighten a #rrggbb colour by percent (-100..100); used to derive the
// "side" of a raised blob from its "top" colour.
export function shade(hex: string, percent: number): string {
  const n = parseInt(hex.slice(1), 16)
  const amt = Math.round(2.55 * percent)
  const channel = (shift: number) => {
    const v = ((n >> shift) & 0xff) + amt
    return Math.max(0, Math.min(255, v)).toString(16).padStart(2, '0')
  }
  return `#${channel(16)}${channel(8)}${channel(0)}`
}
