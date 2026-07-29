import Dexie, { type Table } from 'dexie'
import dexieCloud, { type DexieCloudTable, type SyncState } from 'dexie-cloud-addon'

export const DEFAULT_DB_NAME = 'subscription-manager-db'
const FALLBACK_DEXIE_CLOUD_URL = 'https://invalid.dexie.cloud'

export interface SyncedEntity {
  id: string
  createdAt: Date
  updatedAt: Date
  schemaVersion: number
  deletedAt?: Date
}

export type SubscriptionStatus =
  | 'TRIAL'
  | 'ACTIVE'
  | 'PAUSED'
  | 'CANCELLED_PENDING_END'
  | 'ENDED'
  | 'UNKNOWN'

export type RenewalMode = 'AUTOMATIC' | 'MANUAL' | 'UNKNOWN'

export type LegacyBillingInterval = 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'UNKNOWN'

export type IntervalUnit = 'DAY' | 'WEEK' | 'MONTH' | 'YEAR'

export interface Money {
  amount: number
  currency: string
}

export type PaymentStatus =
  | 'PROJECTED'
  | 'ASSUMED_PAID'
  | 'CONFIRMED_PAID'
  | 'SKIPPED'
  | 'REFUNDED'

export type PaymentSource = 'GENERATED' | 'IMPORTED' | 'MANUAL' | 'N8N'

export interface Category extends SyncedEntity {
  name: string
  sortOrder?: number
}

export interface Subscription extends SyncedEntity {
  name: string
  provider?: string
  planName?: string
  categoryId?: string
  status: SubscriptionStatus
  archivedAt?: Date
  currentPrice?: number
  currency?: string
  billingIntervalUnit?: IntervalUnit
  billingIntervalCount?: number
  commitmentIntervalUnit?: IntervalUnit
  commitmentIntervalCount?: number
  renewalIntervalUnit?: IntervalUnit
  renewalIntervalCount?: number
  renewalMode: RenewalMode
  startDate?: string
  nextChargeDate?: string
  nextRenewalDate?: string
  renewalStartDate?: string
  commitmentStartDate?: string
  pauseUntil?: string
  pauseStartDate?: string
  serviceEndDate?: string
  managementUrl?: string
  cancellationUrl?: string
  cancellationInstructions?: string
  notes?: string
}

export interface Payment extends SyncedEntity {
  subscriptionId: string
  scheduledDate: string
  paidDate?: string
  status: PaymentStatus
  amount: Money
  source: PaymentSource
  externalReference?: string
  notes?: string
  correctedAt?: Date
}

export interface AppSettings extends SyncedEntity {
  key: 'main'
  baseCurrency: string
  timezone: string
  paymentAssumptionEnabled: boolean
  paymentAssumptionDelayDays: number
  exchangeRates?: Record<string, number>
}

export interface LocalSetting {
  key: string
  value: string
  updatedAt: Date
}

export interface DiagnosticLog {
  id?: number
  timestamp: Date
  category: string
  message: string
}

export interface CalculationState {
  key: string
  value: string
  updatedAt: Date
}

export interface ImportPreviewRow {
  id: string
  rowNumber: number
  status: 'valid' | 'warning' | 'error'
  message: string
  data?: Record<string, unknown>
}

export interface Draft {
  id: string
  entityType: string
  value: string
  updatedAt: Date
}

export interface ImportReport {
  totalRows: number
  created: number
  updated: number
  warnings: Array<{ row: number; message: string }>
  errors: Array<{ row: number; message: string }>
}

export interface SnapshotEnvelope {
  format: 'abos-snapshot'
  version: number
  exportedAt: string
  data: {
    subscriptions: Subscription[]
    categories: Category[]
    payments: Payment[]
    settings: AppSettings[]
  }
}

export interface SubscriptionDatabaseOptions {
  name?: string
  cloudUrl?: string
  skipCloud?: boolean
}

function resolveCloudUrl(value?: string): string {
  const fromEnv = value ?? import.meta.env.VITE_DEXIE_CLOUD_URL
  return fromEnv && fromEnv.trim().length > 0
    ? fromEnv.trim()
    : FALLBACK_DEXIE_CLOUD_URL
}

export class SubscriptionDatabase extends Dexie {
  subscriptions!: DexieCloudTable<Subscription, 'id'>
  categories!: DexieCloudTable<Category, 'id'>
  payments!: DexieCloudTable<Payment, 'id'>
  settings!: DexieCloudTable<AppSettings, 'id'>

  localSettings!: Table<LocalSetting, string>
  diagnosticLogs!: Table<DiagnosticLog, number>
  calculationState!: Table<CalculationState, string>
  importPreview!: Table<ImportPreviewRow, string>
  drafts!: Table<Draft, string>

  constructor(options: SubscriptionDatabaseOptions = {}) {
    super(
      options.name ?? DEFAULT_DB_NAME,
      options.skipCloud ? undefined : { addons: [dexieCloud] },
    )

    const syncedPrimaryKey = options.skipCloud ? 'id' : '@id'

    this.version(1).stores({
      subscriptions: `${syncedPrimaryKey}, status, renewalMode, nextChargeDate, updatedAt, deletedAt`,
      settings: `${syncedPrimaryKey}, &key, updatedAt`,
      localSettings: '&key, updatedAt',
      diagnosticLogs: '++id, timestamp, category',
    })

    this.version(2)
      .stores({
        subscriptions:
          `${syncedPrimaryKey}, status, categoryId, renewalMode, nextChargeDate, updatedAt, archivedAt, deletedAt`,
        categories: `${syncedPrimaryKey}, &name, sortOrder, updatedAt`,
        settings: `${syncedPrimaryKey}, &key, updatedAt`,
        localSettings: '&key, updatedAt',
        diagnosticLogs: '++id, timestamp, category',
      })
      .upgrade(tx =>
        tx
          .table('subscriptions')
          .toCollection()
          .modify((subscription: Partial<Subscription>) => {
            if (!subscription.status) {
              subscription.status = 'UNKNOWN'
            }

            if (!subscription.renewalMode) {
              subscription.renewalMode = 'UNKNOWN'
            }

            if (!subscription.schemaVersion || subscription.schemaVersion < 2) {
              subscription.schemaVersion = 2
            }

            if (!subscription.updatedAt) {
              subscription.updatedAt = new Date()
            }
          }),
      )

    this.version(3)
      .stores({
        subscriptions:
          `${syncedPrimaryKey}, status, categoryId, renewalMode, billingIntervalUnit, nextChargeDate, updatedAt, archivedAt, deletedAt`,
        categories: `${syncedPrimaryKey}, &name, sortOrder, updatedAt`,
        payments:
          `${syncedPrimaryKey}, subscriptionId, scheduledDate, paidDate, status, [subscriptionId+scheduledDate], updatedAt, deletedAt`,
        settings: `${syncedPrimaryKey}, &key, updatedAt`,
        localSettings: '&key, updatedAt',
        diagnosticLogs: '++id, timestamp, category',
      })
      .upgrade(async tx => {
        await tx
          .table('subscriptions')
          .toCollection()
          .modify((subscription: Partial<Subscription> & { billingInterval?: LegacyBillingInterval }) => {
            const legacyInterval = subscription.billingInterval
            const mappedInterval = mapLegacyBillingInterval(legacyInterval)

            if (!subscription.billingIntervalUnit && mappedInterval) {
              subscription.billingIntervalUnit = mappedInterval.unit
              subscription.billingIntervalCount = mappedInterval.count
            }

            if (!subscription.renewalIntervalUnit && mappedInterval) {
              subscription.renewalIntervalUnit = mappedInterval.unit
              subscription.renewalIntervalCount = mappedInterval.count
            }

            if (!subscription.schemaVersion || subscription.schemaVersion < 3) {
              subscription.schemaVersion = 3
            }

            if (!subscription.updatedAt) {
              subscription.updatedAt = new Date()
            }

            delete subscription.billingInterval
          })

        await tx
          .table('settings')
          .toCollection()
          .modify((settings: Partial<AppSettings>) => {
            if (typeof settings.paymentAssumptionDelayDays !== 'number') {
              settings.paymentAssumptionDelayDays = 0
            }

            if (!settings.schemaVersion || settings.schemaVersion < 3) {
              settings.schemaVersion = 3
            }

            if (!settings.updatedAt) {
              settings.updatedAt = new Date()
            }
          })
      })

    this.version(4)
      .stores({
        subscriptions:
          `${syncedPrimaryKey}, status, categoryId, renewalMode, billingIntervalUnit, nextChargeDate, updatedAt, archivedAt, deletedAt`,
        categories: `${syncedPrimaryKey}, &name, sortOrder, updatedAt`,
        payments:
          `${syncedPrimaryKey}, subscriptionId, scheduledDate, paidDate, status, [subscriptionId+scheduledDate], updatedAt, deletedAt`,
        settings: `${syncedPrimaryKey}, &key, updatedAt`,
        localSettings: '&key, updatedAt',
        diagnosticLogs: '++id, timestamp, category',
      })
      .upgrade(async tx => {
        await tx
          .table('subscriptions')
          .toCollection()
          .modify((subscription: Partial<Subscription>) => {
            if (typeof (subscription as unknown as Record<string, unknown>).currentPriceMinor === 'number') {
              const minor = (subscription as unknown as Record<string, unknown>).currentPriceMinor as number
              subscription.currentPrice = minor / 100
            }

            if (!subscription.schemaVersion || subscription.schemaVersion < 4) {
              subscription.schemaVersion = 4
            }

            if (!subscription.updatedAt) {
              subscription.updatedAt = new Date()
            }
          })

        await tx
          .table('payments')
          .toCollection()
          .modify((payment: Partial<Payment>) => {
            if (payment.amount && typeof (payment.amount as unknown as Record<string, unknown>).amountMinor === 'number') {
              const minor = (payment.amount as unknown as Record<string, unknown>).amountMinor as number
              payment.amount.amount = minor / 100
            }

            if (!payment.schemaVersion || payment.schemaVersion < 4) {
              payment.schemaVersion = 4
            }

            if (!payment.updatedAt) {
              payment.updatedAt = new Date()
            }
          })

        await tx
          .table('settings')
          .toCollection()
          .modify((settings: Partial<AppSettings>) => {
            if (!settings.schemaVersion || settings.schemaVersion < 4) {
              settings.schemaVersion = 4
            }

            if (!settings.updatedAt) {
              settings.updatedAt = new Date()
            }
          })
      })

    this.version(5)
      .stores({
        subscriptions:
          `${syncedPrimaryKey}, status, categoryId, renewalMode, billingIntervalUnit, nextChargeDate, updatedAt, archivedAt, deletedAt`,
        categories: `${syncedPrimaryKey}, &name, sortOrder, updatedAt`,
        payments:
          `${syncedPrimaryKey}, subscriptionId, scheduledDate, paidDate, status, [subscriptionId+scheduledDate], updatedAt, deletedAt`,
        settings: `${syncedPrimaryKey}, &key, updatedAt`,
        localSettings: '&key, updatedAt',
        diagnosticLogs: '++id, timestamp, category',
      })
      .upgrade(async tx => {
        await tx
          .table('subscriptions')
          .toCollection()
          .modify((subscription: Partial<Subscription>) => {
            delete (subscription as unknown as Record<string, unknown>).currentPriceMinor
            delete (subscription as unknown as Record<string, unknown>).billingInterval
            subscription.schemaVersion = 5
          })

        await tx
          .table('payments')
          .toCollection()
          .modify((payment: Partial<Payment>) => {
            if (payment.amount) {
              delete (payment.amount as unknown as Record<string, unknown>).amountMinor
            }
            payment.schemaVersion = 5
          })

        await tx
          .table('settings')
          .toCollection()
          .modify((settings: Partial<AppSettings>) => {
            settings.schemaVersion = 5
          })
      })

    this.version(6)
      .stores({
        subscriptions:
          `${syncedPrimaryKey}, status, categoryId, renewalMode, billingIntervalUnit, nextChargeDate, updatedAt, archivedAt, deletedAt`,
        categories: `${syncedPrimaryKey}, &name, sortOrder, updatedAt`,
        payments:
          `${syncedPrimaryKey}, subscriptionId, scheduledDate, paidDate, status, [subscriptionId+scheduledDate], updatedAt, deletedAt`,
        settings: `${syncedPrimaryKey}, &key, updatedAt`,
        localSettings: '&key, updatedAt',
        diagnosticLogs: '++id, timestamp, category',
        importPreview: '&id, rowNumber, status',
        drafts: '&id, entityType, updatedAt',
      })
      .upgrade(async tx => {
        await tx
          .table('subscriptions')
          .toCollection()
          .modify((subscription: Partial<Subscription>) => {
            subscription.schemaVersion = 6
          })

        await tx
          .table('payments')
          .toCollection()
          .modify((payment: Partial<Payment>) => {
            payment.schemaVersion = 6
          })

        await tx
          .table('settings')
          .toCollection()
          .modify((settings: Partial<AppSettings>) => {
            settings.schemaVersion = 6
          })
      })

    this.version(7)
      .stores({
        subscriptions:
          `${syncedPrimaryKey}, status, categoryId, renewalMode, billingIntervalUnit, nextChargeDate, nextRenewalDate, updatedAt, archivedAt, deletedAt`,
        categories: `${syncedPrimaryKey}, &name, sortOrder, updatedAt`,
        payments:
          `${syncedPrimaryKey}, subscriptionId, scheduledDate, paidDate, status, [subscriptionId+scheduledDate], updatedAt, deletedAt`,
        settings: `${syncedPrimaryKey}, &key, updatedAt`,
        localSettings: '&key, updatedAt',
        diagnosticLogs: '++id, timestamp, category',
        importPreview: '&id, rowNumber, status',
        drafts: '&id, entityType, updatedAt',
      })
      .upgrade(async tx => {
        await tx
          .table('subscriptions')
          .toCollection()
          .modify((subscription: Partial<Subscription>) => {
            subscription.schemaVersion = 7
          })

        await tx
          .table('payments')
          .toCollection()
          .modify((payment: Partial<Payment>) => {
            payment.schemaVersion = 7
          })

        await tx
          .table('settings')
          .toCollection()
          .modify((settings: Partial<AppSettings>) => {
            settings.schemaVersion = 7
          })
      })

    this.version(8)
      .stores({
        subscriptions:
          `${syncedPrimaryKey}, status, categoryId, renewalMode, billingIntervalUnit, nextChargeDate, nextRenewalDate, updatedAt, archivedAt, deletedAt`,
        categories: `${syncedPrimaryKey}, &name, sortOrder, updatedAt`,
        payments:
          `${syncedPrimaryKey}, subscriptionId, scheduledDate, paidDate, status, [subscriptionId+scheduledDate], updatedAt, deletedAt`,
        settings: `${syncedPrimaryKey}, &key, updatedAt`,
        localSettings: '&key, updatedAt',
        diagnosticLogs: '++id, timestamp, category',
        calculationState: '&key, updatedAt',
        importPreview: '&id, rowNumber, status',
        drafts: '&id, entityType, updatedAt',
      })

    if (!options.skipCloud) {
      this.cloud.configure({
        databaseUrl: resolveCloudUrl(options.cloudUrl),
        requireAuth: true,
        tryUseServiceWorker: true,
        unsyncedTables: ['localSettings', 'diagnosticLogs', 'calculationState', 'importPreview', 'drafts'],
      })
    }
  }
}

export const db = new SubscriptionDatabase()

export function getCurrentSyncState(): SyncState {
  return db.cloud.syncState.getValue()
}

function mapLegacyBillingInterval(
  interval?: LegacyBillingInterval,
): { unit: IntervalUnit; count: number } | undefined {
  switch (interval) {
    case 'WEEKLY':
      return { unit: 'WEEK', count: 1 }
    case 'MONTHLY':
      return { unit: 'MONTH', count: 1 }
    case 'YEARLY':
      return { unit: 'YEAR', count: 1 }
    default:
      return undefined
  }
}
