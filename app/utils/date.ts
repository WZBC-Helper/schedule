import type { Weekday } from '../types/schedule'

const DAY_MS = 24 * 60 * 60 * 1000

export function parseLocalDate(value: string): Date {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value)
  if (!match) {
    throw new Error(`无效日期：${value}`)
  }

  const [, year, month, day] = match
  return new Date(Number(year), Number(month) - 1, Number(day), 12)
}

export function toDateKey(date: Date): string {
  const year = date.getFullYear()
  const month = String(date.getMonth() + 1).padStart(2, '0')
  const day = String(date.getDate()).padStart(2, '0')
  return `${year}-${month}-${day}`
}

export function addDays(date: Date, amount: number): Date {
  const result = new Date(date)
  result.setDate(result.getDate() + amount)
  return result
}

export function getMondayBasedWeekday(date: Date): Weekday {
  const day = date.getDay()
  return (day === 0 ? 7 : day) as Weekday
}

export function getWeekDates(termStart: string, week: number): Date[] {
  const monday = addDays(parseLocalDate(termStart), (week - 1) * 7)
  return Array.from({ length: 7 }, (_, index) => addDays(monday, index))
}

export function calculateAcademicWeek(
  termStart: string,
  date: Date,
  totalWeeks: number,
): number | null {
  const start = parseLocalDate(termStart)
  const normalized = new Date(date.getFullYear(), date.getMonth(), date.getDate(), 12)
  const difference = Math.floor((normalized.getTime() - start.getTime()) / DAY_MS)
  const week = Math.floor(difference / 7) + 1
  return week >= 1 && week <= totalWeeks ? week : null
}

export function isSameDate(left: Date, right: Date): boolean {
  return toDateKey(left) === toDateKey(right)
}

export function formatFullChineseDate(date: Date): string {
  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: 'long',
    day: 'numeric',
    weekday: 'long',
  }).format(date)
}

export function formatMonthDay(date: Date): string {
  return `${date.getMonth() + 1}/${date.getDate()}`
}
