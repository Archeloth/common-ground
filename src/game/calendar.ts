import { TICKS_PER_MONTH } from './constants'

// The in-game calendar (Milestone 8.5 playtest feedback: time reads as year,
// month and day, not just "month 3, day 12"). One tick is one in-game day and
// TICKS_PER_MONTH days make a month, exactly like the sim's tick loop.

export const MONTHS_PER_YEAR = 12

export interface CalendarDate {
  year: number // 1-based
  month: number // 1..MONTHS_PER_YEAR
  dayOfMonth: number // 1..TICKS_PER_MONTH
}

export function calendarOf(day: number): CalendarDate {
  const elapsed = day - 1
  const year = Math.floor(elapsed / (TICKS_PER_MONTH * MONTHS_PER_YEAR)) + 1
  const inYear = elapsed % (TICKS_PER_MONTH * MONTHS_PER_YEAR)
  const month = Math.floor(inYear / TICKS_PER_MONTH) + 1
  const dayOfMonth = (inYear % TICKS_PER_MONTH) + 1
  return { year, month, dayOfMonth }
}

// Seasons by calendar month (Milestone 10: one set per region). Temperate is
// the northern-hemisphere four: spring March-May, summer June-August, autumn
// September-November, winter December-February. Seasons only change looks,
// wildlife and stories: the simulation itself does not change with them.
// A season is an id from its town's set ("spring", "rains", "high_water").
export type Season = string

export type SeasonSetId = 'temperate' | 'sahel' | 'monsoon' | 'floodplain'

export interface SeasonDef {
  id: Season
  months: readonly number[]
}

export const SEASON_SETS: Record<SeasonSetId, readonly SeasonDef[]> = {
  temperate: [
    { id: 'winter', months: [12, 1, 2] },
    { id: 'spring', months: [3, 4, 5] },
    { id: 'summer', months: [6, 7, 8] },
    { id: 'autumn', months: [9, 10, 11] },
  ],
  // The Sahel's year (first draft, to check with the region's readers): a
  // cool dry season, a hot dry season, the rains, then the harvest.
  sahel: [
    { id: 'cool_dry', months: [12, 1, 2] },
    { id: 'hot_dry', months: [3, 4, 5] },
    { id: 'rains', months: [6, 7, 8, 9] },
    { id: 'harvest', months: [10, 11] },
  ],
  // An East Asian mountain year: four seasons plus the early-summer rains.
  monsoon: [
    { id: 'winter', months: [12, 1, 2] },
    { id: 'spring', months: [3, 4, 5] },
    { id: 'rainy', months: [6] },
    { id: 'summer', months: [7, 8] },
    { id: 'autumn', months: [9, 10, 11] },
  ],
  // An Amazon river town: the river rises and falls through the year.
  floodplain: [
    { id: 'high_water', months: [2, 3, 4, 5, 6, 7] },
    { id: 'low_water', months: [8, 9, 10, 11, 12, 1] },
  ],
}

export const SEASON_SET_IDS = Object.keys(SEASON_SETS) as SeasonSetId[]

// Every season id any set uses (shared content such as wildlife may name any).
export const ALL_SEASONS: readonly Season[] = [...new Set(SEASON_SET_IDS.flatMap((id) => SEASON_SETS[id].map((s) => s.id)))]

export function seasonOfDay(day: number, set: SeasonSetId = 'temperate'): Season {
  const { month } = calendarOf(day)
  const found = SEASON_SETS[set].find((s) => s.months.includes(month))
  if (!found) throw new Error(`season set "${set}" has no season for month ${month}`)
  return found.id
}
