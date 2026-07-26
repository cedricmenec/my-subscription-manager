import {
  type IntervalUnit,
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

export interface ProjectedPaymentDraft {
  subscriptionId: string
  scheduledDate: string
  status: PaymentStatus
  amount: {
    amountMinor: number
    currency: string
  }
}

export interface FinancialSummary {
  baseCurrency: string
  monthlyEquivalentMinor: number
  annualEquivalentMinor: number
  projected30Minor: number
  projected90Minor: number
  expensesYearToDateMinor: number
  includedSubscriptionCount: number
  excludedCurrencySubscriptionCount: number
}

export function computeEquivalentMonthlyCost(subscription: Subscription): number | undefined {
  if (
    typeof subscription.currentPriceMinor !== 'number' ||
    !subscription.billingIntervalUnit ||
    !subscription.billingIntervalCount
  ) {
    return undefined
  }

  const months = intervalToMonths(
    subscription.billingIntervalUnit,
    subscription.billingIntervalCount,
  )

  if (!months || months <= 0) {
    return undefined
  }

  return Math.round(subscription.currentPriceMinor / months)
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
  if (!canProjectSubscription(subscription)) {
    return []
  }

  const projected: ProjectedPaymentDraft[] = []
  const stepUnit = subscription.billingIntervalUnit as IntervalUnit
  const stepCount = subscription.billingIntervalCount as number
  const amountMinor = subscription.currentPriceMinor as number
  const currency = subscription.currency as string
  let candidateDate = subscription.nextChargeDate as string

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
          amountMinor,
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
}): FinancialSummary {
  const referenceDate = options.referenceDate ?? todayCivilDate()
  const yearStart = `${referenceDate.slice(0, 4)}-01-01`
  const day30 = addDaysToCivilDate(referenceDate, 30)
  const day90 = addDaysToCivilDate(referenceDate, 90)

  let monthlyEquivalentMinor = 0
  let annualEquivalentMinor = 0
  let includedSubscriptionCount = 0
  let excludedCurrencySubscriptionCount = 0

  for (const subscription of options.subscriptions) {
    if (!isRecurringCostEligible(subscription)) {
      continue
    }

    if (subscription.currency !== options.baseCurrency) {
      excludedCurrencySubscriptionCount += 1
      continue
    }

    const monthlyCost = computeEquivalentMonthlyCost(subscription)
    const annualCost = computeEquivalentAnnualCost(subscription)

    if (typeof monthlyCost === 'number' && typeof annualCost === 'number') {
      monthlyEquivalentMinor += monthlyCost
      annualEquivalentMinor += annualCost
      includedSubscriptionCount += 1
    }
  }

  return {
    baseCurrency: options.baseCurrency,
    monthlyEquivalentMinor,
    annualEquivalentMinor,
    projected30Minor: sumPaymentsInWindow(options.payments, options.baseCurrency, referenceDate, day30),
    projected90Minor: sumPaymentsInWindow(options.payments, options.baseCurrency, referenceDate, day90),
    expensesYearToDateMinor: sumExpensesYearToDate(
      options.payments,
      options.baseCurrency,
      yearStart,
      referenceDate,
    ),
    includedSubscriptionCount,
    excludedCurrencySubscriptionCount,
  }
}

function canProjectSubscription(subscription: Subscription): boolean {
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
    typeof subscription.currentPriceMinor === 'number' &&
      subscription.currency &&
      subscription.nextChargeDate &&
      subscription.billingIntervalUnit &&
      subscription.billingIntervalCount,
  )
}

function isRecurringCostEligible(subscription: Subscription): boolean {
  return subscription.status === 'ACTIVE' || subscription.status === 'TRIAL'
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
  currency: string,
  startDate: string,
  endDate: string,
): number {
  return payments.reduce((total, payment) => {
    if (payment.amount.currency !== currency || payment.status !== 'PROJECTED') {
      return total
    }

    if (compareCivilDates(payment.scheduledDate, startDate) < 0) {
      return total
    }

    if (compareCivilDates(payment.scheduledDate, endDate) > 0) {
      return total
    }

    return total + payment.amount.amountMinor
  }, 0)
}

function sumExpensesYearToDate(
  payments: Payment[],
  currency: string,
  startDate: string,
  endDate: string,
): number {
  return payments.reduce((total, payment) => {
    const effectiveDate = payment.paidDate ?? payment.scheduledDate

    if (payment.amount.currency !== currency) {
      return total
    }

    if (compareCivilDates(effectiveDate, startDate) < 0 || compareCivilDates(effectiveDate, endDate) > 0) {
      return total
    }

    if (payment.status === 'ASSUMED_PAID' || payment.status === 'CONFIRMED_PAID') {
      return total + payment.amount.amountMinor
    }

    if (payment.status === 'REFUNDED') {
      return total - payment.amount.amountMinor
    }

    return total
  }, 0)
}