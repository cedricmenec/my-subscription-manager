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
  it('configure le schéma v2 avec categories et requireAuth', () => {
    const dbName = `test-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    const testDb = new SubscriptionDatabase({
      name: dbName,
      cloudUrl: 'https://invalid.dexie.cloud',
    })

    expect(testDb.verno).toBe(2)
    expect(testDb.tables.map(table => table.name)).toEqual(
      expect.arrayContaining([
        'subscriptions',
        'categories',
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

  it('migre les abonnements v1 en v2 avec renewalMode et schemaVersion', async () => {
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
    expect(migrated?.schemaVersion).toBe(2)

    upgradedDb.close()
  })
})
