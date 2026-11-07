import type { Needs, NeighborhoodDef } from './types'

// Placeholder neighbourhood satisfaction until Milestone 4 adds smoothing and
// the top-three reasons list. The weights ARE the plan's satisfaction
// formula, applied to the need coverages of a neighborhood:
//   100 * (0.20*energy + 0.20*food + 0.15*mobility + 0.15*green_space
//          + 0.10*waste + 0.20*housing_comfort)
// Balance owners: keep these numbers in one place, with comment why.

export const SATISFACTION_WEIGHTS: Record<keyof Needs, number> = {
  energy: 0.2,
  food: 0.2,
  mobility: 0.15,
  green: 0.15,
  waste: 0.1,
  housing: 0.2,
}

export function satisfactionOf(needs: Needs): number {
  let sum = 0
  for (const need of Object.keys(SATISFACTION_WEIGHTS) as (keyof Needs)[]) {
    sum += needs[need] * SATISFACTION_WEIGHTS[need]
  }
  return Math.round(sum * 100)
}

export function neighborhoodSatisfaction(n: NeighborhoodDef): number {
  return satisfactionOf(n.needs)
}
