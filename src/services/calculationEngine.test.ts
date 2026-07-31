import { describe, expect, it } from 'vitest'
import { type Subscription } from '../data/db'
import { computeDefaultAlertForSub, computeNextRenewalDateForSub } from './calculationEngine'

describe('computeNextRenewalDateForSub - calcul de la date', () => {
  const base: Subscription = {
    id: 'sbs-test',
    name: 'Test',
    status: 'ACTIVE',
    renewalMode: 'AUTOMATIC',
    createdAt: new Date(),
    updatedAt: new Date(),
    schemaVersion: 10,
  }

  it('utilise commitmentStartDate comme ancre prioritaire', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, commitmentStartDate: '2026-06-15', subscriptionDate: '2025-01-15', commitmentIntervalUnit: 'MONTH', commitmentIntervalCount: 1 },
      '2026-07-29',
    )
    expect(result).toBe('2026-08-15')
  })

  it('utilise subscriptionDate en fallback si commitmentStartDate absent', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, subscriptionDate: '2025-01-31', commitmentIntervalUnit: 'YEAR', commitmentIntervalCount: 1 },
      '2026-07-29',
    )
    expect(result).toBe('2027-01-31')
  })

  it('retourne undefined si aucune ancre', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, commitmentIntervalUnit: 'MONTH', commitmentIntervalCount: 1 },
      '2026-07-29',
    )
    expect(result).toBeUndefined()
  })

  it('retourne undefined si renewalMode n est pas AUTOMATIC', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, renewalMode: 'ROLLING', commitmentStartDate: '2026-01-15', commitmentIntervalUnit: 'MONTH', commitmentIntervalCount: 1 },
      '2026-07-29',
    )
    expect(result).toBeUndefined()
  })

  it('retourne undefined si pas de commitmentIntervalUnit', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, commitmentStartDate: '2026-01-15' },
      '2026-07-29',
    )
    expect(result).toBeUndefined()
  })

  it('gere un cycle personnalise (2 mois)', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, commitmentStartDate: '2026-01-15', commitmentIntervalUnit: 'MONTH', commitmentIntervalCount: 2 },
      '2026-07-29',
    )
    // 2026-01-15 + 2mois + 2mois + 2mois = 2026-07-15, puis +2mois = 2026-09-15
    expect(result).toBe('2026-09-15')
  })

  it('ne calcule aucune date pour ROLLING', () => {
    expect(computeNextRenewalDateForSub({
      ...base,
      renewalMode: 'ROLLING',
      commitmentStartDate: '2026-01-15',
      commitmentIntervalUnit: 'MONTH',
      commitmentIntervalCount: 1,
      nextRenewalDate: '2026-08-15',
    }, '2026-07-29')).toBeUndefined()
  })

  it('ne derive pas vers la fin de mois apres fevrier', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, commitmentStartDate: '2026-01-30', commitmentIntervalUnit: 'MONTH', commitmentIntervalCount: 1 },
      '2026-03-01',
    )
    expect(result).toBe('2026-03-30')
  })

  it('retourne undefined si commitmentIntervalUnit absent (pas de fallback billing)', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, commitmentStartDate: '2026-01-15', billingIntervalUnit: 'MONTH', billingIntervalCount: 1 },
      '2026-07-29',
    )
    expect(result).toBeUndefined()
  })

  it('engagement annuel/annuel calcule comme tout engagement', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, commitmentStartDate: '2026-03-01', commitmentIntervalUnit: 'YEAR', commitmentIntervalCount: 1, billingIntervalUnit: 'YEAR', billingIntervalCount: 1 },
      '2026-07-29',
    )
    expect(result).toBe('2027-03-01')
  })
})

describe('computeNextRenewalDateForSub - regles d arret', () => {
  const base: Subscription = {
    id: 'sbs-test',
    name: 'Test',
    status: 'ACTIVE',
    renewalMode: 'AUTOMATIC',
    createdAt: new Date(),
    updatedAt: new Date(),
    schemaVersion: 10,
    commitmentIntervalUnit: 'MONTH',
    commitmentIntervalCount: 1,
  }

  it('ENDED > undefined', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, status: 'ENDED', commitmentStartDate: '2026-01-15' },
      '2026-07-29',
    )
    expect(result).toBeUndefined()
  })

  it('CANCELLED_PENDING_END avec serviceEndDate depassee > undefined', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, status: 'CANCELLED_PENDING_END', serviceEndDate: '2026-07-15', commitmentStartDate: '2026-01-15', commitmentIntervalUnit: 'MONTH', commitmentIntervalCount: 1 },
      '2026-07-29',
    )
    expect(result).toBeUndefined()
  })

  it('CANCELLED_PENDING_END avec serviceEndDate future > calcule normalement', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, status: 'CANCELLED_PENDING_END', serviceEndDate: '2026-12-31', commitmentStartDate: '2026-06-15', commitmentIntervalUnit: 'MONTH', commitmentIntervalCount: 1 },
      '2026-07-29',
    )
    expect(result).toBe('2026-08-15')
  })
})

describe('computeDefaultAlertForSub', () => {
  const base: Subscription = {
    id: 'sbs-test',
    name: 'Test',
    status: 'ACTIVE',
    renewalMode: 'AUTOMATIC',
    createdAt: new Date(),
    updatedAt: new Date(),
    schemaVersion: 10,
    commitmentIntervalUnit: 'MONTH',
    commitmentIntervalCount: 1,
  }

  it('mensuel > opt-in / 7j', () => {
    const result = computeDefaultAlertForSub(base)
    expect(result).toEqual({ notify: true, notifyDays: 7 })
  })

  it('annuel > opt-out / 30j', () => {
    const result = computeDefaultAlertForSub(
      { ...base, commitmentIntervalUnit: 'YEAR', commitmentIntervalCount: 1 },
    )
    expect(result).toEqual({ notify: false, notifyDays: 30 })
  })

  it('pas d engagement > alertes nettoiees', () => {
    const result = computeDefaultAlertForSub(
      { ...base, renewalMode: 'ROLLING', commitmentIntervalUnit: undefined, commitmentIntervalCount: undefined },
    )
    expect(result).toEqual({ notify: undefined, notifyDays: undefined })
  })

  it('valeurs utilisateur conservees', () => {
    const result = computeDefaultAlertForSub(
      { ...base, notifyBeforeRenewal: false, notifyBeforeRenewalDays: 14, commitmentIntervalUnit: 'MONTH', commitmentIntervalCount: 1 },
    )
    expect(result).toEqual({ notify: false, notifyDays: 14 })
  })

  it('nettoie les alertes pour une reconduction continue', () => {
    const result = computeDefaultAlertForSub({
      ...base,
      renewalMode: 'ROLLING',
      commitmentIntervalUnit: undefined,
      commitmentIntervalCount: undefined,
      notifyBeforeRenewal: true,
      notifyBeforeRenewalDays: 7,
    })
    expect(result).toEqual({ notify: undefined, notifyDays: undefined })
  })
})
