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
