import { afterEach, describe, expect, it } from 'vitest'
import { SubscriptionDatabase } from '../data/db'
import { SnapshotValidationError, restoreSnapshot, validateSnapshot } from './snapshot'

const createdDbNames: string[] = []

afterEach(async () => {
  while (createdDbNames.length > 0) {
    const name = createdDbNames.pop()
    if (name) await indexedDB.deleteDatabase(name)
  }
})

function snapshotWithDates(createdAt: unknown, updatedAt: unknown): unknown {
  return {
    format: 'abos-snapshot',
    version: 1,
    exportedAt: '2026-07-30T10:00:00.000Z',
    data: {
      subscriptions: [{
        id: 'sbs-test',
        name: 'Test',
        status: 'ACTIVE',
        renewalMode: 'AUTOMATIC',
        createdAt,
        updatedAt,
        schemaVersion: 8,
      }],
      categories: [],
      payments: [],
      settings: [],
    },
  }
}

describe('validateSnapshot', () => {
  it('rétablit les dates sérialisées par un export JSON', () => {
    const snapshot = validateSnapshot(snapshotWithDates(
      '2024-01-01T10:00:00.000Z',
      '2026-07-30T10:00:00.000Z',
    ))

    expect(snapshot.data.subscriptions[0].createdAt).toEqual(
      new Date('2024-01-01T10:00:00.000Z'),
    )
    expect(snapshot.data.subscriptions[0].updatedAt).toEqual(
      new Date('2026-07-30T10:00:00.000Z'),
    )
  })

  it('refuse une date invalide avant de restaurer le snapshot', () => {
    expect(() => validateSnapshot(snapshotWithDates(
      'date-invalide',
      '2026-07-30T10:00:00.000Z',
    ))).toThrow(SnapshotValidationError)
  })

  it('refuse un mode inconnu', () => {
    const raw = snapshotWithDates(
      '2024-01-01T10:00:00.000Z',
      '2026-07-30T10:00:00.000Z',
    ) as { data: { subscriptions: Array<Record<string, unknown>> } }
    raw.data.subscriptions[0].renewalMode = 'SURPRISE'
    expect(() => validateSnapshot(raw)).toThrow(SnapshotValidationError)
  })

  it('normalise un cas legacy et restaure les paiements sans les modifier', async () => {
    const raw = snapshotWithDates(
      '2024-01-01T10:00:00.000Z',
      '2026-07-30T10:00:00.000Z',
    ) as {
      data: {
        subscriptions: Array<Record<string, unknown>>
        payments: Array<Record<string, unknown>>
      }
    }
    Object.assign(raw.data.subscriptions[0], {
      billingIntervalUnit: 'MONTH', billingIntervalCount: 1,
      commitmentIntervalUnit: 'MONTH', commitmentIntervalCount: 1,
      nextChargeDate: '2026-08-15', nextRenewalDate: '2026-08-15',
    })
    raw.data.payments.push({
      id: 'pym-imported', subscriptionId: 'sbs-test', scheduledDate: '2026-07-15',
      paidDate: '2026-07-15', status: 'CONFIRMED_PAID',
      amount: { amount: 10, currency: 'EUR' }, source: 'IMPORTED',
      createdAt: '2026-07-15T10:00:00.000Z', updatedAt: '2026-07-15T10:00:00.000Z',
      schemaVersion: 8,
    })

    const snapshot = validateSnapshot(raw)
    expect(snapshot.data.subscriptions[0].renewalMode).toBe('AUTOMATIC')

    const dbName = `snapshot-rolling-${crypto.randomUUID()}`
    createdDbNames.push(dbName)
    const testDb = new SubscriptionDatabase({ name: dbName, skipCloud: true })
    await testDb.open()
    await restoreSnapshot(snapshot, testDb)
    expect(await testDb.payments.get('pym-imported')).toMatchObject({
      status: 'CONFIRMED_PAID', source: 'IMPORTED', amount: { amount: 10, currency: 'EUR' },
    })
    testDb.close()
  })
})
