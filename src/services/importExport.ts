import {
  db,
  type ImportReport,
  type Subscription,
  type SubscriptionDatabase,
  type SubscriptionStatus,
  type RenewalMode,
  type IntervalUnit,
} from '../data/db'
import { parseCsv, csvRowsToObjects, generateCsv } from './csvParser'
import { isValidCivilDate } from './subscriptionValidation'
import { normalizeSubscriptionContinuation } from './renewal'

const VALID_STATUSES: SubscriptionStatus[] = [
  'TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED_PENDING_END', 'ENDED', 'UNKNOWN',
]

const VALID_RENEWAL_MODES: RenewalMode[] = ['ROLLING', 'AUTOMATIC', 'UNKNOWN']

const VALID_INTERVAL_UNITS: IntervalUnit[] = ['DAY', 'WEEK', 'MONTH', 'YEAR']

const CSV_SUBSCRIPTION_HEADERS = [
  'name', 'provider', 'planName', 'categoryId', 'status',
  'currentPrice', 'currency', 'billingIntervalUnit', 'billingIntervalCount',
  'commitmentIntervalUnit', 'commitmentIntervalCount',
  'renewalMode',
  'subscriptionDate', 'commitmentStartDate', 'nextRenewalDate',
  'notifyBeforeRenewal', 'notifyBeforeRenewalDays',
  'nextChargeDate', 'startDate', 'pauseUntil', 'serviceEndDate',
  'managementUrl', 'cancellationUrl', 'cancellationInstructions', 'notes',
]

const CSV_PAYMENT_HEADERS = [
  'id', 'subscriptionId', 'scheduledDate', 'paidDate', 'status',
  'amount', 'currency', 'source', 'notes',
]

function createEntityId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

export interface CsvImportPreview {
  validRows: number
  warningRows: number
  errorRows: number
  warnings: Array<{ row: number; message: string }>
  errors: Array<{ row: number; message: string }>
  parsedData: Array<{
    rowNumber: number
    data: Record<string, string>
    isValid: boolean
    warnings: string[]
    errors: string[]
  }>
}

/**
 * Analyse un fichier CSV d'import abonnements et produit un aperçu.
 * Ne modifie aucune donnée.
 */
export async function previewCsvImport(
  file: File,
  database: SubscriptionDatabase = db,
): Promise<CsvImportPreview> {
  const text = await file.text()
  const parsed = parseCsv(text)
  const rows = csvRowsToObjects(parsed)

  const existingSubscriptions = await database.subscriptions.toArray()
  const existingNames = new Set(
    existingSubscriptions
      .filter(s => !s.deletedAt)
      .map(s => s.name.trim().toLowerCase()),
  )

  const warnings: Array<{ row: number; message: string }> = []
  const errors: Array<{ row: number; message: string }> = []
  const parsedData: CsvImportPreview['parsedData'] = []

  for (let i = 0; i < rows.length; i++) {
    const row = rows[i]
    const rowNumber = i + 2 // +2 because 1-indexed + header line
    const rowWarnings: string[] = []
    const rowErrors: string[] = []

    // Validate required fields
    if (!row.name || !row.name.trim()) {
      rowErrors.push('Le nom est obligatoire.')
    }

    if (row.status && !VALID_STATUSES.includes(row.status as SubscriptionStatus)) {
      rowErrors.push(`Statut invalide: "${row.status}". Valeurs acceptées: ${VALID_STATUSES.join(', ')}`)
    }

    if (row.renewalMode && !VALID_RENEWAL_MODES.includes(row.renewalMode as RenewalMode)) {
      rowErrors.push(`Mode de renouvellement invalide: "${row.renewalMode}". Valeurs acceptées: ${VALID_RENEWAL_MODES.join(', ')}`)
    }

    // Validate optional fields
    if (row.currentPrice && row.currentPrice.trim()) {
      const price = Number(row.currentPrice)
      if (!Number.isFinite(price) || price < 0) {
        rowErrors.push(`Prix invalide: "${row.currentPrice}".`)
      }
    }

    if (row.billingIntervalUnit && row.billingIntervalUnit.trim()) {
      if (!VALID_INTERVAL_UNITS.includes(row.billingIntervalUnit as IntervalUnit)) {
        rowErrors.push(`Unité de facturation invalide: "${row.billingIntervalUnit}".`)
      }
    }

    if (row.billingIntervalCount && row.billingIntervalCount.trim()) {
      const count = Number(row.billingIntervalCount)
      if (!Number.isInteger(count) || count <= 0) {
        rowErrors.push(`Nombre de facturation invalide: "${row.billingIntervalCount}".`)
      }
    }

    if (row.renewalIntervalUnit && row.renewalIntervalUnit.trim()) {
      if (!VALID_INTERVAL_UNITS.includes(row.renewalIntervalUnit as IntervalUnit)) {
        rowErrors.push(`Unité de renouvellement invalide: "${row.renewalIntervalUnit}".`)
      }
    }

    if (row.renewalIntervalCount && row.renewalIntervalCount.trim()) {
      const count = Number(row.renewalIntervalCount)
      if (!Number.isInteger(count) || count <= 0) {
        rowErrors.push(`Nombre de renouvellement invalide: "${row.renewalIntervalCount}".`)
      }
    }

    if (
      row.notifyBeforeRenewal &&
      !['true', 'false'].includes(row.notifyBeforeRenewal.trim().toLowerCase())
    ) {
      rowErrors.push(`Préférence d'alerte invalide: "${row.notifyBeforeRenewal}".`)
    }
    if (row.notifyBeforeRenewalDays?.trim()) {
      const days = Number(row.notifyBeforeRenewalDays)
      if (!Number.isInteger(days) || days < 0) {
        rowErrors.push(`Délai d'alerte invalide: "${row.notifyBeforeRenewalDays}".`)
      }
    }

    // Validate dates
    const dateFields = [
      'nextChargeDate', 'nextRenewalDate', 'subscriptionDate',
      'commitmentStartDate', 'startDate', 'pauseUntil', 'serviceEndDate',
    ] as const
    for (const field of dateFields) {
      if (row[field] && row[field].trim()) {
        if (!isValidCivilDate(row[field])) {
          rowErrors.push(`Date ${field} invalide: "${row[field]}". Format attendu: YYYY-MM-DD.`)
        }
      }
    }

    // Check name duplicate
    if (row.name && row.name.trim()) {
      const normalizedName = row.name.trim().toLowerCase()
      if (existingNames.has(normalizedName)) {
        const existing = existingSubscriptions.find(
          s => s.name.trim().toLowerCase() === normalizedName && !s.deletedAt,
        )
        if (existing) {
          rowWarnings.push(
            `Le nom "${row.name.trim()}" existe déjà (ID: ${existing.id}). Un nouvel abonnement sera créé.`,
          )
        }
      }
    }

    const isValid = rowErrors.length === 0

    if (rowErrors.length > 0) {
      errors.push({ row: rowNumber, message: rowErrors.join(' ') })
    }
    if (rowWarnings.length > 0) {
      warnings.push({ row: rowNumber, message: rowWarnings.join(' ') })
    }

    parsedData.push({
      rowNumber,
      data: row,
      isValid,
      warnings: rowWarnings,
      errors: rowErrors,
    })
  }

  return {
    validRows: parsedData.filter(d => d.isValid).length,
    warningRows: warnings.length,
    errorRows: errors.length,
    warnings,
    errors,
    parsedData,
  }
}

/**
 * Confirme l'import CSV après aperçu.
 * Crée les abonnements valides dans une transaction Dexie.
 */
export async function confirmCsvImport(
  preview: CsvImportPreview,
  database: SubscriptionDatabase = db,
): Promise<ImportReport> {
  const now = new Date()
  let created = 0
  const updated = 0
  const warnings: Array<{ row: number; message: string }> = []
  const errors: Array<{ row: number; message: string }> = []

  await database.transaction('rw', database.subscriptions, async () => {
    for (const entry of preview.parsedData) {
      if (!entry.isValid) {
        errors.push({ row: entry.rowNumber, message: entry.errors.join(' ') })
        continue
      }

      const row = entry.data

      const subscription = normalizeSubscriptionContinuation<Subscription>({
        id: createEntityId('sbs'),
        name: row.name.trim(),
        provider: row.provider?.trim() || undefined,
        planName: row.planName?.trim() || undefined,
        categoryId: row.categoryId?.trim() || undefined,
        status: (row.status?.trim() as SubscriptionStatus) || 'UNKNOWN',
        renewalMode: (row.renewalMode?.trim() as RenewalMode) || 'UNKNOWN',
        currentPrice: row.currentPrice?.trim() ? Number(row.currentPrice) : undefined,
        currency: row.currency?.trim().toUpperCase() || undefined,
        billingIntervalUnit: (row.billingIntervalUnit?.trim() as IntervalUnit) || undefined,
        billingIntervalCount: row.billingIntervalCount?.trim() ? Number(row.billingIntervalCount) : undefined,
        commitmentIntervalUnit: (row.commitmentIntervalUnit?.trim() as IntervalUnit) || undefined,
        commitmentIntervalCount: row.commitmentIntervalCount?.trim() ? Number(row.commitmentIntervalCount) : undefined,
        subscriptionDate: row.subscriptionDate?.trim() || undefined,
        commitmentStartDate: row.commitmentStartDate?.trim() || undefined,
        nextRenewalDate: row.nextRenewalDate?.trim() || undefined,
        notifyBeforeRenewal: row.notifyBeforeRenewal?.trim()
          ? row.notifyBeforeRenewal.trim().toLowerCase() === 'true'
          : undefined,
        notifyBeforeRenewalDays: row.notifyBeforeRenewalDays?.trim()
          ? Number(row.notifyBeforeRenewalDays)
          : undefined,
        nextChargeDate: row.nextChargeDate?.trim() || undefined,
        startDate: row.startDate?.trim() || undefined,
        pauseUntil: row.pauseUntil?.trim() || undefined,
        serviceEndDate: row.serviceEndDate?.trim() || undefined,
        managementUrl: row.managementUrl?.trim() || undefined,
        cancellationUrl: row.cancellationUrl?.trim() || undefined,
        cancellationInstructions: row.cancellationInstructions?.trim() || undefined,
        notes: row.notes?.trim() || undefined,
        createdAt: now,
        updatedAt: now,
        schemaVersion: 10,
      })

      await database.subscriptions.put(subscription)
      created++

      for (const w of entry.warnings) {
        warnings.push({ row: entry.rowNumber, message: w })
      }
    }
  })

  return {
    totalRows: preview.parsedData.length,
    created,
    updated,
    warnings,
    errors,
  }
}

/**
 * Exporte les abonnements au format CSV.
 */
export async function exportSubscriptionsCsv(
  database: SubscriptionDatabase = db,
): Promise<string> {
  const subscriptions = await database.subscriptions
    .filter(s => !s.deletedAt)
    .toArray()

  const rows = subscriptions.map(sub => [
    sub.id,
    sub.name,
    sub.provider ?? '',
    sub.planName ?? '',
    sub.categoryId ?? '',
    sub.status,
    typeof sub.currentPrice === 'number' ? String(sub.currentPrice) : '',
    sub.currency ?? '',
    sub.billingIntervalUnit ?? '',
    sub.billingIntervalCount ? String(sub.billingIntervalCount) : '',
    sub.commitmentIntervalUnit ?? '',
    sub.commitmentIntervalCount ? String(sub.commitmentIntervalCount) : '',
    sub.renewalMode,
    sub.subscriptionDate ?? '',
    sub.commitmentStartDate ?? '',
    sub.nextRenewalDate ?? '',
    sub.notifyBeforeRenewal === undefined ? '' : String(sub.notifyBeforeRenewal),
    sub.notifyBeforeRenewalDays === undefined ? '' : String(sub.notifyBeforeRenewalDays),
    sub.nextChargeDate ?? '',
    sub.startDate ?? '',
    sub.pauseUntil ?? '',
    sub.serviceEndDate ?? '',
    sub.managementUrl ?? '',
    sub.cancellationUrl ?? '',
    sub.cancellationInstructions ?? '',
    sub.notes ?? '',
  ])

  const headers = ['id', ...CSV_SUBSCRIPTION_HEADERS]
  return generateCsv(headers, rows)
}

/**
 * Exporte les paiements au format CSV.
 */
export async function exportPaymentsCsv(
  database: SubscriptionDatabase = db,
): Promise<string> {
  const payments = await database.payments
    .filter(p => !p.deletedAt)
    .toArray()

  const rows = payments.map(pym => [
    pym.id,
    pym.subscriptionId,
    pym.scheduledDate,
    pym.paidDate ?? '',
    pym.status,
    String(pym.amount.amount),
    pym.amount.currency,
    pym.source,
    pym.notes ?? '',
  ])

  return generateCsv(CSV_PAYMENT_HEADERS, rows)
}
