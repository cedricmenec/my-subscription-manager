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

export function occurrenceFromCivilDateAnchor(
  anchor: string,
  unit: IntervalUnit,
  count: number,
  occurrenceIndex: number,
): CivilDate {
  if (!Number.isInteger(count) || count <= 0) {
    throw new Error('Le nombre d’unités doit être un entier strictement positif.')
  }

  if (!Number.isInteger(occurrenceIndex) || occurrenceIndex < 0) {
    throw new Error('L’index d’occurrence doit être un entier positif ou nul.')
  }

  const stepCount = count * occurrenceIndex
  if (unit === 'DAY') {
    return addDaysToCivilDate(anchor, stepCount)
  }

  if (unit === 'WEEK') {
    return addDaysToCivilDate(anchor, stepCount * 7)
  }

  const parsedAnchor = parseCivilDate(anchor)
  const originalDay = parsedAnchor.getUTCDate()
  const preserveEndOfMonth = isLastDayOfMonth(anchor)

  if (unit === 'MONTH') {
    return createShiftedMonthDate(
      parsedAnchor.getUTCFullYear(),
      parsedAnchor.getUTCMonth() + stepCount,
      originalDay,
      preserveEndOfMonth,
    )
  }

  return createShiftedMonthDate(
    parsedAnchor.getUTCFullYear() + stepCount,
    parsedAnchor.getUTCMonth(),
    originalDay,
    preserveEndOfMonth,
  )
}

export function findFirstOccurrenceOnOrAfter(
  anchor: string,
  unit: IntervalUnit,
  count: number,
  referenceDate: string,
): { date: CivilDate; occurrenceIndex: number } {
  let occurrenceIndex = 0
  let date = occurrenceFromCivilDateAnchor(anchor, unit, count, occurrenceIndex)

  while (compareCivilDates(date, referenceDate) < 0) {
    occurrenceIndex += 1
    date = occurrenceFromCivilDateAnchor(anchor, unit, count, occurrenceIndex)
  }

  return { date, occurrenceIndex }
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
