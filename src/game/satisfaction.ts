import type { NeedId, Needs, ReasonEntry, ScenarioDef } from './types'
import { NEED_ORDER } from './needs'

// Satisfaction weights ARE the plan's formula:
//   100 * (0.20*energy + 0.20*food + 0.15*mobility + 0.15*green_space
//          + 0.10*waste + 0.20*housing_comfort)
// Balance owners: keep these numbers in one place, with a comment saying why.
// Milestone 10: these are the defaults; a scenario may set its own weights
// (a dry region weighs water). Water is 0 here, so it is hidden.

export type NeedWeights = Readonly<Record<NeedId, number>>

export const SATISFACTION_WEIGHTS: NeedWeights = {
  energy: 0.2,
  food: 0.2,
  mobility: 0.15,
  green: 0.15,
  waste: 0.1,
  housing: 0.2,
  water: 0,
}

export function satisfactionOf(needs: Needs, weights: NeedWeights = SATISFACTION_WEIGHTS): number {
  let sum = 0
  for (const need of NEED_ORDER) {
    if (weights[need] > 0) sum += needs[need] * weights[need]
  }
  return Math.round(sum * 100)
}

// The reasons list the panel shows (plan: "store the three largest shortfalls
// as reasons"): the `count` needs with the biggest gap (1 - coverage), largest
// first. Fully covered and weightless needs are not shortfalls.
// Array.prototype.sort is stable, so equal gaps keep the display order and
// results stay deterministic.
export function shortfalls(needs: Needs, count: number, weights: NeedWeights = SATISFACTION_WEIGHTS): ReasonEntry[] {
  const entries: ReasonEntry[] = NEED_ORDER.filter((need) => weights[need] > 0 && needs[need] < 1).map((need) => ({
    need,
    coverage: needs[need],
  }))
  entries.sort((a, b) => a.coverage - b.coverage)
  return entries.slice(0, count)
}

// The needs a town shows (Milestone 10): those that count towards its
// satisfaction, in display order.
export function visibleNeeds(scenario: ScenarioDef): NeedId[] {
  return NEED_ORDER.filter((need) => scenario.needWeights[need] > 0)
}
