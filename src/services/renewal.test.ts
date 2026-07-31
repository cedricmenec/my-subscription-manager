import { describe, expect, it } from 'vitest'
import {
  hasDistinctContractualRenewal,
  isDeterministicLegacyRolling,
  normalizeSubscriptionContinuation,
} from './renewal'

describe('renewal invariants', () => {
  it('reconnaît uniquement un cas legacy déterministe non annuel', () => {
    expect(isDeterministicLegacyRolling({
      renewalMode: 'AUTOMATIC',
      billingIntervalUnit: 'MONTH',
      billingIntervalCount: 1,
      renewalIntervalUnit: 'MONTH',
      renewalIntervalCount: 1,
      nextChargeDate: '2026-08-15',
      nextRenewalDate: '2026-08-15',
    })).toBe(true)

    expect(isDeterministicLegacyRolling({
      renewalMode: 'AUTOMATIC',
      billingIntervalUnit: 'YEAR',
      renewalIntervalUnit: 'YEAR',
      nextChargeDate: '2026-08-15',
      nextRenewalDate: '2026-08-15',
    })).toBe(false)
  })

  it('distingue un renouvellement annuel d’une ancienne mensualisation identique', () => {
    expect(hasDistinctContractualRenewal({
      renewalMode: 'AUTOMATIC',
      billingIntervalUnit: 'MONTH',
      renewalIntervalUnit: 'YEAR',
    })).toBe(true)
    expect(hasDistinctContractualRenewal({
      renewalMode: 'AUTOMATIC',
      billingIntervalUnit: 'MONTH',
      renewalIntervalUnit: 'MONTH',
    })).toBe(false)
  })

  it('nettoie tous les champs contractuels incompatibles de ROLLING', () => {
    const normalized = normalizeSubscriptionContinuation({
      renewalMode: 'ROLLING' as const,
      renewalIntervalUnit: 'MONTH' as const,
      renewalIntervalCount: 1,
      renewalPeriodStartDate: '2026-01-01',
      nextRenewalDate: '2026-08-01',
      notifyBeforeRenewal: true,
      notifyBeforeRenewalDays: 7,
      billingIntervalUnit: 'MONTH' as const,
    })

    expect(normalized).toEqual({
      renewalMode: 'ROLLING',
      billingIntervalUnit: 'MONTH',
    })
  })
})
