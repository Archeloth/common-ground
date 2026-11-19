import type { NeedId, Needs, ProjectEffect } from './types'

// The needs in display order; also the tie-break order for reasons, so the
// simulation is deterministic on equal gaps. Water comes last (Milestone 10)
// so the older tie-breaks are unchanged.
export const NEED_ORDER: readonly NeedId[] = [
  'energy',
  'food',
  'mobility',
  'green',
  'waste',
  'housing',
  'water',
]

export function clamp01(value: number): number {
  return Math.min(1, Math.max(0, value))
}

export function clamp(value: number, lo: number, hi: number): number {
  return Math.min(hi, Math.max(lo, value))
}

// Round to a fixed number of decimal places so saves stay tidy and identical
// across JS engines (determinism test depends on this).
export function round(value: number, digits = 4): number {
  const factor = 10 ** digits
  return Math.round(value * factor) / factor
}

// The coverage target a neighborhood drifts toward: its starting (base)
// coverage plus the effect of every active project, clamped into [0, 1].
export function needTargets(base: Needs, effects: readonly ProjectEffect[]): Needs {
  const target: Needs = { ...base }
  for (const effect of effects) {
    target[effect.need] = clamp01(target[effect.need] + effect.change)
  }
  return target
}

// Move coverage toward the target at a fixed rate per tick, so a project's
// effects materialise over weeks instead of appearing instantly (and removing a
// project lets the need fall back to its base level, also gradually).
export function moveNeedsToward(from: Needs, target: Needs, rate: number): Needs {
  const out = {} as Needs
  for (const need of NEED_ORDER) {
    out[need] = round(clamp01(from[need] + (target[need] - from[need]) * rate))
  }
  return out
}