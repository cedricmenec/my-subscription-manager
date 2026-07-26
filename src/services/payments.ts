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

  const [subscriptions, existingPayments] = await Promise.all([
    database.subscriptions.toArray(),
    database.payments.toArray(),
  ])

  const existingKeys = new Set(
    existingPayments.map(payment => `${payment.subscriptionId}:${payment.scheduledDate}`),
  )

  const createdPayments: Payment[] = []

  await database.transaction('rw', database.payments, async () => {
    for (const subscription of subscriptions) {
      const projected = projectSubscriptionPayments(subscription, referenceDate, windowEnd)

      for (const candidate of projected) {
        const key = `${candidate.subscriptionId}:${candidate.scheduledDate}`
        if (existingKeys.has(key)) {
          continue
        }

        const payment: Payment = {
          id: createEntityId('pmt'),
          subscriptionId: candidate.subscriptionId,
          scheduledDate: candidate.scheduledDate,
          status: candidate.status,
          amount: candidate.amount,
          source: 'GENERATED',
          createdAt: now,
          updatedAt: now,
          schemaVersion: 3,
        }

        await database.payments.put(payment)
        existingKeys.add(key)
        createdPayments.push(payment)
      }
    }
  })

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
    schemaVersion: 3,
  }

  await database.payments.update(id, {
    status: updated.status,
    paidDate: updated.paidDate,
    notes: updated.notes,
    correctedAt: updated.correctedAt,
    updatedAt: updated.updatedAt,
    schemaVersion: updated.schemaVersion,
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
  })
}