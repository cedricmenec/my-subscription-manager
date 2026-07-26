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
  it('configure le schéma v1 avec séparation sync/local et requireAuth', () => {
    const dbName = `test-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    const testDb = new SubscriptionDatabase({
      name: dbName,
      cloudUrl: 'https://invalid.dexie.cloud',
    })

    expect(testDb.verno).toBe(1)
    expect(testDb.tables.map(table => table.name)).toEqual(
      expect.arrayContaining([
        'subscriptions',
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
})
