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
  it('crée, met à jour et archive logiquement un abonnement', async () => {
    const dbName = `crud-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    const testDb = new SubscriptionDatabase({ name: dbName, skipCloud: true })
    await testDb.open()

    const created = await createSubscription({
      name: 'Notion',
      status: 'ACTIVE',
      renewalMode: 'AUTOMATIC',
      currentPriceMinor: 1200,
      currency: 'EUR',
      billingIntervalUnit: 'MONTH',
      billingIntervalCount: 1,
      nextChargeDate: '2026-08-01',
    }, testDb)

    await updateSubscription(created.id, {
      name: 'Notion Plus',
      status: 'PAUSED',
      renewalMode: 'MANUAL',
      pauseUntil: '2026-09-15',
    }, testDb)

    const beforeArchive = await listSubscriptions({}, testDb)
    expect(beforeArchive).toHaveLength(1)

    await archiveSubscription(created.id, testDb)

    const afterArchive = await listSubscriptions({}, testDb)
    expect(afterArchive).toHaveLength(0)

    testDb.close()
  })

  it('calcule les champs manquants de complétude', () => {
    const completion = computeSubscriptionCompletion({
      id: 'a',
      name: 'Service',
      status: 'ACTIVE',
      renewalMode: 'AUTOMATIC',
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 3,
    })

    expect(completion.isComplete).toBe(false)
    expect(completion.missingFields).toEqual(
      expect.arrayContaining(['price', 'currency', 'billingInterval', 'nextChargeDate']),
    )
  })
})
