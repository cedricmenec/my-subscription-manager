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

export type BillingInterval = 'WEEKLY' | 'MONTHLY' | 'YEARLY' | 'UNKNOWN'

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
  currentPriceMinor?: number
  currency?: string
  billingInterval?: BillingInterval
  renewalMode: RenewalMode
  startDate?: string
  nextChargeDate?: string
  pauseUntil?: string
  serviceEndDate?: string
  managementUrl?: string
  cancellationUrl?: string
  cancellationInstructions?: string
  notes?: string
}

export interface AppSettings extends SyncedEntity {
  key: 'main'
  baseCurrency: string
  timezone: string
  paymentAssumptionEnabled: boolean
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
  settings!: DexieCloudTable<AppSettings, 'id'>

  localSettings!: Table<LocalSetting, string>
  diagnosticLogs!: Table<DiagnosticLog, number>

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
          `${syncedPrimaryKey}, status, categoryId, renewalMode, billingInterval, nextChargeDate, updatedAt, archivedAt, deletedAt`,
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

    if (!options.skipCloud) {
      this.cloud.configure({
        databaseUrl: resolveCloudUrl(options.cloudUrl),
        requireAuth: true,
        tryUseServiceWorker: true,
        unsyncedTables: ['localSettings', 'diagnosticLogs'],
      })
    }
  }
}

export const db = new SubscriptionDatabase()

export function getCurrentSyncState(): SyncState {
  return db.cloud.syncState.getValue()
}
