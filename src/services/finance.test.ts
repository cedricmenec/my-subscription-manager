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
      currentPrice: 120.00,
      currency: 'EUR',
      billingIntervalUnit: 'YEAR' as const,
      billingIntervalCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 5,
    }

    expect(computeEquivalentMonthlyCost(subscription)).toBe(10)
    expect(computeEquivalentAnnualCost(subscription)).toBe(120)
  })

  it('projette les paiements futurs en respectant pause et fin de service', () => {
    const subscription = {
      id: 'sbs-2',
      name: 'Pause mensuelle',
      status: 'PAUSED' as const,
      renewalMode: 'AUTOMATIC' as const,
      currentPrice: 15.00,
      currency: 'EUR',
      billingIntervalUnit: 'MONTH' as const,
      billingIntervalCount: 1,
      nextChargeDate: '2026-02-01',
      pauseUntil: '2026-04-01',
      serviceEndDate: '2026-05-01',
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 5,
    }

    const projected = projectSubscriptionPayments(subscription, '2026-02-01', '2026-06-30')

    expect(projected.map(payment => payment.scheduledDate)).toEqual(['2026-04-01', '2026-05-01'])
  })

  it('projette douze échéances mensuelles par défaut', () => {
    const subscription = {
      id: 'sbs-monthly',
      name: 'Mensuel',
      status: 'ACTIVE' as const,
      renewalMode: 'AUTOMATIC' as const,
      currentPrice: 10,
      currency: 'EUR',
      billingIntervalUnit: 'MONTH' as const,
      billingIntervalCount: 1,
      commitmentIntervalUnit: 'YEAR' as const,
      commitmentIntervalCount: 1,
      nextChargeDate: '2026-08-15',
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 8,
    }

    const projected = projectSubscriptionPayments(subscription, '2026-07-30')

    expect(projected).toHaveLength(12)
    expect(projected[0].scheduledDate).toBe('2026-08-15')
    expect(projected[11].scheduledDate).toBe('2027-07-15')
  })

  it('limite une facturation annuelle à la prochaine échéance', () => {
    const subscription = {
      id: 'sbs-yearly',
      name: 'Annuel',
      status: 'ACTIVE' as const,
      renewalMode: 'AUTOMATIC' as const,
      currentPrice: 120,
      currency: 'EUR',
      billingIntervalUnit: 'YEAR' as const,
      billingIntervalCount: 1,
      nextChargeDate: '2026-09-01',
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 8,
    }

    expect(projectSubscriptionPayments(subscription, '2026-07-30').map(
      payment => payment.scheduledDate,
    )).toEqual(['2026-09-01'])
  })

  it('couvre les trois horizons de référence hors connexion', () => {
    const common = {
      status: 'ACTIVE' as const,
      currentPrice: 10,
      currency: 'EUR',
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 9,
    }
    const rolling = projectSubscriptionPayments({
      ...common,
      id: 'sbs-offline-rolling',
      name: 'Mensuel continu',
      renewalMode: 'ROLLING',
      billingIntervalUnit: 'MONTH',
      billingIntervalCount: 1,
      nextChargeDate: '2026-08-15',
      nextRenewalDate: '2026-08-15',
    }, '2026-07-30')
    const annualContract = projectSubscriptionPayments({
      ...common,
      id: 'sbs-offline-contract',
      name: 'Contrat annuel mensualisé',
      renewalMode: 'AUTOMATIC',
      billingIntervalUnit: 'MONTH',
      billingIntervalCount: 1,
      commitmentIntervalUnit: 'YEAR',
      commitmentIntervalCount: 1,
      nextChargeDate: '2026-08-15',
      nextRenewalDate: '2026-12-15',
    }, '2026-07-30')
    const yearly = projectSubscriptionPayments({
      ...common,
      id: 'sbs-offline-yearly',
      name: 'Facturation annuelle',
      renewalMode: 'ROLLING',
      billingIntervalUnit: 'YEAR',
      billingIntervalCount: 1,
      nextChargeDate: '2026-09-01',
    }, '2026-07-30')

    expect(rolling).toHaveLength(12)
    expect(annualContract.map(payment => payment.scheduledDate)).toEqual([
      '2026-08-15', '2026-09-15', '2026-10-15', '2026-11-15', '2026-12-15',
    ])
    expect(yearly).toHaveLength(1)
  })

  it('borne la projection au renouvellement inclus', () => {
    const subscription = {
      id: 'sbs-bounded',
      name: 'Mensuel borné',
      status: 'ACTIVE' as const,
      renewalMode: 'AUTOMATIC' as const,
      currentPrice: 10,
      currency: 'EUR',
      billingIntervalUnit: 'MONTH' as const,
      billingIntervalCount: 1,
      nextChargeDate: '2026-08-15',
      nextRenewalDate: '2026-12-15',
      commitmentIntervalUnit: 'YEAR' as const,
      commitmentIntervalCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 8,
    }

    expect(projectSubscriptionPayments(subscription, '2026-07-30').map(
      payment => payment.scheduledDate,
    )).toEqual([
      '2026-08-15',
      '2026-09-15',
      '2026-10-15',
      '2026-11-15',
      '2026-12-15',
    ])
  })

  it('calcule les agrégats financiers du lot 3', () => {
    const subscriptions = [
      {
        id: 'sbs-3',
        name: 'Mensuel',
        status: 'ACTIVE' as const,
        renewalMode: 'AUTOMATIC' as const,
        currentPrice: 10.00,
        currency: 'EUR',
        billingIntervalUnit: 'MONTH' as const,
        billingIntervalCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 5,
      },
    ]

    const payments = [
      {
        id: 'pmt-1',
        subscriptionId: 'sbs-3',
        scheduledDate: '2026-07-30',
        status: 'PROJECTED' as const,
        amount: { amount: 10.00, currency: 'EUR' },
        source: 'GENERATED' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 5,
      },
      {
        id: 'pmt-2',
        subscriptionId: 'sbs-3',
        scheduledDate: '2026-07-01',
        paidDate: '2026-07-01',
        status: 'CONFIRMED_PAID' as const,
        amount: { amount: 10.00, currency: 'EUR' },
        source: 'MANUAL' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 5,
      },
    ]

    const summary = buildFinancialSummary({
      subscriptions,
      payments,
      baseCurrency: 'EUR',
      referenceDate: '2026-07-26',
    })

    expect(summary.monthlyEquivalent).toBe(10)
    expect(summary.annualEquivalent).toBe(120)
    expect(summary.projected30).toBe(10)
    expect(summary.projected90).toBe(10)
    expect(summary.expensesYearToDate).toBe(10)
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
        currentPrice: 10.00,
        currency: 'USD',
        billingIntervalUnit: 'MONTH' as const,
        billingIntervalCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 5,
      },
    ]

    const summary = buildFinancialSummary({
      subscriptions,
      payments: [],
      baseCurrency: 'EUR',
      exchangeRates: { USD: 0.92 },
      referenceDate: '2026-07-26',
    })

    expect(summary.monthlyEquivalent).toBe(9.20)
    expect(summary.annualEquivalent).toBe(110.40)
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
        currentPrice: 10.00,
        currency: 'USD',
        billingIntervalUnit: 'MONTH' as const,
        billingIntervalCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 5,
      },
    ]

    const summary = buildFinancialSummary({
      subscriptions,
      payments: [],
      baseCurrency: 'EUR',
      referenceDate: '2026-07-26',
    })

    expect(summary.monthlyEquivalent).toBe(0)
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
        currentPrice: 10.00,
        currency: 'EUR',
        billingIntervalUnit: 'MONTH' as const,
        billingIntervalCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 5,
      },
      {
        id: 'sbs-usd',
        name: 'Mensuel USD',
        status: 'ACTIVE' as const,
        renewalMode: 'AUTOMATIC' as const,
        currentPrice: 20.00,
        currency: 'USD',
        billingIntervalUnit: 'MONTH' as const,
        billingIntervalCount: 1,
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 5,
      },
    ]

    const summary = buildFinancialSummary({
      subscriptions,
      payments: [],
      baseCurrency: 'EUR',
      exchangeRates: { USD: 0.92 },
      referenceDate: '2026-07-26',
    })

    // EUR: 10.00 + USD: 20.00 * 0.92 = 18.40 = 28.40
    expect(summary.monthlyEquivalent).toBe(28.40)
    expect(summary.includedSubscriptionCount).toBe(2)
    expect(summary.excludedCurrencySubscriptionCount).toBe(0)
  })

  it('convertit les paiements projetés USD dans les décaissements 30/90 jours', () => {
    const subscriptions = [
      {
        id: 'sbs-usd',
        name: 'Netflix USD',
        status: 'ACTIVE' as const,
        renewalMode: 'AUTOMATIC' as const,
        currentPrice: 15.00,
        currency: 'USD',
        billingIntervalUnit: 'MONTH' as const,
        billingIntervalCount: 1,
        nextChargeDate: '2026-08-15',
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 5,
      },
    ]

    const payments = [
      {
        id: 'pmt-usd-1',
        subscriptionId: 'sbs-usd',
        scheduledDate: '2026-08-15',
        status: 'PROJECTED' as const,
        amount: { amount: 15.00, currency: 'USD' },
        source: 'GENERATED' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 5,
      },
    ]

    const summary = buildFinancialSummary({
      subscriptions,
      payments,
      baseCurrency: 'EUR',
      exchangeRates: { USD: 0.92 },
      referenceDate: '2026-07-26',
    })

    // 15.00 USD * 0.92 = 13.80 EUR
    expect(summary.projected30).toBe(13.80)
    expect(summary.projected90).toBe(13.80)
    expect(summary.monthlyEquivalent).toBe(13.80)
  })

  it('ignore les paiements USD sans taux de conversion dans les décaissements', () => {
    const payments = [
      {
        id: 'pmt-usd-2',
        subscriptionId: 'sbs-usd',
        scheduledDate: '2026-08-15',
        status: 'PROJECTED' as const,
        amount: { amount: 15.00, currency: 'USD' },
        source: 'GENERATED' as const,
        createdAt: new Date(),
        updatedAt: new Date(),
        schemaVersion: 5,
      },
    ]

    const summary = buildFinancialSummary({
      subscriptions: [],
      payments,
      baseCurrency: 'EUR',
      referenceDate: '2026-07-26',
    })

    expect(summary.projected30).toBe(0)
    expect(summary.projected90).toBe(0)
  })
})
