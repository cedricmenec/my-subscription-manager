import { afterEach, describe, expect, it, vi } from 'vitest'
import Dexie from 'dexie'
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
        renewalMode: 'ROLLING',
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
        renewalMode: 'ROLLING',
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
        renewalMode: 'ROLLING',
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
        renewalMode: 'ROLLING',
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

describe('IndexedDB migration v7→v8', () => {
  it('copie renewalStartDate → subscriptionDate et ajoute les nouveaux champs', async () => {
    const dbName = `migration-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    // Crée une base minimaliste v7 (raw Dexie) pour simuler l'état avant migration
    const v7Schema = new Dexie(dbName)
    v7Schema.version(7).stores({
      subscriptions:
        'id, status, categoryId, renewalMode, billingIntervalUnit, nextChargeDate, nextRenewalDate, updatedAt, archivedAt, deletedAt',
    })
    await v7Schema.open()

    // Injecte un abonnement avec l'ancien format v7
    const id = `sbs-${crypto.randomUUID()}`
    const now = new Date()
    await v7Schema.table('subscriptions').put({
      id,
      name: 'Migration Test',
      status: 'ACTIVE',
      renewalMode: 'AUTOMATIC',
      renewalStartDate: undefined,
      nextRenewalDate: '2026-06-15',
      billingIntervalUnit: 'MONTH',
      billingIntervalCount: 1,
      renewalIntervalUnit: 'MONTH',
      renewalIntervalCount: 1,
      createdAt: now,
      updatedAt: now,
      schemaVersion: 7,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    v7Schema.close()

    // Réouvre la base avec SubscriptionDatabase (migration v8 déclenchée automatiquement)
    const newDb = new SubscriptionDatabase({
      name: dbName,
      skipCloud: true,
    })
    await newDb.open()

    const sub = await newDb.subscriptions.get(id)
    expect(sub).toBeDefined()
    expect(sub!.subscriptionDate).toBeUndefined()
    expect(sub).not.toHaveProperty('renewalPeriodStartDate')
    expect(sub!.schemaVersion).toBe(10)
    // Le champ legacy a été supprimé
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    expect((sub as any).renewalStartDate).toBeUndefined()

    newDb.close()
  })

  it('migration gère les abonnements sans renewalStartDate', async () => {
    const dbName = `migration-none-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    const v7Schema = new Dexie(dbName)
    v7Schema.version(7).stores({
      subscriptions:
        'id, status, categoryId, renewalMode, billingIntervalUnit, nextChargeDate, nextRenewalDate, updatedAt, archivedAt, deletedAt',
    })
    await v7Schema.open()

    const id = `sbs-${crypto.randomUUID()}`
    await v7Schema.table('subscriptions').put({
      id,
      name: 'No Date',
      status: 'ACTIVE',
      renewalMode: 'AUTOMATIC',
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 7,
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    } as any)
    v7Schema.close()

    const newDb = new SubscriptionDatabase({
      name: dbName,
      skipCloud: true,
    })
    await newDb.open()

    const sub = await newDb.subscriptions.get(id)
    expect(sub).toBeDefined()
    expect(sub!.subscriptionDate).toBeUndefined()
    expect(sub).not.toHaveProperty('renewalPeriodStartDate')
    expect(sub!.schemaVersion).toBe(10)

    newDb.close()
  })
})
