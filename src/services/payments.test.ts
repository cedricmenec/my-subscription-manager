import { afterEach, describe, expect, it } from 'vitest'
import { SubscriptionDatabase } from '../data/db'
import { createSubscription } from './subscriptions'
import {
  listPayments,
  materializeProjectedPayments,
  updatePaymentStatus,
} from './payments'

const createdDbNames: string[] = []

afterEach(async () => {
  while (createdDbNames.length > 0) {
    const name = createdDbNames.pop()
    if (name) {
      await indexedDB.deleteDatabase(name)
    }
  }
})

describe('payments service', () => {
  it('matérialise les paiements projetés sans doublon', async () => {
    const dbName = `payments-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    const testDb = new SubscriptionDatabase({ name: dbName, skipCloud: true })
    await testDb.open()

    await createSubscription(
      {
        name: 'Canal+',
        status: 'ACTIVE',
        renewalMode: 'AUTOMATIC',
        currentPrice: 22.00,
        currency: 'EUR',
        billingIntervalUnit: 'MONTH',
        billingIntervalCount: 1,
        nextChargeDate: '2026-08-01',
      },
      testDb,
    )

    const firstRun = await materializeProjectedPayments(
      { referenceDate: '2026-07-26', horizonDays: 40, database: testDb },
    )
    const secondRun = await materializeProjectedPayments(
      { referenceDate: '2026-07-26', horizonDays: 40, database: testDb },
    )

    expect(firstRun).toHaveLength(2)
    expect(secondRun).toHaveLength(0)
    expect(await listPayments({}, testDb)).toHaveLength(2)

    testDb.close()
  })

  it('corrige localement le statut d\'un paiement', async () => {
    const dbName = `payments-update-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    const testDb = new SubscriptionDatabase({ name: dbName, skipCloud: true })
    await testDb.open()

    await createSubscription(
      {
        name: 'Spotify',
        status: 'ACTIVE',
        renewalMode: 'AUTOMATIC',
        currentPrice: 12.00,
        currency: 'EUR',
        billingIntervalUnit: 'MONTH',
        billingIntervalCount: 1,
        nextChargeDate: '2026-08-05',
      },
      testDb,
    )

    await materializeProjectedPayments(
      { referenceDate: '2026-07-26', horizonDays: 30, database: testDb },
    )

    const [payment] = await listPayments({}, testDb)
    const updated = await updatePaymentStatus(
      payment.id,
      { status: 'CONFIRMED_PAID', paidDate: payment.scheduledDate },
      testDb,
    )

    expect(updated.status).toBe('CONFIRMED_PAID')
    expect(updated.paidDate).toBe('2026-08-05')

    testDb.close()
  })
})