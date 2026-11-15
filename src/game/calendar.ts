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

// Seasons by calendar month (northern hemisphere): spring March-May, summer
// June-August, autumn September-November, winter December-February. Purely
// visual: the simulation does not change with the season.
export type Season = 'spring' | 'summer' | 'autumn' | 'winter'

export function seasonOfDay(day: number): Season {
  const { month } = calendarOf(day)
  if (month >= 3 && month <= 5) return 'spring'
  if (month >= 6 && month <= 8) return 'summer'
  if (month >= 9 && month <= 11) return 'autumn'
  return 'winter'
}
