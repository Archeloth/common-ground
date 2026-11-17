import type { GameState, NeedId, NeighborhoodDef, NeighborhoodKind, ScenarioDef } from './types'
import { NEIGHBORHOOD_KINDS } from './types'
import { NEED_ORDER } from './needs'
import { activeProjectIds } from './expiry'
import type { Season } from './calendar'
import { seasonOfDay } from './calendar'
import type { MilestoneCondition } from './milestones'
import { conditionProgress } from './milestones'

// Conditions about one place (post-Milestone 9: the wildlife journal and the
// citizen stories). Each is checked against a single district - the one a
// species might live in, or the one a resident calls home - so content can
// say "a rain garden here, in spring" without naming the district. Town-wide
// checks reuse the milestone conditions through `town`.

export type PlaceCondition =
  | { type: 'kind'; kinds: NeighborhoodKind[] }
  | { type: 'need'; need: NeedId; min: number }
  | { type: 'satisfaction'; min: number }
  | { type: 'project'; project: string } // running (built, not lapsed) here
  | { type: 'busLine' } // a bus line stops here
  | { type: 'season'; seasons: Season[] }
  | { type: 'dayAtLeast'; day: number }
  | { type: 'species'; species: string } // already in the journal
  | { type: 'milestone'; milestone: string } // chapter completed
  | { type: 'town'; condition: MilestoneCondition }

const SEASONS: readonly Season[] = ['spring', 'summer', 'autumn', 'winter']

export function placeConditionMet(
  state: GameState,
  scenario: ScenarioDef,
  place: NeighborhoodDef,
  condition: PlaceCondition,
): boolean {
  switch (condition.type) {
    case 'kind':
      return condition.kinds.includes(place.kind)
    case 'need':
      return (state.neighborhoods[place.id]?.needs[condition.need] ?? 0) >= condition.min
    case 'satisfaction':
      return (state.neighborhoods[place.id]?.satisfaction ?? 0) >= condition.min
    case 'project':
      return activeProjectIds(state, place.id).includes(condition.project)
    case 'busLine':
      return state.busLines.some(([a, b]) => a === place.id || b === place.id)
    case 'season':
      return condition.seasons.includes(seasonOfDay(state.day))
    case 'dayAtLeast':
      return state.day >= condition.day
    case 'species':
      return state.wildlife[condition.species] !== undefined
    case 'milestone':
      return state.milestones.includes(condition.milestone)
    case 'town':
      return conditionProgress(state, condition.condition, scenario).met
  }
}

export function allPlaceConditionsMet(
  state: GameState,
  scenario: ScenarioDef,
  place: NeighborhoodDef,
  conditions: readonly PlaceCondition[],
): boolean {
  return conditions.every((c) => placeConditionMet(state, scenario, place, c))
}

// Known content ids a condition may reference; validation fails loudly on a typo.
export interface ConditionIds {
  projects: ReadonlySet<string>
  species: ReadonlySet<string>
  milestones: ReadonlySet<string>
}

export function placeConditionProblems(condition: PlaceCondition, ids: ConditionIds): string[] {
  const problems: string[] = []
  const fraction = (value: number) => Number.isFinite(value) && value >= 0 && value <= 1
  switch (condition.type) {
    case 'kind':
      if (!Array.isArray(condition.kinds) || condition.kinds.length === 0) problems.push('kind needs at least one kind')
      else for (const k of condition.kinds) if (!NEIGHBORHOOD_KINDS.includes(k)) problems.push(`unknown kind "${k}"`)
      break
    case 'need':
      if (!NEED_ORDER.includes(condition.need)) problems.push(`unknown need "${condition.need}"`)
      if (!fraction(condition.min)) problems.push('need min must be in [0, 1]')
      break
    case 'satisfaction':
      if (!Number.isFinite(condition.min) || condition.min < 0 || condition.min > 100) problems.push('satisfaction min must be in [0, 100]')
      break
    case 'project':
      if (!ids.projects.has(condition.project)) problems.push(`unknown project "${condition.project}"`)
      break
    case 'busLine':
      break
    case 'season':
      if (!Array.isArray(condition.seasons) || condition.seasons.length === 0) problems.push('season needs at least one season')
      else for (const s of condition.seasons) if (!SEASONS.includes(s)) problems.push(`unknown season "${s}"`)
      break
    case 'dayAtLeast':
      if (!Number.isInteger(condition.day) || condition.day < 1) problems.push('dayAtLeast must be a day number')
      break
    case 'species':
      if (!ids.species.has(condition.species)) problems.push(`unknown species "${condition.species}"`)
      break
    case 'milestone':
      if (!ids.milestones.has(condition.milestone)) problems.push(`unknown milestone "${condition.milestone}"`)
      break
    case 'town':
      if (!condition.condition || typeof condition.condition !== 'object') problems.push('town needs a milestone condition')
      break
    default:
      problems.push(`unknown condition type "${(condition as { type?: unknown }).type}"`)
  }
  return problems
}
