import { type IntervalUnit } from '../data/db'

export type CivilDate = `${number}-${number}-${number}`

export function todayCivilDate(referenceDate: Date = new Date()): CivilDate {
  return formatCivilDate(referenceDate)
}

export function parseCivilDate(value: string): Date {
  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)
  return new Date(Date.UTC(year, month - 1, day))
}

export function formatCivilDate(value: Date): CivilDate {
  const year = value.getUTCFullYear()
  const month = String(value.getUTCMonth() + 1).padStart(2, '0')
  const day = String(value.getUTCDate()).padStart(2, '0')
  return `${year}-${month}-${day}` as CivilDate
}

export function compareCivilDates(left: string, right: string): number {
  return left.localeCompare(right)
}

export function addDaysToCivilDate(value: string, days: number): CivilDate {
  const nextDate = parseCivilDate(value)
  nextDate.setUTCDate(nextDate.getUTCDate() + days)
  return formatCivilDate(nextDate)
}

export function addIntervalToCivilDate(
  value: string,
  unit: IntervalUnit,
  count: number,
): CivilDate {
  if (unit === 'DAY') {
    return addDaysToCivilDate(value, count)
  }

  if (unit === 'WEEK') {
    return addDaysToCivilDate(value, count * 7)
  }

  const current = parseCivilDate(value)
  const preserveEndOfMonth = isLastDayOfMonth(value)
  const originalDay = current.getUTCDate()

  if (unit === 'MONTH') {
    const targetYear = current.getUTCFullYear()
    const targetMonthIndex = current.getUTCMonth() + count
    return createShiftedMonthDate(targetYear, targetMonthIndex, originalDay, preserveEndOfMonth)
  }

  const targetYear = current.getUTCFullYear() + count
  const targetMonthIndex = current.getUTCMonth()
  return createShiftedMonthDate(targetYear, targetMonthIndex, originalDay, preserveEndOfMonth)
}

export function isLastDayOfMonth(value: string): boolean {
  const parsed = parseCivilDate(value)
  return parsed.getUTCDate() === getLastDayOfMonth(parsed.getUTCFullYear(), parsed.getUTCMonth())
}

function createShiftedMonthDate(
  year: number,
  monthIndex: number,
  originalDay: number,
  preserveEndOfMonth: boolean,
): CivilDate {
  const normalizedYear = year + Math.floor(monthIndex / 12)
  const normalizedMonthIndex = ((monthIndex % 12) + 12) % 12
  const lastDay = getLastDayOfMonth(normalizedYear, normalizedMonthIndex)
  const nextDay = preserveEndOfMonth ? lastDay : Math.min(originalDay, lastDay)
  return formatCivilDate(new Date(Date.UTC(normalizedYear, normalizedMonthIndex, nextDay)))
}

function getLastDayOfMonth(year: number, monthIndex: number): number {
  return new Date(Date.UTC(year, monthIndex + 1, 0)).getUTCDate()
}