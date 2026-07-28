import {
  type IntervalUnit,
  type LegacyBillingInterval,
  type Payment,
  type PaymentStatus,
  type Subscription,
} from '../data/db'
import {
  addDaysToCivilDate,
  addIntervalToCivilDate,
  compareCivilDates,
  todayCivilDate,
} from './civilDate'
import { isValidCivilDate } from './subscriptionValidation'

export interface ProjectedPaymentDraft {
  subscriptionId: string
  scheduledDate: string
  status: PaymentStatus
  amount: {
    amount: number
    currency: string
  }
}

export interface ExcludedSubscriptionInfo {
  id: string
  reason: string
}

export function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : undefined
}

export interface FinancialSummary {
  baseCurrency: string
  monthlyEquivalent: number
  annualEquivalent: number
  projected30: number
  projected90: number
  expensesYearToDate: number
  includedSubscriptionCount: number
  excludedCurrencySubscriptionCount: number
  excludedSubscriptions: ExcludedSubscriptionInfo[]
}

export interface ExchangeRateValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export function validateExchangeRate(currency: string, rate: number): ExchangeRateValidationResult {
  const errors: Record<string, string> = {}

  if (!currency || currency.trim().length === 0) {
    errors.currency = 'Le code devise est obligatoire.'
  } else if (currency.trim().length !== 3) {
    errors.currency = 'Le code devise doit comporter 3 caractères (ex: USD).'
  }

  if (typeof rate !== 'number' || !Number.isFinite(rate)) {
    errors.rate = 'Le taux doit être un nombre valide.'
  } else if (rate <= 0) {
    errors.rate = 'Le taux doit être un nombre strictement positif.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

export function computeEquivalentMonthlyCost(subscription: Subscription): number | undefined {
  const interval = resolveBillingInterval(subscription)
  const price = subscription.currentPrice

  if (typeof price !== 'number' || !interval) {
    return undefined
  }

  const months = intervalToMonths(interval.unit, interval.count)

  if (!months || months <= 0) {
    return undefined
  }

  return Math.round((price / months) * 100) / 100
}

export function computeEquivalentAnnualCost(subscription: Subscription): number | undefined {
  const monthlyCost = computeEquivalentMonthlyCost(subscription)
  return typeof monthlyCost === 'number' ? monthlyCost * 12 : undefined
}

export function projectSubscriptionPayments(
  subscription: Subscription,
  windowStart: string,
  windowEnd: string,
): ProjectedPaymentDraft[] {
  const interval = resolveBillingInterval(subscription)

  if (!interval || !canProjectSubscription(subscription, interval)) {
    return []
  }

  const projected: ProjectedPaymentDraft[] = []
  const stepUnit = interval.unit
  const stepCount = interval.count
  const price = subscription.currentPrice
  const currency = subscription.currency as string
  let candidateDate = subscription.nextChargeDate as string

  if (typeof price !== 'number') {
    return []
  }

  const amount = price

  if (subscription.status === 'PAUSED') {
    if (!subscription.pauseUntil) {
      return []
    }

    while (compareCivilDates(candidateDate, subscription.pauseUntil) < 0) {
      candidateDate = addIntervalToCivilDate(candidateDate, stepUnit, stepCount)
    }
  }

  while (compareCivilDates(candidateDate, windowEnd) <= 0) {
    if (subscription.serviceEndDate && compareCivilDates(candidateDate, subscription.serviceEndDate) > 0) {
      break
    }

    if (compareCivilDates(candidateDate, windowStart) >= 0) {
      projected.push({
        subscriptionId: subscription.id,
        scheduledDate: candidateDate,
        status: 'PROJECTED',
        amount: {
          amount,
          currency,
        },
      })
    }

    candidateDate = addIntervalToCivilDate(candidateDate, stepUnit, stepCount)
  }

  return projected
}

export function buildFinancialSummary(options: {
  subscriptions: Subscription[]
  payments: Payment[]
  baseCurrency: string
  referenceDate?: string
  exchangeRates?: Record<string, number>
}): FinancialSummary {
  const referenceDate = options.referenceDate ?? todayCivilDate()
  const yearStart = `${referenceDate.slice(0, 4)}-01-01`
  const day30 = addDaysToCivilDate(referenceDate, 30)
  const day90 = addDaysToCivilDate(referenceDate, 90)

  let monthlyEquivalent = 0
  let annualEquivalent = 0
  let includedSubscriptionCount = 0
  let excludedCurrencySubscriptionCount = 0
  const excludedSubscriptions: ExcludedSubscriptionInfo[] = []

  for (const subscription of options.subscriptions) {
    if (!isRecurringCostEligible(subscription)) {
      continue
    }

    if (!subscription.currency) {
      excludedSubscriptions.push({ id: subscription.id, reason: 'Aucune devise définie' })
      excludedCurrencySubscriptionCount += 1
      continue
    }

    const rate = options.exchangeRates?.[subscription.currency]

    if (subscription.currency !== options.baseCurrency && !rate) {
      excludedSubscriptions.push({
        id: subscription.id,
        reason: `Devise ${subscription.currency} non convertible (aucun taux configuré)`,
      })
      excludedCurrencySubscriptionCount += 1
      continue
    }

    const monthlyCost = computeEquivalentMonthlyCost(subscription)
    const annualCost = computeEquivalentAnnualCost(subscription)

    if (typeof monthlyCost === 'number' && typeof annualCost === 'number') {
      const convertedMonthly = rate ? Math.round(monthlyCost * rate * 100) / 100 : monthlyCost
      const convertedAnnual = rate ? Math.round(annualCost * rate * 100) / 100 : annualCost

      monthlyEquivalent += convertedMonthly
      annualEquivalent += convertedAnnual
      includedSubscriptionCount += 1
    }
  }

  return {
    baseCurrency: options.baseCurrency,
    monthlyEquivalent,
    annualEquivalent,
    projected30: sumPaymentsInWindow(options.payments, options.baseCurrency, options.exchangeRates, referenceDate, day30),
    projected90: sumPaymentsInWindow(options.payments, options.baseCurrency, options.exchangeRates, referenceDate, day90),
    expensesYearToDate: sumExpensesYearToDate(
      options.payments,
      options.baseCurrency,
      options.exchangeRates,
      yearStart,
      referenceDate,
    ),
    includedSubscriptionCount,
    excludedCurrencySubscriptionCount,
    excludedSubscriptions,
  }
}

function canProjectSubscription(
  subscription: Subscription,
  interval: { unit: IntervalUnit; count: number },
): boolean {
  if (subscription.archivedAt || subscription.deletedAt) {
    return false
  }

  if (subscription.status === 'ENDED') {
    return false
  }

  if (subscription.status === 'CANCELLED_PENDING_END' && !subscription.serviceEndDate) {
    return false
  }

  return Boolean(
    typeof subscription.currentPrice === 'number' &&
      subscription.currency &&
      subscription.nextChargeDate &&
      isValidCivilDate(subscription.nextChargeDate) &&
      (!subscription.pauseUntil || isValidCivilDate(subscription.pauseUntil)) &&
      (!subscription.serviceEndDate || isValidCivilDate(subscription.serviceEndDate)) &&
      interval,
  )
}

function isRecurringCostEligible(subscription: Subscription): boolean {
  if (subscription.archivedAt || subscription.deletedAt) {
    return false
  }

  if (subscription.status === 'ENDED') {
    return false
  }

  if (subscription.status === 'CANCELLED_PENDING_END' && !subscription.serviceEndDate) {
    return false
  }

  return true
}

function resolveBillingInterval(
  subscription: Subscription,
): { unit: IntervalUnit; count: number } | undefined {
  if (subscription.billingIntervalUnit) {
    const count =
      typeof subscription.billingIntervalCount === 'number' &&
      Number.isInteger(subscription.billingIntervalCount) &&
      subscription.billingIntervalCount > 0
        ? subscription.billingIntervalCount
        : 1

    return {
      unit: subscription.billingIntervalUnit,
      count,
    }
  }

  const legacy = mapLegacyInterval(
    (subscription as Subscription & { billingInterval?: LegacyBillingInterval }).billingInterval,
  )
  return legacy
}

function mapLegacyInterval(
  legacy?: LegacyBillingInterval,
): { unit: IntervalUnit; count: number } | undefined {
  switch (legacy) {
    case 'WEEKLY':
      return { unit: 'WEEK', count: 1 }
    case 'MONTHLY':
      return { unit: 'MONTH', count: 1 }
    case 'YEARLY':
      return { unit: 'YEAR', count: 1 }
    default:
      return undefined
  }
}

function intervalToMonths(unit: IntervalUnit, count: number): number | undefined {
  switch (unit) {
    case 'MONTH':
      return count
    case 'YEAR':
      return count * 12
    case 'WEEK':
      return (count * 52) / 12
    case 'DAY':
      return (count * 365) / 12
    default:
      return undefined
  }
}

function sumPaymentsInWindow(
  payments: Payment[],
  baseCurrency: string,
  exchangeRates: Record<string, number> | undefined,
  startDate: string,
  endDate: string,
): number {
  return payments.reduce((total, payment) => {
    if (payment.status !== 'PROJECTED') {
      return total
    }

    if (compareCivilDates(payment.scheduledDate, startDate) < 0) {
      return total
    }

    if (compareCivilDates(payment.scheduledDate, endDate) > 0) {
      return total
    }

    const paymentCurrency = payment.amount.currency
    const amount = payment.amount.amount
    if (paymentCurrency === baseCurrency) {
      return total + amount
    }

    const rate = exchangeRates?.[paymentCurrency]
    if (rate) {
      return total + Math.round(amount * rate * 100) / 100
    }

    return total
  }, 0)
}

function sumExpensesYearToDate(
  payments: Payment[],
  baseCurrency: string,
  exchangeRates: Record<string, number> | undefined,
  startDate: string,
  endDate: string,
): number {
  return payments.reduce((total, payment) => {
    const effectiveDate = payment.paidDate ?? payment.scheduledDate

    if (compareCivilDates(effectiveDate, startDate) < 0 || compareCivilDates(effectiveDate, endDate) > 0) {
      return total
    }

    const amount = payment.amount.amount

    if (payment.status === 'ASSUMED_PAID' || payment.status === 'CONFIRMED_PAID') {
      const paymentCurrency = payment.amount.currency
      if (paymentCurrency === baseCurrency) {
        return total + amount
      }

      const rate = exchangeRates?.[paymentCurrency]
      if (rate) {
        return total + Math.round(amount * rate * 100) / 100
      }
    }

    if (payment.status === 'REFUNDED') {
      return total - amount
    }

    return total
  }, 0)
}