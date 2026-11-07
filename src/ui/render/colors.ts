import type { NeighborhoodKind } from '../../game/types'

// One flat ~12-colour palette — placeholder art, tuned by eye later
// (development plan, "Art plan for an open-source project"). Nothing here is
// "design"; it is the cheapest thing that reads as a town.

export const COLORS = {
  ground: '#ccd6b8',
  river: '#7fa3c4',
  riverBank: '#a7b98e',
  selectedStroke: '#1f2b1c',
  labelBackground: 'rgba(255, 255, 255, 0.92)',
} as const

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
