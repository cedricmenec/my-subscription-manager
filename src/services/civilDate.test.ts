import { describe, expect, it } from 'vitest'
import {
  findFirstOccurrenceOnOrAfter,
  occurrenceFromCivilDateAnchor,
} from './civilDate'

describe('civil date recurrence', () => {
  it('calcule chaque occurrence depuis le jour d’ancrage', () => {
    expect(occurrenceFromCivilDateAnchor('2026-01-30', 'MONTH', 1, 1)).toBe('2026-02-28')
    expect(occurrenceFromCivilDateAnchor('2026-01-30', 'MONTH', 1, 2)).toBe('2026-03-30')
  })

  it('conserve une vraie fin de mois', () => {
    expect(occurrenceFromCivilDateAnchor('2026-01-31', 'MONTH', 1, 1)).toBe('2026-02-28')
    expect(occurrenceFromCivilDateAnchor('2026-01-31', 'MONTH', 1, 2)).toBe('2026-03-31')
  })

  it('retrouve le 29 février lors de la prochaine année bissextile', () => {
    expect(occurrenceFromCivilDateAnchor('2024-02-29', 'YEAR', 1, 1)).toBe('2025-02-28')
    expect(occurrenceFromCivilDateAnchor('2024-02-29', 'YEAR', 1, 4)).toBe('2028-02-29')
  })

  it('applique une convention supérieure ou égale', () => {
    expect(findFirstOccurrenceOnOrAfter('2026-01-15', 'MONTH', 1, '2026-07-15')).toEqual({
      date: '2026-07-15',
      occurrenceIndex: 6,
    })
    expect(findFirstOccurrenceOnOrAfter('2026-01-15', 'MONTH', 1, '2026-07-16')).toEqual({
      date: '2026-08-15',
      occurrenceIndex: 7,
    })
  })

  it('retourne directement une ancre future', () => {
    expect(findFirstOccurrenceOnOrAfter('2026-09-01', 'MONTH', 1, '2026-07-30')).toEqual({
      date: '2026-09-01',
      occurrenceIndex: 0,
    })
  })
})
