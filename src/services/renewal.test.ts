import { describe, expect, it } from 'vitest'
import {
  hasEngagement,
  normalizeSubscriptionContinuation,
} from './renewal'

describe('renewal invariants', () => {
  it('hasEngagement est vrai quand commitmentIntervalUnit/Count sont definis', () => {
    expect(hasEngagement({
      commitmentIntervalUnit: 'MONTH',
      commitmentIntervalCount: 1,
    })).toBe(true)

    expect(hasEngagement({
      commitmentIntervalUnit: 'YEAR',
      commitmentIntervalCount: 1,
    })).toBe(true)
  })

  it('hasEngagement est faux quand commitmentIntervalUnit/Count sont absents', () => {
    expect(hasEngagement({})).toBe(false)
    expect(hasEngagement({
      commitmentIntervalUnit: undefined,
      commitmentIntervalCount: undefined,
    })).toBe(false)
    expect(hasEngagement({
      commitmentIntervalUnit: 'MONTH',
    })).toBe(false)
  })

  it('nettoie nextRenewalDate et notify pour ROLLING', () => {
    const normalized = normalizeSubscriptionContinuation({
      renewalMode: 'ROLLING' as const,
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

  it('conserve nextRenewalDate et notify pour AUTOMATIC', () => {
    const normalized = normalizeSubscriptionContinuation({
      renewalMode: 'AUTOMATIC' as const,
      commitmentIntervalUnit: 'YEAR' as const,
      commitmentIntervalCount: 1,
      nextRenewalDate: '2027-03-01',
      notifyBeforeRenewal: false,
      notifyBeforeRenewalDays: 30,
      billingIntervalUnit: 'YEAR' as const,
    })

    expect(normalized).toEqual({
      renewalMode: 'AUTOMATIC',
      commitmentIntervalUnit: 'YEAR',
      commitmentIntervalCount: 1,
      nextRenewalDate: '2027-03-01',
      notifyBeforeRenewal: false,
      notifyBeforeRenewalDays: 30,
      billingIntervalUnit: 'YEAR',
    })
  })
})
