import { describe, expect, it } from 'vitest'
import {
  isValidCivilDate,
  validateStatusTransition,
  validateSubscriptionInput,
} from './subscriptionValidation'

describe('validateSubscriptionInput', () => {
  it('retourne des erreurs quand les champs obligatoires sont absents', () => {
    const result = validateSubscriptionInput({
      name: '   ',
      status: 'UNKNOWN',
      renewalMode: 'UNKNOWN',
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.name).toContain('obligatoire')
  })

  it('rejette les dates civiles invalides pour pause et fin de service', () => {
    const paused = validateSubscriptionInput({
      name: 'Netflix',
      status: 'PAUSED',
      renewalMode: 'AUTOMATIC',
      pauseUntil: '2026-02-31',
    })

    const cancelled = validateSubscriptionInput({
      name: 'Spotify',
      status: 'CANCELLED_PENDING_END',
      renewalMode: 'MANUAL',
      serviceEndDate: '2026-99-02',
    })

    expect(paused.errors.pauseUntil).toBeDefined()
    expect(cancelled.errors.serviceEndDate).toBeDefined()
  })
})

describe('validateStatusTransition', () => {
  it('accepte une transition ACTIVE -> PAUSED', () => {
    expect(validateStatusTransition('ACTIVE', 'PAUSED')).toBe(true)
  })

  it('rejette une transition ENDED -> ACTIVE', () => {
    expect(validateStatusTransition('ENDED', 'ACTIVE')).toBe(false)
  })
})

describe('isValidCivilDate', () => {
  it('accepte une date civile valide et rejette une date impossible', () => {
    expect(isValidCivilDate('2026-07-26')).toBe(true)
    expect(isValidCivilDate('2026-02-30')).toBe(false)
  })
})
