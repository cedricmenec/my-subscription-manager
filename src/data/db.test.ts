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

    expect(testDb.verno).toBe(10)
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
    expect(migrated?.commitmentIntervalUnit).toBe('MONTH')
    expect(migrated?.commitmentIntervalCount).toBe(1)
    expect(migrated?.schemaVersion).toBe(10)

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
    expect(migratedSub?.schemaVersion).toBe(10)

    const migratedPayment = await upgradedDb.payments.get('pym-v4-test-1')
    expect(migratedPayment?.amount.amount).toBe(15)
    expect(migratedPayment?.schemaVersion).toBe(8)

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
    expect(migratedSub?.schemaVersion).toBe(10)

    const migratedPayment = await upgradedDb.payments.get('pym-v5-test-1')
    expect(migratedPayment?.amount.amount).toBe(15.00)
    expect((migratedPayment?.amount as unknown as Record<string, unknown>).amountMinor).toBeUndefined()
    expect(migratedPayment?.schemaVersion).toBe(8)

    upgradedDb.close()
  })

  it('migre en v9 uniquement les reconductions continues déterministes sans toucher aux paiements', async () => {
    const dbName = `migration-v9-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    class V8Db extends Dexie {
      constructor(name: string) {
        super(name)
        this.version(8).stores({
          subscriptions: 'id, status, categoryId, renewalMode, billingIntervalUnit, nextChargeDate, nextRenewalDate, updatedAt, archivedAt, deletedAt',
          categories: 'id, &name, sortOrder, updatedAt',
          payments: 'id, subscriptionId, scheduledDate, paidDate, status, [subscriptionId+scheduledDate], updatedAt, deletedAt',
          settings: 'id, &key, updatedAt',
          localSettings: '&key, updatedAt',
          diagnosticLogs: '++id, timestamp, category',
          calculationState: '&key, updatedAt',
          importPreview: '&id, rowNumber, status',
          drafts: '&id, entityType, updatedAt',
        })
      }
    }

    const timestamp = new Date('2026-07-01T10:00:00Z')
    const v8Db = new V8Db(dbName)
    await v8Db.open()
    await v8Db.table('subscriptions').bulkPut([
      {
        id: 'sbs-deterministic', name: 'Continu', status: 'ACTIVE',
        renewalMode: 'AUTOMATIC', billingIntervalUnit: 'MONTH', billingIntervalCount: 1,
        renewalIntervalUnit: 'MONTH', renewalIntervalCount: 1,
        nextChargeDate: '2026-08-15', nextRenewalDate: '2026-08-15',
        renewalPeriodStartDate: '2026-01-15', notifyBeforeRenewal: true,
        notifyBeforeRenewalDays: 7, createdAt: timestamp, updatedAt: timestamp, schemaVersion: 8,
      },
      {
        id: 'sbs-annual', name: 'Annuel', status: 'ACTIVE',
        renewalMode: 'AUTOMATIC', billingIntervalUnit: 'YEAR', billingIntervalCount: 1,
        renewalIntervalUnit: 'YEAR', renewalIntervalCount: 1,
        nextChargeDate: '2027-01-01', nextRenewalDate: '2027-01-01',
        createdAt: timestamp, updatedAt: timestamp, schemaVersion: 8,
      },
      {
        id: 'sbs-ambiguous', name: 'Ambigu', status: 'ACTIVE',
        renewalMode: 'AUTOMATIC', billingIntervalUnit: 'MONTH', billingIntervalCount: 1,
        renewalIntervalUnit: 'MONTH', renewalIntervalCount: 1,
        nextChargeDate: '2026-08-15', nextRenewalDate: '2026-09-15',
        createdAt: timestamp, updatedAt: timestamp, schemaVersion: 8,
      },
    ])
    await v8Db.table('payments').put({
      id: 'pym-real', subscriptionId: 'sbs-deterministic', scheduledDate: '2026-07-15',
      paidDate: '2026-07-15', status: 'CONFIRMED_PAID', amount: { amount: 12, currency: 'EUR' },
      source: 'IMPORTED', notes: 'preuve conservée', createdAt: timestamp, updatedAt: timestamp,
      schemaVersion: 8,
    })
    v8Db.close()

    let upgradedDb = new SubscriptionDatabase({ name: dbName, skipCloud: true })
    await upgradedDb.open()

    const deterministic = await upgradedDb.subscriptions.get('sbs-deterministic')
    expect(deterministic).toMatchObject({
      renewalMode: 'ROLLING',
      billingIntervalUnit: 'MONTH',
      billingIntervalCount: 1,
      schemaVersion: 10,
    })
    expect(deterministic).not.toHaveProperty('renewalIntervalUnit')
    expect(deterministic?.nextRenewalDate).toBeUndefined()
    expect((await upgradedDb.subscriptions.get('sbs-annual'))?.renewalMode).toBe('AUTOMATIC')
    expect((await upgradedDb.subscriptions.get('sbs-annual'))?.commitmentIntervalUnit).toBe('YEAR')
    expect((await upgradedDb.subscriptions.get('sbs-ambiguous'))?.renewalMode).toBe('ROLLING')
    const logs = (await upgradedDb.diagnosticLogs.toArray()).map(log => log.message)
    expect(logs.some(msg => msg.includes('ambiguous-non-annual-to-rolling'))).toBe(true)
    expect(logs.some(msg => msg.includes('sbs-ambiguous'))).toBe(true)
    expect(await upgradedDb.payments.get('pym-real')).toMatchObject({
      status: 'CONFIRMED_PAID',
      source: 'IMPORTED',
      notes: 'preuve conservée',
      amount: { amount: 12, currency: 'EUR' },
    })

    upgradedDb.close()
    upgradedDb = new SubscriptionDatabase({ name: dbName, skipCloud: true })
    await upgradedDb.open()
    expect(await upgradedDb.subscriptions.get('sbs-deterministic')).toEqual(deterministic)
    upgradedDb.close()
  })
})
