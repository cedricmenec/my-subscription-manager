import { afterEach, describe, expect, it } from 'vitest'
import { SubscriptionDatabase } from '../data/db'
import {
  archiveSubscription,
  computeSubscriptionCompletion,
  createSubscription,
  listSubscriptions,
  updateSubscription,
} from './subscriptions'

const createdDbNames: string[] = []

afterEach(async () => {
  while (createdDbNames.length > 0) {
    const name = createdDbNames.pop()
    if (name) {
      await indexedDB.deleteDatabase(name)
    }
  }
})

describe('subscriptions service', () => {
  it('cree, met a jour et archive logiquement un abonnement', async () => {
    const dbName = 'crud-db-' + crypto.randomUUID()
    createdDbNames.push(dbName)

    const testDb = new SubscriptionDatabase({ name: dbName, skipCloud: true })
    await testDb.open()

    const created = await createSubscription({
      name: 'Notion',
      status: 'ACTIVE',
      renewalMode: 'ROLLING',
      currentPrice: 12.00,
      currency: 'EUR',
      billingIntervalUnit: 'MONTH',
      billingIntervalCount: 1,
      nextChargeDate: '2026-08-01',
    }, testDb)

    await updateSubscription(created.id, {
      name: 'Notion Plus',
      status: 'PAUSED',
      renewalMode: 'ROLLING',
      pauseUntil: '2026-09-15',
    }, testDb)

    const beforeArchive = await listSubscriptions({}, testDb)
    expect(beforeArchive).toHaveLength(1)

    await archiveSubscription(created.id, testDb)

    const afterArchive = await listSubscriptions({}, testDb)
    expect(afterArchive).toHaveLength(0)

    testDb.close()
  })

  it('calcule les champs manquants de completude', () => {
    const completion = computeSubscriptionCompletion({
      id: 'a',
      name: 'Service',
      status: 'ACTIVE',
      renewalMode: 'AUTOMATIC',
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 10,
    })

    expect(completion.isComplete).toBe(false)
    expect(completion.missingFields).toEqual(
      expect.arrayContaining(['price', 'currency', 'billingInterval', 'nextChargeDate']),
    )
  })

  it('nettoie nextRenewalDate lors du passage a ROLLING avec put', async () => {
    const dbName = 'rolling-save-db-' + crypto.randomUUID()
    createdDbNames.push(dbName)
    const testDb = new SubscriptionDatabase({ name: dbName, skipCloud: true })
    await testDb.open()

    const created = await createSubscription({
      name: 'Service', status: 'ACTIVE', renewalMode: 'AUTOMATIC',
      currentPrice: 10, currency: 'EUR', billingIntervalUnit: 'MONTH', billingIntervalCount: 1,
      commitmentIntervalUnit: 'YEAR', commitmentIntervalCount: 1,
      commitmentStartDate: '2026-01-15',
      nextChargeDate: '2026-08-15', subscriptionDate: '2025-01-15',
    }, testDb)

    const updated = await updateSubscription(created.id, {
      name: created.name, status: 'ACTIVE', renewalMode: 'ROLLING',
      currentPrice: created.currentPrice, currency: created.currency,
      billingIntervalUnit: created.billingIntervalUnit,
      billingIntervalCount: created.billingIntervalCount,
      nextChargeDate: created.nextChargeDate,
    }, testDb)

    expect(updated).toMatchObject({
      renewalMode: 'ROLLING', billingIntervalUnit: 'MONTH',
    })
    expect(updated.nextRenewalDate).toBeUndefined()
    expect(await testDb.subscriptions.get(created.id)).toEqual(updated)
    testDb.close()
  })
})
