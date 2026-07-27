import Dexie from 'dexie'
import { afterEach, describe, expect, it } from 'vitest'
import { SubscriptionDatabase } from './db'

const createdDbNames: string[] = []

afterEach(async () => {
  while (createdDbNames.length > 0) {
    const name = createdDbNames.pop()
    if (name) {
      await indexedDB.deleteDatabase(name)
    }
  }
})

describe('SubscriptionDatabase', () => {
  it('configure le schéma v3 avec payments et requireAuth', () => {
    const dbName = `test-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    const testDb = new SubscriptionDatabase({
      name: dbName,
      cloudUrl: 'https://invalid.dexie.cloud',
    })

    expect(testDb.verno).toBe(4)
    expect(testDb.tables.map(table => table.name)).toEqual(
      expect.arrayContaining([
        'subscriptions',
        'categories',
        'payments',
        'settings',
        'localSettings',
        'diagnosticLogs',
      ]),
    )

    expect(testDb.subscriptions.schema.primKey.auto).toBe(false)
    expect(testDb.settings.schema.primKey.auto).toBe(false)

    expect(testDb.cloud.options?.requireAuth).toBe(true)
    expect(testDb.cloud.options?.unsyncedTables).toEqual(
      expect.arrayContaining(['localSettings', 'diagnosticLogs']),
    )

    testDb.close()
  })

  it('migre les abonnements legacy en v3 avec renewalMode et intervalles structurés', async () => {
    const dbName = `migration-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    class LegacyDb extends Dexie {
      constructor(name: string) {
        super(name)
        this.version(1).stores({
          subscriptions: 'id, status, renewalMode, nextChargeDate, updatedAt, deletedAt',
          settings: 'id, &key, updatedAt',
          localSettings: '&key, updatedAt',
          diagnosticLogs: '++id, timestamp, category',
        })
      }
    }

    const legacyDb = new LegacyDb(dbName)
    await legacyDb.open()
    await legacyDb.table('subscriptions').put({
      id: 'sbs-legacy-1',
      name: 'Legacy',
      billingInterval: 'MONTHLY',
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 1,
    })
    legacyDb.close()

    const upgradedDb = new SubscriptionDatabase({ name: dbName, skipCloud: true })
    await upgradedDb.open()

    const migrated = await upgradedDb.subscriptions.get('sbs-legacy-1')
    expect(migrated?.renewalMode).toBe('UNKNOWN')
    expect(migrated?.status).toBe('UNKNOWN')
    expect(migrated?.billingIntervalUnit).toBe('MONTH')
    expect(migrated?.billingIntervalCount).toBe(1)
    expect(migrated?.renewalIntervalUnit).toBe('MONTH')
    expect(migrated?.renewalIntervalCount).toBe(1)
    expect(migrated?.schemaVersion).toBe(4)

    upgradedDb.close()
  })

  it('migre les prix legacy en v4 : currentPrice = currentPriceMinor / 100', async () => {
    const dbName = `migration-v4-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    class V3Db extends Dexie {
      constructor(name: string) {
        super(name)
        this.version(3).stores({
          subscriptions: 'id, status, categoryId, renewalMode, billingIntervalUnit, nextChargeDate, updatedAt, archivedAt, deletedAt',
          categories: 'id, &name, sortOrder, updatedAt',
          payments: 'id, subscriptionId, scheduledDate, paidDate, status, [subscriptionId+scheduledDate], updatedAt, deletedAt',
          settings: 'id, &key, updatedAt',
          localSettings: '&key, updatedAt',
          diagnosticLogs: '++id, timestamp, category',
        })
      }
    }

    const v3Db = new V3Db(dbName)
    await v3Db.open()
    await v3Db.table('subscriptions').put({
      id: 'sbs-v4-test-1',
      name: 'Test v4',
      status: 'ACTIVE',
      renewalMode: 'AUTOMATIC',
      currentPriceMinor: 1500,
      currency: 'EUR',
      billingIntervalUnit: 'MONTH',
      billingIntervalCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 3,
    })
    await v3Db.table('payments').put({
      id: 'pym-v4-test-1',
      subscriptionId: 'sbs-v4-test-1',
      scheduledDate: '2026-08-01',
      status: 'PROJECTED',
      amount: { amountMinor: 1500, currency: 'EUR' },
      source: 'GENERATED',
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 3,
    })
    v3Db.close()

    const upgradedDb = new SubscriptionDatabase({ name: dbName, skipCloud: true })
    await upgradedDb.open()

    const migratedSub = await upgradedDb.subscriptions.get('sbs-v4-test-1')
    expect(migratedSub?.currentPrice).toBe(15)
    expect(migratedSub?.currentPriceMinor).toBe(1500)
    expect(migratedSub?.schemaVersion).toBe(4)

    const migratedPayment = await upgradedDb.payments.get('pym-v4-test-1')
    expect(migratedPayment?.amount.amount).toBe(15)
    expect(migratedPayment?.amount.amountMinor).toBe(1500)

    upgradedDb.close()
  })
})
