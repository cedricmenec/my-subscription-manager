import { afterEach, describe, expect, it } from 'vitest'
import { SubscriptionDatabase } from '../data/db'
import { createSubscription } from './subscriptions'
import {
  listPayments,
  materializeProjectedPayments,
  materializeProjectedPaymentsWithStats,
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
    // Second run is idempotent — no new writes, still 2 total payments
    expect(secondRun).toHaveLength(2)
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

  it('purge les projections orphelines lorsqu\'un abonnement est modifié', async () => {
    const dbName = `payments-purge-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    const testDb = new SubscriptionDatabase({ name: dbName, skipCloud: true })
    await testDb.open()

    const sub = await createSubscription(
      {
        name: 'Gaia TV',
        status: 'ACTIVE',
        renewalMode: 'AUTOMATIC',
        currentPrice: 139.99,
        currency: 'EUR',
        billingIntervalUnit: 'MONTH',
        billingIntervalCount: 1,
        nextChargeDate: '2026-08-12',
      },
      testDb,
    )

    // First projection: 2026-08-12, 139.99
    await materializeProjectedPayments(
      { referenceDate: '2026-07-29', horizonDays: 30, database: testDb },
    )

    const paymentsAfterFirst = await listPayments({}, testDb)
    expect(paymentsAfterFirst).toHaveLength(1)
    expect(paymentsAfterFirst[0].scheduledDate).toBe('2026-08-12')
    expect(paymentsAfterFirst[0].amount.amount).toBe(139.99)

    // Modify subscription: change date and amount
    await testDb.subscriptions.put({
      ...sub,
      nextChargeDate: '2026-08-13',
      currentPrice: 119.00,
      updatedAt: new Date(),
    })

    // Second projection should purge old and create new
    await materializeProjectedPayments(
      { referenceDate: '2026-07-29', horizonDays: 30, database: testDb },
    )

    const paymentsAfterSecond = await listPayments({}, testDb)
    expect(paymentsAfterSecond).toHaveLength(1)
    expect(paymentsAfterSecond[0].scheduledDate).toBe('2026-08-13')
    expect(paymentsAfterSecond[0].amount.amount).toBe(119.00)

    testDb.close()
  })

  it('ne supprime pas les paiements non GENERATED lors de la purge', async () => {
    const dbName = `payments-no-purge-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    const testDb = new SubscriptionDatabase({ name: dbName, skipCloud: true })
    await testDb.open()

    const sub = await createSubscription(
      {
        name: 'Netflix',
        status: 'ACTIVE',
        renewalMode: 'AUTOMATIC',
        currentPrice: 15.99,
        currency: 'EUR',
        billingIntervalUnit: 'MONTH',
        billingIntervalCount: 1,
        nextChargeDate: '2026-08-01',
      },
      testDb,
    )

    // Create a manual payment for the same subscription
    const now = new Date()
    await testDb.payments.put({
      id: `pym-manual-${crypto.randomUUID()}`,
      subscriptionId: sub.id,
      scheduledDate: '2026-08-01',
      status: 'CONFIRMED_PAID',
      amount: { amount: 15.99, currency: 'EUR' },
      source: 'MANUAL',
      createdAt: now,
      updatedAt: now,
      schemaVersion: 5,
    })

    // Run projection — should not delete the MANUAL payment
    await materializeProjectedPayments(
      { referenceDate: '2026-07-29', horizonDays: 30, database: testDb },
    )

    const allPayments = await listPayments({}, testDb)
    const manualPayments = allPayments.filter(p => p.source === 'MANUAL')
    const generatedPayments = allPayments.filter(p => p.source === 'GENERATED')

    expect(manualPayments).toHaveLength(1)
    expect(generatedPayments.length).toBeGreaterThanOrEqual(1)

    testDb.close()
  })

  it('est idempotent — ne génère pas d\'écritures si les projections sont identiques', async () => {
    const dbName = `payments-idempotent-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    const testDb = new SubscriptionDatabase({ name: dbName, skipCloud: true })
    await testDb.open()

    await createSubscription(
      {
        name: 'Disney+',
        status: 'ACTIVE',
        renewalMode: 'AUTOMATIC',
        currentPrice: 10.99,
        currency: 'EUR',
        billingIntervalUnit: 'MONTH',
        billingIntervalCount: 1,
        nextChargeDate: '2026-08-15',
      },
      testDb,
    )

    // First run: creates projections
    const firstResult = await materializeProjectedPaymentsWithStats(
      { referenceDate: '2026-07-29', horizonDays: 30, database: testDb },
    )
    expect(firstResult.createCount).toBeGreaterThan(0)

    // Second run: no changes, should be idempotent
    const secondResult = await materializeProjectedPaymentsWithStats(
      { referenceDate: '2026-07-29', horizonDays: 30, database: testDb },
    )
    expect(secondResult.deleteCount).toBe(0)
    expect(secondResult.createCount).toBe(0)

    // Third run: still no changes
    const thirdResult = await materializeProjectedPaymentsWithStats(
      { referenceDate: '2026-07-29', horizonDays: 30, database: testDb },
    )
    expect(thirdResult.deleteCount).toBe(0)
    expect(thirdResult.createCount).toBe(0)

    // Verify total payments still correct
    expect(await listPayments({}, testDb)).toHaveLength(firstResult.payments.length)

    testDb.close()
  })
})