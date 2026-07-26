import { describe, expect, it } from 'vitest'
import { addIntervalToCivilDate } from './civilDate'
import {
  buildFinancialSummary,
  computeEquivalentAnnualCost,
  computeEquivalentMonthlyCost,
  projectSubscriptionPayments,
  validateExchangeRate,
} from './finance'

describe('finance helpers', () => {
  it('préserve la logique de fin de mois', () => {
    expect(addIntervalToCivilDate('2026-01-31', 'MONTH', 1)).toBe('2026-02-28')
    expect(addIntervalToCivilDate('2028-01-31', 'MONTH', 1)).toBe('2028-02-29')
  })

  it('calcule les coûts mensuel et annuel équivalents', () => {
    const subscription = {
      id: 'sbs-1',
      name: 'Service annuel',
      status: 'ACTIVE' as const,
      renewalMode: 'AUTOMATIC' as const,
      currentPriceMinor: 12000,
      currency: 'EUR',
      billingIntervalUnit: 'YEAR' as const,
      billingIntervalCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 3,
    }

    expect(computeEquivalentMonthlyCost(subscription)).toBe(1000)
    expect(computeEquivalentAnnualCost(subscription)).toBe(12000)
  })

  it('projette les paiements futurs en respectant pause et fin de service', () => {
    const subscription = {
      id: 'sbs-2',
      name: 'Pause mensuelle',
      status: 'PAUSED' as const,
      renewalMode: 'AUTOMATIC' as const,
      currentPriceMinor: 1500,
      currency: 'EUR',
      billingIntervalUnit: 'MONTH' as const,
      billingIntervalCount: 1,
      nextChargeDate: '2026-02-01',
      pauseUntil: '2026-04-01',
      serviceEndDate: '2026-05-01',
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 3,
    }

    const projected = projectSubscriptionPayments(subscription, '2026-02-01', '2026-06-30')

    expect(projected.map(payment => payment.scheduledDate)).toEqual(['2026-04-01', '2026-05-01'])
  })

  it('calcule les agrégats financiers du lot 3', () => {
    const subscriptions = [
      {
        id: 'sbs-3',
        name: 'Mensuel',
        status: 'ACTIVE' as const,
        renewalMode: 'AUTOMATIC' as const,
        currentPriceMinor: 1000,
        currency: 'EUR',
        billingIntervalUnit: 'MONTH' as const,
        billingIntervalCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 3,
      },
    ]

    const payments = [
      {
        id: 'pmt-1',
        subscriptionId: 'sbs-3',
        scheduledDate: '2026-07-30',
        status: 'PROJECTED' as const,
        amount: { amountMinor: 1000, currency: 'EUR' },
        source: 'GENERATED' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 3,
      },
      {
        id: 'pmt-2',
        subscriptionId: 'sbs-3',
        scheduledDate: '2026-07-01',
        paidDate: '2026-07-01',
        status: 'CONFIRMED_PAID' as const,
        amount: { amountMinor: 1000, currency: 'EUR' },
        source: 'MANUAL' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 3,
      },
    ]

    const summary = buildFinancialSummary({
      subscriptions,
      payments,
      baseCurrency: 'EUR',
      referenceDate: '2026-07-26',
    })

    expect(summary.monthlyEquivalentMinor).toBe(1000)
    expect(summary.annualEquivalentMinor).toBe(12000)
    expect(summary.projected30Minor).toBe(1000)
    expect(summary.projected90Minor).toBe(1000)
    expect(summary.expensesYearToDateMinor).toBe(1000)
  })
})

describe('taux de conversion', () => {
  it('valide un taux correct', () => {
    const result = validateExchangeRate('USD', 0.92)
    expect(result.isValid).toBe(true)
    expect(result.errors).toEqual({})
  })

  it('rejette un code devise vide', () => {
    const result = validateExchangeRate('', 0.92)
    expect(result.isValid).toBe(false)
    expect(result.errors.currency).toBe('Le code devise est obligatoire.')
  })

  it('rejette un code devise de longueur incorrecte', () => {
    const result = validateExchangeRate('US', 0.92)
    expect(result.isValid).toBe(false)
    expect(result.errors.currency).toBe('Le code devise doit comporter 3 caractères (ex: USD).')
  })

  it('rejette un taux négatif', () => {
    const result = validateExchangeRate('USD', -0.5)
    expect(result.isValid).toBe(false)
    expect(result.errors.rate).toBe('Le taux doit être un nombre strictement positif.')
  })

  it('rejette un taux nul', () => {
    const result = validateExchangeRate('USD', 0)
    expect(result.isValid).toBe(false)
    expect(result.errors.rate).toBe('Le taux doit être un nombre strictement positif.')
  })

  it('convertit un abonnement USD en EUR dans buildFinancialSummary', () => {
    const subscriptions = [
      {
        id: 'sbs-usd',
        name: 'Service USD',
        status: 'ACTIVE' as const,
        renewalMode: 'AUTOMATIC' as const,
        currentPriceMinor: 1000,
        currency: 'USD',
        billingIntervalUnit: 'MONTH' as const,
        billingIntervalCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 3,
      },
    ]

    const summary = buildFinancialSummary({
      subscriptions,
      payments: [],
      baseCurrency: 'EUR',
      exchangeRates: { USD: 0.92 },
      referenceDate: '2026-07-26',
    })

    expect(summary.monthlyEquivalentMinor).toBe(920)
    expect(summary.annualEquivalentMinor).toBe(11040)
    expect(summary.includedSubscriptionCount).toBe(1)
    expect(summary.excludedCurrencySubscriptionCount).toBe(0)
    expect(summary.excludedSubscriptions).toHaveLength(0)
  })

  it('exclut un abonnement USD si aucun taux configuré', () => {
    const subscriptions = [
      {
        id: 'sbs-usd',
        name: 'Service USD',
        status: 'ACTIVE' as const,
        renewalMode: 'AUTOMATIC' as const,
        currentPriceMinor: 1000,
        currency: 'USD',
        billingIntervalUnit: 'MONTH' as const,
        billingIntervalCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 3,
      },
    ]

    const summary = buildFinancialSummary({
      subscriptions,
      payments: [],
      baseCurrency: 'EUR',
      referenceDate: '2026-07-26',
    })

    expect(summary.monthlyEquivalentMinor).toBe(0)
    expect(summary.includedSubscriptionCount).toBe(0)
    expect(summary.excludedCurrencySubscriptionCount).toBe(1)
    expect(summary.excludedSubscriptions).toHaveLength(1)
    expect(summary.excludedSubscriptions[0].id).toBe('sbs-usd')
    expect(summary.excludedSubscriptions[0].reason).toContain('USD')
  })

  it('mélange EUR et USD converti dans les totaux', () => {
    const subscriptions = [
      {
        id: 'sbs-eur',
        name: 'Mensuel EUR',
        status: 'ACTIVE' as const,
        renewalMode: 'AUTOMATIC' as const,
        currentPriceMinor: 1000,
        currency: 'EUR',
        billingIntervalUnit: 'MONTH' as const,
        billingIntervalCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 3,
      },
      {
        id: 'sbs-usd',
        name: 'Mensuel USD',
        status: 'ACTIVE' as const,
        renewalMode: 'AUTOMATIC' as const,
        currentPriceMinor: 2000,
        currency: 'USD',
        billingIntervalUnit: 'MONTH' as const,
        billingIntervalCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 3,
      },
    ]

    const summary = buildFinancialSummary({
      subscriptions,
      payments: [],
      baseCurrency: 'EUR',
      exchangeRates: { USD: 0.92 },
      referenceDate: '2026-07-26',
    })

    // EUR: 1000 + USD: 2000 * 0.92 = 1840 = 2840
    expect(summary.monthlyEquivalentMinor).toBe(2840)
    expect(summary.includedSubscriptionCount).toBe(2)
    expect(summary.excludedCurrencySubscriptionCount).toBe(0)
  })
})