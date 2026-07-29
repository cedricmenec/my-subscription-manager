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

    expect(testDb.verno).toBe(8)
    expect(testDb.tables.map(table => table.name)).toEqual(
      expect.arrayContaining([
        'subscriptions',
        'categories',
        'payments',
        'settings',
        'localSettings',
        'diagnosticLogs',
        'importPreview',
        'drafts',
      ]),
    )

    expect(testDb.subscriptions.schema.primKey.auto).toBe(false)
    expect(testDb.settings.schema.primKey.auto).toBe(false)

    expect(testDb.cloud.options?.requireAuth).toBe(true)
    expect(testDb.cloud.options?.unsyncedTables).toEqual(
      expect.arrayContaining(['localSettings', 'diagnosticLogs', 'importPreview', 'drafts']),
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
    expect(migrated?.schemaVersion).toBe(7)

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
    expect(migratedSub?.schemaVersion).toBe(7)

    const migratedPayment = await upgradedDb.payments.get('pym-v4-test-1')
    expect(migratedPayment?.amount.amount).toBe(15)
    expect(migratedPayment?.schemaVersion).toBe(7)

    upgradedDb.close()
  })

  it('supprime les champs legacy en v5 : currentPriceMinor, amountMinor, billingInterval', async () => {
    const dbName = `migration-v5-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    class V4Db extends Dexie {
      constructor(name: string) {
        super(name)
        this.version(4).stores({
          subscriptions: 'id, status, categoryId, renewalMode, billingIntervalUnit, nextChargeDate, updatedAt, archivedAt, deletedAt',
          categories: 'id, &name, sortOrder, updatedAt',
          payments: 'id, subscriptionId, scheduledDate, paidDate, status, [subscriptionId+scheduledDate], updatedAt, deletedAt',
          settings: 'id, &key, updatedAt',
          localSettings: '&key, updatedAt',
          diagnosticLogs: '++id, timestamp, category',
        })
      }
    }

    const v4Db = new V4Db(dbName)
    await v4Db.open()
    await v4Db.table('subscriptions').put({
      id: 'sbs-v5-test-1',
      name: 'Test v5',
      status: 'ACTIVE',
      renewalMode: 'AUTOMATIC',
      currentPriceMinor: 1500,
      currentPrice: 15.00,
      billingInterval: 'MONTHLY',
      currency: 'EUR',
      billingIntervalUnit: 'MONTH',
      billingIntervalCount: 1,
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 4,
    })
    await v4Db.table('payments').put({
      id: 'pym-v5-test-1',
      subscriptionId: 'sbs-v5-test-1',
      scheduledDate: '2026-08-01',
      status: 'PROJECTED',
      amount: { amountMinor: 1500, amount: 15.00, currency: 'EUR' },
      source: 'GENERATED',
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 4,
    })
    v4Db.close()

    const upgradedDb = new SubscriptionDatabase({ name: dbName, skipCloud: true })
    await upgradedDb.open()

    const migratedSub = await upgradedDb.subscriptions.get('sbs-v5-test-1')
    expect(migratedSub?.currentPrice).toBe(15.00)
    expect((migratedSub as unknown as Record<string, unknown>).currentPriceMinor).toBeUndefined()
    expect((migratedSub as unknown as Record<string, unknown>).billingInterval).toBeUndefined()
    expect(migratedSub?.schemaVersion).toBe(7)

    const migratedPayment = await upgradedDb.payments.get('pym-v5-test-1')
    expect(migratedPayment?.amount.amount).toBe(15.00)
    expect((migratedPayment?.amount as unknown as Record<string, unknown>).amountMinor).toBeUndefined()
    expect(migratedPayment?.schemaVersion).toBe(7)

    upgradedDb.close()
  })
})
