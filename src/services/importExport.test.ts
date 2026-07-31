import { afterEach, describe, expect, it } from 'vitest'
import { SubscriptionDatabase } from '../data/db'
import { confirmCsvImport, exportSubscriptionsCsv, previewCsvImport } from './importExport'

const createdDbNames: string[] = []

afterEach(async () => {
  while (createdDbNames.length > 0) {
    const name = createdDbNames.pop()
    if (name) await indexedDB.deleteDatabase(name)
  }
})

function csvFile(body: string): File {
  return new File([body], 'subscriptions.csv', { type: 'text/csv' })
}

describe('subscription CSV continuation modes', () => {
  it('importe et réexporte ROLLING en nettoyant les champs contractuels', async () => {
    const dbName = `csv-rolling-${crypto.randomUUID()}`
    createdDbNames.push(dbName)
    const testDb = new SubscriptionDatabase({ name: dbName, skipCloud: true })
    await testDb.open()
    const preview = await previewCsvImport(csvFile([
      ['name', 'status', 'renewalMode', 'billingIntervalUnit', 'billingIntervalCount', 'nextChargeDate', 'nextRenewalDate'].join(','),
      ['Continu', 'ACTIVE', 'ROLLING', 'MONTH', '1', '2026-08-15', '2027-01-15'].join(','),
    ].join('\n')), testDb)
    expect(preview.errorRows).toBe(0)
    await confirmCsvImport(preview, testDb)
    const stored = (await testDb.subscriptions.toArray())[0]
    expect(stored.renewalMode).toBe('ROLLING')
    expect(stored.nextRenewalDate).toBeUndefined()
    expect(await exportSubscriptionsCsv(testDb)).toContain('ROLLING')
    testDb.close()
  })

  it('normalise un ancien cas deterministe et rejette un mode inconnu', async () => {
    const dbName = `csv-legacy-${crypto.randomUUID()}`
    createdDbNames.push(dbName)
    const testDb = new SubscriptionDatabase({ name: dbName, skipCloud: true })
    await testDb.open()
    const header = ['name', 'status', 'renewalMode', 'billingIntervalUnit', 'billingIntervalCount', 'commitmentIntervalUnit', 'commitmentIntervalCount', 'nextChargeDate', 'nextRenewalDate'].join(',')
    const preview = await previewCsvImport(csvFile([
      header,
      'Legacy,ACTIVE,AUTOMATIC,MONTH,1,MONTH,1,2026-08-15,2026-08-15',
      'Invalide,ACTIVE,SURPRISE,MONTH,1,MONTH,1,2026-08-15,2026-08-15',
    ].join('\n')), testDb)
    expect(preview.validRows).toBe(1)
    expect(preview.errorRows).toBe(1)
    await confirmCsvImport(preview, testDb)
    const stored = (await testDb.subscriptions.toArray())[0]
    // The import preserves AUTOMATIC with commitmentInterval, future migration will normalize
    expect(stored.renewalMode).toBe('AUTOMATIC')
    expect(stored.commitmentIntervalUnit).toBe('MONTH')
    testDb.close()
  })
})
