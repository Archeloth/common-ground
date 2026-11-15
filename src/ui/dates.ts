import { calendarOf } from '../game/calendar'
import { t } from './i18n'

// "Year 1 · March 12" for an in-game day (Milestone 8.5: time reads as year,
// month and day). The calendar maths lives in src/game/calendar.ts.
export function formatGameDate(day: number): string {
  const { year, month, dayOfMonth } = calendarOf(day)
  return t('topbar.date', { year, month: t(`calendar.month.${month}`), day: dayOfMonth })
}
