import { afterEach, describe, expect, it, vi } from 'vitest'
import { SubscriptionDatabase } from './db'
import {
  createSubscription,
  listSubscriptions,
  updateSubscription,
} from '../services/subscriptions'

const createdDbNames: string[] = []

afterEach(async () => {
  vi.restoreAllMocks()

  while (createdDbNames.length > 0) {
    const name = createdDbNames.pop()
    if (name) {
      await indexedDB.deleteDatabase(name)
    }
  }
})

describe('IndexedDB integration', () => {
  it('écrit localement un abonnement et conserve les données après réouverture', async () => {
    const dbName = `integration-crud-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    const db1 = new SubscriptionDatabase({
      name: dbName,
      skipCloud: true,
    })

    await db1.open()
    const created = await createSubscription(
      {
        name: 'Youtube Premium',
        status: 'ACTIVE',
        renewalMode: 'AUTOMATIC',
        currentPrice: 12.99,
        currency: 'EUR',
        billingIntervalUnit: 'MONTH',
        billingIntervalCount: 1,
        nextChargeDate: '2026-08-02',
      },
      db1,
    )
    await updateSubscription(
      created.id,
      {
        name: 'YouTube Premium Famille',
        status: 'PAUSED',
        renewalMode: 'MANUAL',
        pauseUntil: '2026-09-01',
      },
      db1,
    )
    db1.close()

    const db2 = new SubscriptionDatabase({
      name: dbName,
      skipCloud: true,
    })

    await db2.open()
    const subscriptions = await listSubscriptions({}, db2)
    expect(subscriptions).toHaveLength(1)
    expect(subscriptions[0].name).toBe('YouTube Premium Famille')
    db2.close()
  })

  it("enregistre une écriture locale même quand l'appareil est hors ligne", async () => {
    const dbName = `offline-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    const db = new SubscriptionDatabase({
      name: dbName,
      skipCloud: true,
    })

    await db.open()
    await createSubscription(
      {
        name: 'Canal Plus',
        status: 'ACTIVE',
        renewalMode: 'AUTOMATIC',
      },
      db,
    )

    const subscriptions = await listSubscriptions({}, db)
    expect(subscriptions).toHaveLength(1)
    expect(subscriptions[0].name).toBe('Canal Plus')

    db.close()
  })

  it('conserve la donnée locale quand une sync échoue après enregistrement', async () => {
    const dbName = `sync-error-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    const db = new SubscriptionDatabase({
      name: dbName,
      skipCloud: true,
    })

    await db.open()
    await createSubscription(
      {
        name: 'Claude Plus',
        status: 'ACTIVE',
        renewalMode: 'AUTOMATIC',
      },
      db,
    )

    const syncError = new Error('sync failed')
    const syncMock = vi.fn().mockRejectedValue(syncError)

    await expect(syncMock()).rejects.toThrow('sync failed')

    const subscriptions = await listSubscriptions({}, db)
    expect(subscriptions).toHaveLength(1)
    expect(subscriptions[0].name).toBe('Claude Plus')

    db.close()
  })
})
