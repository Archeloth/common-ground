import type { GameState, ScenarioDef } from './types'
import { RENEW_WINDOW_MONTHS, TICKS_PER_MONTH } from './constants'

// Project lifetimes (Milestone 8.5 playtest feedback: projects are time-based
// and can run their course). Volunteer-run projects carry durationMonths;
// infrastructure is permanent (null expiry). An expired project stops giving
// effects but keeps its slot until the player renews or removes it, so this
// module never mutates the projects array.

export function projectEndsAt(startDay: number, durationMonths: number): number {
  return startDay + durationMonths * TICKS_PER_MONTH
}

// The day the project in a slot runs out (null = permanent capital work).
export function expiryOf(state: GameState, neighborhoodId: string, slot: number): number | null {
  return state.projectExpiry[neighborhoodId]?.[slot] ?? null
}

export function isExpired(state: GameState, neighborhoodId: string, slot: number): boolean {
  const expires = expiryOf(state, neighborhoodId, slot)
  return expires !== null && state.day >= expires
}

// Renewal opens in the project's last RENEW_WINDOW_MONTHS and stays open once
// it has expired, so a reminder can arrive before the effects stop.
export function isRenewable(state: GameState, neighborhoodId: string, slot: number): boolean {
  const expires = expiryOf(state, neighborhoodId, slot)
  return expires !== null && expires - state.day <= RENEW_WINDOW_MONTHS * TICKS_PER_MONTH
}

// Project ids still giving effects in a neighborhood (skips expired slots).
export function activeProjectIds(state: GameState, neighborhoodId: string): string[] {
  const slots = state.projects[neighborhoodId] ?? []
  const out: string[] = []
  for (let i = 0; i < slots.length; i++) {
    const id = slots[i]
    if (id !== null && !isExpired(state, neighborhoodId, i)) out.push(id)
  }
  return out
}

// Slots whose project ran its course in a neighborhood (badges, panel).
export function expiredSlots(state: GameState, neighborhoodId: string): number[] {
  const slots = state.projects[neighborhoodId] ?? []
  const out: number[] = []
  for (let i = 0; i < slots.length; i++) {
    if (slots[i] !== null && isExpired(state, neighborhoodId, i)) out.push(i)
  }
  return out
}

// Every expired (neighborhood, slot, project) in scenario order - deterministic.
export function allExpired(
  state: GameState,
  scenario: ScenarioDef,
): Array<{ neighborhood: string; slot: number; projectId: string }> {
  const out: Array<{ neighborhood: string; slot: number; projectId: string }> = []
  for (const n of scenario.neighborhoods) {
    for (const slot of expiredSlots(state, n.id)) {
      out.push({ neighborhood: n.id, slot, projectId: state.projects[n.id][slot] as string })
    }
  }
  return out
}

// Running (non-expired) projects town-wide; with a project id, only that one.
// Milestones, messages and guidance count these, so a lapsed garden no longer
// counts toward a goal until it is renewed.
export function countActive(state: GameState, projectId?: string): number {
  let total = 0
  for (const id of Object.keys(state.projects)) {
    for (const running of activeProjectIds(state, id)) {
      if (projectId === undefined || running === projectId) total++
    }
  }
  return total
}

// The key used for an expiry notice ("neighborhood:slot").
export function expiryNoticeKey(neighborhoodId: string, slot: number): string {
  return `${neighborhoodId}:${slot}`
}

export function parseExpiryNoticeKey(key: string): { neighborhood: string; slot: number } | null {
  const at = key.lastIndexOf(':')
  if (at <= 0) return null
  const slot = Number(key.slice(at + 1))
  if (!Number.isInteger(slot) || slot < 0) return null
  return { neighborhood: key.slice(0, at), slot }
}
