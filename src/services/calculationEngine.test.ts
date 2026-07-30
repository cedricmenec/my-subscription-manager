import { describe, expect, it } from 'vitest'
import { createCalculationEngine, computeDefaultAlertForSub, computeNextRenewalDateForSub } from './calculationEngine'
import type { Subscription } from '../data/db'

describe('createCalculationEngine', () => {
  it('exécute les dépendances avant les calculateurs dépendants', async () => {
    const executionOrder: string[] = []

    const engine = createCalculationEngine({
      debounceMs: 0,
      database: {
        calculationState: {
          put: async () => undefined,
        },
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } as any,
      registry: [
        {
          id: 'base',
          dependsOn: [],
          run: async () => {
            executionOrder.push('base')
          },
        },
        {
          id: 'derived',
          dependsOn: ['base'],
          run: async () => {
            executionOrder.push('derived')
          },
        },
      ],
      logger: {
        log: () => undefined,
      },
    })

    await engine.run(['derived'])

    expect(executionOrder).toEqual(['base', 'derived'])
  })
})

describe('computeNextRenewalDateForSub - calcul de la date', () => {
  const base: Subscription = {
    id: 'sbs-test',
    name: 'Test',
    status: 'ACTIVE',
    renewalMode: 'AUTOMATIC',
    createdAt: new Date(),
    updatedAt: new Date(),
    schemaVersion: 8,
  }

  it('utilise renewalPeriodStartDate comme ancre prioritaire', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, renewalPeriodStartDate: '2026-06-15', subscriptionDate: '2025-01-15', renewalIntervalUnit: 'MONTH', renewalIntervalCount: 1 },
      '2026-07-29',
    )
    expect(result).toBe('2026-08-15')
  })

  it('utilise subscriptionDate en fallback si renewalPeriodStartDate absent', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, subscriptionDate: '2025-01-31', renewalIntervalUnit: 'YEAR', renewalIntervalCount: 1 },
      '2026-07-29',
    )
    expect(result).toBe('2027-01-31')
  })

  it('retourne undefined si aucune ancre', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, renewalIntervalUnit: 'MONTH', renewalIntervalCount: 1 },
      '2026-07-29',
    )
    expect(result).toBeUndefined()
  })

  it('retourne undefined si renewalMode est MANUAL', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, renewalMode: 'MANUAL', renewalPeriodStartDate: '2026-01-15', renewalIntervalUnit: 'MONTH', renewalIntervalCount: 1 },
      '2026-07-29',
    )
    expect(result).toBeUndefined()
  })

  it('gère un cycle personnalisé (2 mois)', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, renewalPeriodStartDate: '2026-01-15', renewalIntervalUnit: 'MONTH', renewalIntervalCount: 2 },
      '2026-07-29',
    )
    // 2026-01-15 + 2mois + 2mois + 2mois = 2026-07-15, puis +2mois = 2026-09-15
    expect(result).toBe('2026-09-15')
  })

  it('retourne undefined si renewalIntervalUnit absent (pas de fallback billing)', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, renewalPeriodStartDate: '2026-01-15', billingIntervalUnit: 'MONTH', billingIntervalCount: 1 },
      '2026-07-29',
    )
    expect(result).toBeUndefined()
  })
})

describe('computeNextRenewalDateForSub - règles d arrêt', () => {
  const base: Subscription = {
    id: 'sbs-test',
    name: 'Test',
    status: 'ACTIVE',
    renewalMode: 'AUTOMATIC',
    createdAt: new Date(),
    updatedAt: new Date(),
    schemaVersion: 8,
  }

  it('ENDED → undefined', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, status: 'ENDED', renewalPeriodStartDate: '2026-01-15' },
      '2026-07-29',
    )
    expect(result).toBeUndefined()
  })

  it('CANCELLED_PENDING_END avec serviceEndDate dépassée → undefined', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, status: 'CANCELLED_PENDING_END', serviceEndDate: '2026-07-15', renewalPeriodStartDate: '2026-01-15', renewalIntervalUnit: 'MONTH', renewalIntervalCount: 1 },
      '2026-07-29',
    )
    expect(result).toBeUndefined()
  })

  it('CANCELLED_PENDING_END avec serviceEndDate future → calculé normalement', () => {
    const result = computeNextRenewalDateForSub(
      { ...base, status: 'CANCELLED_PENDING_END', serviceEndDate: '2026-12-31', renewalPeriodStartDate: '2026-06-15', renewalIntervalUnit: 'MONTH', renewalIntervalCount: 1 },
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
    schemaVersion: 8,
  }

  it('mensuel → opt-in / 7j', () => {
    const result = computeDefaultAlertForSub(
      { ...base, renewalIntervalUnit: 'MONTH', renewalIntervalCount: 1 },
    )
    expect(result).toEqual({ notify: true, notifyDays: 7 })
  })

  it('annuel → opt-out / 30j', () => {
    const result = computeDefaultAlertForSub(
      { ...base, renewalIntervalUnit: 'YEAR', renewalIntervalCount: 1 },
    )
    expect(result).toEqual({ notify: false, notifyDays: 30 })
  })

  it('manuel → always / 7j', () => {
    const result = computeDefaultAlertForSub(
      { ...base, renewalMode: 'MANUAL' },
    )
    expect(result).toEqual({ notify: true, notifyDays: 7 })
  })

  it('valeurs utilisateur conservées', () => {
    const result = computeDefaultAlertForSub(
      { ...base, notifyBeforeRenewal: false, notifyBeforeRenewalDays: 14, renewalIntervalUnit: 'MONTH', renewalIntervalCount: 1 },
    )
    expect(result).toEqual({ notify: false, notifyDays: 14 })
  })
})
