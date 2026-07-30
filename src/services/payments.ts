import { db, type Payment, type PaymentStatus, type SubscriptionDatabase } from '../data/db'
import { buildFinancialSummary, projectSubscriptionPayments } from './finance'
import { addDaysToCivilDate, todayCivilDate } from './civilDate'

interface ListPaymentsFilters {
  subscriptionId?: string
  fromDate?: string
  toDate?: string
}

interface UpdatePaymentStatusInput {
  status: PaymentStatus
  paidDate?: string
  notes?: string
}

export interface MaterializationResult {
  payments: Payment[]
  deleteCount: number
  createCount: number
  updateCount: number
}

export function createProjectedPaymentId(subscriptionId: string, scheduledDate: string): string {
  return `pym-projected-${subscriptionId}-${scheduledDate}`
}

export function isReplaceableProjection(payment: Payment): boolean {
  return (
    payment.source === 'GENERATED' &&
    payment.status === 'PROJECTED' &&
    !payment.correctedAt
  )
}

export async function materializeProjectedPayments(
  options: {
    horizonDays?: number
    referenceDate?: string
    database?: SubscriptionDatabase
  } = {},
): Promise<Payment[]> {
  const result = await materializeProjectedPaymentsWithStats(options)
  return result.payments
}

export async function materializeProjectedPaymentsWithStats(
  options: {
    horizonDays?: number
    referenceDate?: string
    database?: SubscriptionDatabase
  } = {},
): Promise<MaterializationResult> {
  const database = options.database ?? db
  const referenceDate = options.referenceDate ?? todayCivilDate()
  const windowEnd = options.horizonDays === undefined
    ? undefined
    : addDaysToCivilDate(referenceDate, options.horizonDays)
  const now = new Date()
  const createdPayments: Payment[] = []
  let deleteCount = 0
  let createCount = 0
  let updateCount = 0

  try {
    const subscriptions = await database.subscriptions.toArray()

    await database.transaction('rw', database.payments, async () => {
      for (const subscription of subscriptions) {
        if (!subscription.id) {
          continue
        }

        const existingPayments = await database.payments
          .where('subscriptionId')
          .equals(subscription.id)
          .and(payment => !payment.deletedAt)
          .toArray()
        const existingGenerated = existingPayments.filter(
          payment => payment.source === 'GENERATED',
        )
        const replaceableProjections = existingGenerated.filter(isReplaceableProjection)
        const protectedPayments = existingPayments.filter(
          payment => !isReplaceableProjection(payment),
        )
        const preservedGenerated = existingGenerated.filter(
          payment => !replaceableProjections.some(candidate => candidate.id === payment.id),
        )

        let projected: ReturnType<typeof projectSubscriptionPayments>

        try {
          projected = projectSubscriptionPayments(subscription, referenceDate, windowEnd)
        } catch (error) {
          // Ignore malformed legacy records and continue materializing valid subscriptions.
          console.error('Projection skipped for subscription', subscription.id, error)
          continue
        }

        const preservedDates = new Set(protectedPayments.map(payment => payment.scheduledDate))
        const reconcilableProjected = projected.filter(
          candidate => !preservedDates.has(candidate.scheduledDate),
        )

        const replaceableByDate = new Map<string, Payment[]>()
        for (const payment of replaceableProjections) {
          const sameDate = replaceableByDate.get(payment.scheduledDate) ?? []
          sameDate.push(payment)
          sameDate.sort((left, right) => left.id.localeCompare(right.id))
          replaceableByDate.set(payment.scheduledDate, sameDate)
        }

        createdPayments.push(...preservedGenerated)

        for (const candidate of reconcilableProjected) {
          const candidatesAtDate = replaceableByDate.get(candidate.scheduledDate) ?? []
          const existing = candidatesAtDate.shift()
          if (candidatesAtDate.length > 0) {
            replaceableByDate.set(candidate.scheduledDate, candidatesAtDate)
          } else {
            replaceableByDate.delete(candidate.scheduledDate)
          }

          if (existing) {
            const unchanged =
              existing.status === candidate.status &&
              existing.amount.amount === candidate.amount.amount &&
              existing.amount.currency === candidate.amount.currency
            if (unchanged) {
              createdPayments.push(existing)
              continue
            }

            const updated: Payment = {
              ...existing,
              status: candidate.status,
              amount: candidate.amount,
              updatedAt: now,
              schemaVersion: 5,
            }
            await database.payments.put(updated)
            createdPayments.push(updated)
            updateCount++
          } else {
            const payment: Payment = {
              id: createProjectedPaymentId(candidate.subscriptionId, candidate.scheduledDate),
              subscriptionId: candidate.subscriptionId,
              scheduledDate: candidate.scheduledDate,
              status: candidate.status,
              amount: candidate.amount,
              source: 'GENERATED',
              createdAt: now,
              updatedAt: now,
              schemaVersion: 5,
            }
            await database.payments.put(payment)
            createdPayments.push(payment)
            createCount++
          }
        }

        for (const obsoletePayments of replaceableByDate.values()) {
          for (const obsolete of obsoletePayments) {
            await database.payments.delete(obsolete.id)
            deleteCount++
          }
        }
      }
    })
  } catch (error) {
    console.error('materializeProjectedPayments failed', error)
  }

  return { payments: createdPayments, deleteCount, createCount, updateCount }
}

export async function listPayments(
  filters: ListPaymentsFilters = {},
  database: SubscriptionDatabase = db,
): Promise<Payment[]> {
  const payments = await database.payments.toArray()

  return payments
    .filter(payment => {
      if (filters.subscriptionId && payment.subscriptionId !== filters.subscriptionId) {
        return false
      }

      if (filters.fromDate && payment.scheduledDate < filters.fromDate) {
        return false
      }

      if (filters.toDate && payment.scheduledDate > filters.toDate) {
        return false
      }

      return !payment.deletedAt
    })
    .sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate))
}

export async function updatePaymentStatus(
  id: string,
  input: UpdatePaymentStatusInput,
  database: SubscriptionDatabase = db,
): Promise<Payment> {
  const current = await database.payments.get(id)

  if (!current) {
    throw new Error('Paiement introuvable.')
  }

  const updated: Payment = {
    ...current,
    status: input.status,
    paidDate: input.paidDate ?? current.paidDate,
    notes: input.notes ?? current.notes,
    correctedAt: new Date(),
    updatedAt: new Date(),
    schemaVersion: 5,
  }

  await database.payments.put(updated)

  return updated
}

export async function getFinancialSummary(
  database: SubscriptionDatabase = db,
  referenceDate?: string,
) {
  const [subscriptions, payments, settings] = await Promise.all([
    database.subscriptions.toArray(),
    database.payments.toArray(),
    database.settings.where('key').equals('main').first(),
  ])

  return buildFinancialSummary({
    subscriptions,
    payments,
    baseCurrency: settings?.baseCurrency ?? 'EUR',
    referenceDate,
    exchangeRates: settings?.exchangeRates,
  })
}
