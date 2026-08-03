import { db, type RenewalMode, type SnapshotEnvelope, type SubscriptionDatabase } from '../data/db'
import { normalizeSubscriptionContinuation } from './renewal'

const SYNCED_ENTITY_DATE_FIELDS = ['createdAt', 'updatedAt', 'deletedAt'] as const
const SUBSCRIPTION_DATE_FIELDS = [...SYNCED_ENTITY_DATE_FIELDS, 'archivedAt'] as const
const PAYMENT_DATE_FIELDS = [...SYNCED_ENTITY_DATE_FIELDS, 'correctedAt'] as const
const VALID_RENEWAL_MODES: RenewalMode[] = ['ROLLING', 'AUTOMATIC', 'UNKNOWN']

export class SnapshotValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'SnapshotValidationError'
  }
}

/**
 * Exporte toutes les données synchronisées dans une enveloppe de snapshot JSON.
 */
export async function exportSnapshot(
  database: SubscriptionDatabase = db,
): Promise<SnapshotEnvelope> {
  const [subscriptions, categories, payments, settings] = await Promise.all([
    database.subscriptions.toArray(),
    database.categories.toArray(),
    database.payments.toArray(),
    database.settings.toArray(),
  ])

  return {
    format: 'abos-snapshot',
    version: 1,
    exportedAt: new Date().toISOString(),
    data: {
      subscriptions,
      categories,
      payments,
      settings,
    },
  }
}

function reviveEntityDates<T>(
  entity: T,
  fields: readonly string[],
  location: string,
): T {
  if (!entity || typeof entity !== 'object') {
    throw new SnapshotValidationError(`${location} doit être un objet.`)
  }

  const revived = { ...entity } as Record<string, unknown>

  for (const field of fields) {
    const value = revived[field]
    if (value === undefined) continue

    const date = value instanceof Date
      ? value
      : typeof value === 'string' || typeof value === 'number'
        ? new Date(value)
        : undefined

    if (!date || Number.isNaN(date.getTime())) {
      throw new SnapshotValidationError(
        `${location}.${field} contient une date invalide.`,
      )
    }

    revived[field] = date
  }

  return revived as T
}

/**
 * Valide la structure d'un objet censé être un snapshot.
 * Lance SnapshotValidationError si le format est invalide.
 */
export function validateSnapshot(raw: unknown): SnapshotEnvelope {
  if (!raw || typeof raw !== 'object') {
    throw new SnapshotValidationError('Le fichier ne contient pas un objet JSON valide.')
  }

  const envelope = raw as Record<string, unknown>

  if (envelope.format !== 'abos-snapshot') {
    throw new SnapshotValidationError(
      `Format inconnu: "${String(envelope.format)}". Attendu: "abos-snapshot".`,
    )
  }

  if (typeof envelope.version !== 'number' || envelope.version < 1) {
    throw new SnapshotValidationError(
      `Version de snapshot invalide ou manquante: ${String(envelope.version)}.`,
    )
  }

  if (!envelope.data || typeof envelope.data !== 'object') {
    throw new SnapshotValidationError('Le snapshot ne contient pas de section "data".')
  }

  const data = envelope.data as Record<string, unknown>

  if (!Array.isArray(data.subscriptions)) {
    throw new SnapshotValidationError('La section data.subscriptions est manquante ou invalide.')
  }

  if (!Array.isArray(data.categories)) {
    throw new SnapshotValidationError('La section data.categories est manquante ou invalide.')
  }

  if (!Array.isArray(data.payments)) {
    throw new SnapshotValidationError('La section data.payments est manquante ou invalide.')
  }

  if (!Array.isArray(data.settings)) {
    throw new SnapshotValidationError('La section data.settings est manquante ou invalide.')
  }

  const snapshot = envelope as unknown as SnapshotEnvelope

  return {
    ...snapshot,
    data: {
      subscriptions: snapshot.data.subscriptions.map((subscription, index) => {
        const revived = reviveEntityDates(
          subscription,
          SUBSCRIPTION_DATE_FIELDS,
          `data.subscriptions[${index}]`,
        )
        if (!VALID_RENEWAL_MODES.includes(revived.renewalMode)) {
          throw new SnapshotValidationError(
            `data.subscriptions[${index}].renewalMode contient une valeur inconnue.`,
          )
        }
        return normalizeSubscriptionContinuation(revived)
      }),
      categories: snapshot.data.categories.map((category, index) =>
        reviveEntityDates(
          category,
          SYNCED_ENTITY_DATE_FIELDS,
          `data.categories[${index}]`,
        ),
      ),
      payments: snapshot.data.payments.map((payment, index) =>
        reviveEntityDates(
          payment,
          PAYMENT_DATE_FIELDS,
          `data.payments[${index}]`,
        ),
      ),
      settings: snapshot.data.settings.map((settings, index) =>
        reviveEntityDates(
          settings,
          SYNCED_ENTITY_DATE_FIELDS,
          `data.settings[${index}]`,
        ),
      ),
    },
  }
}

/**
 * Restaure un snapshot en remplaçant atomiquement toutes les données.
 * 1. Supprime logiquement (soft delete) toutes les entités existantes.
 * 2. Importe toutes les entités du snapshot dans une transaction rw multi-table.
 */
export async function restoreSnapshot(
  snapshot: SnapshotEnvelope,
  database: SubscriptionDatabase = db,
): Promise<{ subscriptions: number; categories: number; payments: number; settings: number }> {
  const now = new Date()

  await database.transaction(
    'rw',
    database.subscriptions,
    database.categories,
    database.payments,
    database.settings,
    async () => {
      // Soft delete all existing data
      const existingSubscriptions = await database.subscriptions.toArray()
      const existingCategories = await database.categories.toArray()
      const existingPayments = await database.payments.toArray()
      const existingSettings = await database.settings.toArray()

      for (const sub of existingSubscriptions) {
        await database.subscriptions.put({ ...sub, deletedAt: now, updatedAt: now })
      }
      for (const cat of existingCategories) {
        await database.categories.put({ ...cat, deletedAt: now, updatedAt: now })
      }
      for (const pym of existingPayments) {
        await database.payments.put({ ...pym, deletedAt: now, updatedAt: now })
      }
      for (const stt of existingSettings) {
        await database.settings.put({ ...stt, deletedAt: now, updatedAt: now })
      }

      // Import snapshot data
      for (const sub of snapshot.data.subscriptions) {
        await database.subscriptions.put(normalizeSubscriptionContinuation({
          ...sub,
          deletedAt: undefined,
        }))
      }
      for (const cat of snapshot.data.categories) {
        await database.categories.put({ ...cat, deletedAt: undefined })
      }
      for (const pym of snapshot.data.payments) {
        await database.payments.put({ ...pym, deletedAt: undefined })
      }
      for (const stt of snapshot.data.settings) {
        await database.settings.put({ ...stt, deletedAt: undefined })
      }
    },
  )

  return {
    subscriptions: snapshot.data.subscriptions.length,
    categories: snapshot.data.categories.length,
    payments: snapshot.data.payments.length,
    settings: snapshot.data.settings.length,
  }
}

/**
 * Télécharge un fichier JSON dans le navigateur.
 */
export function downloadJson(data: unknown, filename: string): void {
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/**
 * Télécharge un fichier CSV dans le navigateur.
 */
export function downloadCsv(content: string, filename: string): void {
  const blob = new Blob([content], { type: 'text/csv;charset=utf-8;' })
  const url = URL.createObjectURL(blob)
  const anchor = document.createElement('a')
  anchor.href = url
  anchor.download = filename
  anchor.click()
  URL.revokeObjectURL(url)
}

/**
 * Lit un fichier sélectionné par l'utilisateur et retourne son contenu texte.
 */
export function readFileAsText(file: File): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader()
    reader.onload = () => resolve(reader.result as string)
    reader.onerror = () => reject(new Error('Impossible de lire le fichier.'))
    reader.readAsText(file)
  })
}

/**
 * Lit un fichier sélectionné par l'utilisateur et retourne son contenu JSON parsé.
 */
export async function readFileAsJson<T = unknown>(file: File): Promise<T> {
  const text = await readFileAsText(file)
  try {
    return JSON.parse(text) as T
  } catch {
    throw new SnapshotValidationError('Le fichier JSON est mal formé.')
  }
}
