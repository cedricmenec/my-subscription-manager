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

function createEntityId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export interface MaterializationResult {
  payments: Payment[]
  deleteCount: number
  createCount: number
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
  const horizonDays = options.horizonDays ?? 90
  const windowEnd = addDaysToCivilDate(referenceDate, horizonDays)
  const now = new Date()
  const createdPayments: Payment[] = []
  let deleteCount = 0
  let createCount = 0

  try {
    const subscriptions = await database.subscriptions.toArray()

    await database.transaction('rw', database.payments, async () => {
      for (const subscription of subscriptions) {
        if (!subscription.id) {
          continue
        }

        // Load existing GENERATED payments for this subscription
        const existingGenerated = await database.payments
          .where('subscriptionId')
          .equals(subscription.id)
          .and(payment => payment.source === 'GENERATED')
          .toArray()
        const replaceableProjections = existingGenerated.filter(
          payment => payment.status === 'PROJECTED' && !payment.correctedAt,
        )
        const preservedPayments = existingGenerated.filter(
          payment => payment.status !== 'PROJECTED' || Boolean(payment.correctedAt),
        )

        let projected: ReturnType<typeof projectSubscriptionPayments>

        try {
          projected = projectSubscriptionPayments(subscription, referenceDate, windowEnd)
        } catch (error) {
          // Ignore malformed legacy records and continue materializing valid subscriptions.
          console.error('Projection skipped for subscription', subscription.id, error)
          continue
        }

        // A corrected or finalized GENERATED payment is historical data. Keep it
        // and do not recreate a projection for the same civil date.
        const preservedDates = new Set(preservedPayments.map(payment => payment.scheduledDate))
        const reconcilableProjected = projected.filter(
          candidate => !preservedDates.has(candidate.scheduledDate),
        )

        // Compare replaceable projections with the newly calculated projection.
        const existingKeys = new Set(
          replaceableProjections.map(p =>
            `${p.scheduledDate}|${p.amount.amount}|${p.amount.currency}|${p.status}`,
          ),
        )
        const projectedKeys = new Set(
          reconcilableProjected.map(c =>
            `${c.scheduledDate}|${c.amount.amount}|${c.amount.currency}|${c.status}`,
          ),
        )

        // If both sets are identical, skip writes entirely for this subscription
        if (existingKeys.size === projectedKeys.size) {
          let identical = true
          for (const key of existingKeys) {
            if (!projectedKeys.has(key)) {
              identical = false
              break
            }
          }
          if (identical) {
            // Track existing payments as "created" (they already exist)
            for (const p of existingGenerated) {
              if (p.id) {
                createdPayments.push(p)
              }
            }
            continue
          }
        }

        // Only untouched future projections are replaceable. Corrections and
        // finalized payments remain immutable history.
        for (const orphan of replaceableProjections) {
          if (orphan.id) {
            await database.payments.delete(orphan.id)
            deleteCount++
          }
        }

        createdPayments.push(...preservedPayments)

        // Create new projections
        for (const candidate of reconcilableProjected) {
          const payment: Payment = {
            id: createEntityId('pym'),
            subscriptionId: candidate.subscriptionId,
            scheduledDate: candidate.scheduledDate,
            status: candidate.status,
            amount: candidate.amount,
            source: 'GENERATED',
            createdAt: now,
            updatedAt: now,
            schemaVersion: 5,
          }

          try {
            await database.payments.put(payment)
            createdPayments.push(payment)
            createCount++
          } catch (error) {
            const errorMsg = error instanceof Error ? error.message : String(error)
            console.error(
              `Payment materialization put failed for ${subscription.id} on ${candidate.scheduledDate}:`,
              errorMsg,
            )
          }
        }
      }
    })
  } catch (error) {
    console.error('materializeProjectedPayments failed', error)
  }

  return { payments: createdPayments, deleteCount, createCount }
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
