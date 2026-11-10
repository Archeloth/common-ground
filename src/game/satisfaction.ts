import type { Needs, ReasonEntry } from './types'
import { NEED_ORDER } from './needs'

// Satisfaction weights ARE the plan's formula:
//   100 * (0.20*energy + 0.20*food + 0.15*mobility + 0.15*green_space
//          + 0.10*waste + 0.20*housing_comfort)
// Balance owners: keep these numbers in one place, with a comment saying why.

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
  for (const need of NEED_ORDER) {
    sum += needs[need] * SATISFACTION_WEIGHTS[need]
  }
  return Math.round(sum * 100)
}

// The reasons list the panel shows (plan: "store the three largest shortfalls
// as reasons"): the `count` needs with the biggest gap (1 - coverage), largest
// first. Fully covered needs are not shortfalls. Array.prototype.sort is
// stable, so equal gaps keep the display order and results stay deterministic.
export function shortfalls(needs: Needs, count: number): ReasonEntry[] {
  const entries: ReasonEntry[] = NEED_ORDER.filter((need) => needs[need] < 1).map((need) => ({
    need,
    coverage: needs[need],
  }))
  entries.sort((a, b) => a.coverage - b.coverage)
  return entries.slice(0, count)
}
