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

export interface Subscription extends SyncedEntity {
  name: string
  status: SubscriptionStatus
  renewalMode: RenewalMode
  nextChargeDate?: string
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
  settings!: DexieCloudTable<AppSettings, 'id'>

  localSettings!: Table<LocalSetting, string>
  diagnosticLogs!: Table<DiagnosticLog, number>

  constructor(options: SubscriptionDatabaseOptions = {}) {
    super(options.name ?? DEFAULT_DB_NAME, { addons: [dexieCloud] })

    this.version(1).stores({
      subscriptions: '@id, status, renewalMode, nextChargeDate, updatedAt, deletedAt',
      settings: '@id, &key, updatedAt',
      localSettings: '&key, updatedAt',
      diagnosticLogs: '++id, timestamp, category',
    })

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
