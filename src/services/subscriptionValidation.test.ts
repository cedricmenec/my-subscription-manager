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

describe('validateSubscriptionInput - coherence rules', () => {
  it('accepte nextChargeDate avant nextRenewalDate', () => {
    const result = validateSubscriptionInput({
      name: 'Test',
      status: 'ACTIVE',
      renewalMode: 'AUTOMATIC',
      billingIntervalUnit: 'MONTH',
      billingIntervalCount: 1,
      renewalIntervalUnit: 'MONTH',
      renewalIntervalCount: 1,
      nextChargeDate: '2026-07-15',
      nextRenewalDate: '2026-08-01',
    })

    expect(result.isValid).toBe(true)
  })

  it('rejette nextChargeDate après nextRenewalDate quand les intervalles sont identiques', () => {
    const result = validateSubscriptionInput({
      name: 'Test',
      status: 'ACTIVE',
      renewalMode: 'AUTOMATIC',
      billingIntervalUnit: 'MONTH',
      billingIntervalCount: 1,
      renewalIntervalUnit: 'MONTH',
      renewalIntervalCount: 1,
      nextChargeDate: '2026-08-15',
      nextRenewalDate: '2026-08-01',
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.nextChargeDate).toContain('échéance')
  })

  it('rejette nextChargeDate après nextRenewalDate indépendamment des intervalles', () => {
    const result = validateSubscriptionInput({
      name: 'Test',
      status: 'ACTIVE',
      renewalMode: 'AUTOMATIC',
      billingIntervalUnit: 'MONTH',
      billingIntervalCount: 1,
      renewalIntervalUnit: 'YEAR',
      renewalIntervalCount: 1,
      nextChargeDate: '2026-08-15',
      nextRenewalDate: '2026-08-01',
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.nextChargeDate).toContain('échéance')
  })

  it('accepte les nouveaux champs subscriptionDate et renewalPeriodStartDate', () => {
    const result = validateSubscriptionInput({
      name: 'Test',
      status: 'ACTIVE',
      renewalMode: 'AUTOMATIC',
      subscriptionDate: '2026-01-15',
      renewalPeriodStartDate: '2026-06-15',
    })

    expect(result.isValid).toBe(true)
  })

  it('rejette les dates invalides pour subscriptionDate', () => {
    const result = validateSubscriptionInput({
      name: 'Test',
      status: 'ACTIVE',
      renewalMode: 'AUTOMATIC',
      subscriptionDate: '2026-02-30',
    })

    expect(result.isValid).toBe(false)
    expect(result.errors.subscriptionDate).toBeDefined()
  })
})
