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

export async function materializeProjectedPayments(
  options: {
    horizonDays?: number
    referenceDate?: string
    database?: SubscriptionDatabase
  } = {},
): Promise<Payment[]> {
  const database = options.database ?? db
  const referenceDate = options.referenceDate ?? todayCivilDate()
  const horizonDays = options.horizonDays ?? 90
  const windowEnd = addDaysToCivilDate(referenceDate, horizonDays)
  const now = new Date()
  const createdPayments: Payment[] = []

  try {
    const subscriptions = await database.subscriptions.toArray()

    await database.transaction('rw', database.payments, async () => {
      for (const subscription of subscriptions) {
        if (!subscription.id) {
          continue
        }

        // Purge orphaned GENERATED payments for this subscription before projecting.
        // This ensures that when a subscription's date or amount changes, the old
        // projected payment is removed and only the new projection persists.
        const existingGenerated = await database.payments
          .where('subscriptionId')
          .equals(subscription.id)
          .and(payment => payment.source === 'GENERATED')
          .toArray()

        for (const orphan of existingGenerated) {
          if (orphan.id) {
            await database.payments.delete(orphan.id)
          }
        }

        let projected: ReturnType<typeof projectSubscriptionPayments>

        try {
          projected = projectSubscriptionPayments(subscription, referenceDate, windowEnd)
        } catch (error) {
          // Ignore malformed legacy records and continue materializing valid subscriptions.
          console.error('Projection skipped for subscription', subscription.id, error)
          continue
        }

        for (const candidate of projected) {
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

  return createdPayments
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

  await database.payments.update(id, {
    status: updated.status,
    paidDate: updated.paidDate,
    notes: updated.notes,
    correctedAt: updated.correctedAt,
    updatedAt: updated.updatedAt,
    schemaVersion: 5,
  })

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