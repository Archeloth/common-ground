import { describe, expect, it } from 'vitest'
import { calendarOf, MONTHS_PER_YEAR } from './calendar'
import { TICKS_PER_MONTH } from './constants'

// One tick is one in-game day; 30 days = 1 month; 12 months = 1 year.

describe('calendarOf (year - month - day)', () => {
  it('starts at year 1, month 1, day 1', () => {
    expect(calendarOf(1)).toEqual({ year: 1, month: 1, dayOfMonth: 1 })
  })

  it('rolls the day of the month at the month boundary', () => {
    expect(calendarOf(TICKS_PER_MONTH)).toEqual({ year: 1, month: 1, dayOfMonth: TICKS_PER_MONTH })
    expect(calendarOf(TICKS_PER_MONTH + 1)).toEqual({ year: 1, month: 2, dayOfMonth: 1 })
  })

  it('rolls the month at the year boundary', () => {
    const lastOfYear = TICKS_PER_MONTH * MONTHS_PER_YEAR
    expect(calendarOf(lastOfYear)).toEqual({ year: 1, month: MONTHS_PER_YEAR, dayOfMonth: TICKS_PER_MONTH })
    expect(calendarOf(lastOfYear + 1)).toEqual({ year: 2, month: 1, dayOfMonth: 1 })
  })

  it('handles a deep calendar (year 3) deterministically', () => {
    const deep = calendarOf(2 * TICKS_PER_MONTH * MONTHS_PER_YEAR + 15)
    expect(deep.year).toBe(3)
    expect(deep.month).toBe(1)
    expect(deep.dayOfMonth).toBe(15) // 734 days elapsed, 14 into year 3
  })

  it('is total: any positive day maps inside the ranges', () => {
    for (const day of [1, 2, 30, 31, 359, 360, 361, 720, 721, 5000]) {
      const date = calendarOf(day)
      expect(date.year, String(day)).toBeGreaterThanOrEqual(1)
      expect(date.month, String(day)).toBeGreaterThanOrEqual(1)
      expect(date.month, String(day)).toBeLessThanOrEqual(MONTHS_PER_YEAR)
      expect(date.dayOfMonth, String(day)).toBeGreaterThanOrEqual(1)
      expect(date.dayOfMonth, String(day)).toBeLessThanOrEqual(TICKS_PER_MONTH)
    }
  })
})