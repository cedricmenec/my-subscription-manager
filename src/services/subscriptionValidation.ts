import {
  type RenewalMode,
  type SubscriptionStatus,
} from '../data/db'

const VALID_RENEWAL_MODES: RenewalMode[] = ['AUTOMATIC', 'MANUAL', 'UNKNOWN']
const VALID_SUBSCRIPTION_STATUSES: SubscriptionStatus[] = [
  'TRIAL',
  'ACTIVE',
  'PAUSED',
  'CANCELLED_PENDING_END',
  'ENDED',
  'UNKNOWN',
]

const ALLOWED_STATUS_TRANSITIONS: Record<SubscriptionStatus, SubscriptionStatus[]> = {
  TRIAL: ['ACTIVE', 'PAUSED', 'CANCELLED_PENDING_END', 'ENDED'],
  ACTIVE: ['PAUSED', 'CANCELLED_PENDING_END', 'ENDED'],
  PAUSED: ['ACTIVE', 'CANCELLED_PENDING_END', 'ENDED'],
  CANCELLED_PENDING_END: ['ENDED'],
  ENDED: [],
  UNKNOWN: ['TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED_PENDING_END', 'ENDED'],
}

export interface SubscriptionFormInput {
  name: string
  status: SubscriptionStatus
  renewalMode: RenewalMode
  currentPriceMinor?: number
  nextChargeDate?: string
  pauseUntil?: string
  serviceEndDate?: string
  managementUrl?: string
  cancellationUrl?: string
}

export interface ValidationResult {
  isValid: boolean
  errors: Record<string, string>
}

export function isValidCivilDate(value: string): boolean {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) {
    return false
  }

  const [yearText, monthText, dayText] = value.split('-')
  const year = Number(yearText)
  const month = Number(monthText)
  const day = Number(dayText)

  if (year < 1900 || month < 1 || month > 12 || day < 1 || day > 31) {
    return false
  }

  const parsed = new Date(Date.UTC(year, month - 1, day))
  return (
    parsed.getUTCFullYear() === year &&
    parsed.getUTCMonth() === month - 1 &&
    parsed.getUTCDate() === day
  )
}

function isValidUrl(value: string): boolean {
  try {
    const parsed = new URL(value)
    return parsed.protocol === 'https:' || parsed.protocol === 'http:'
  } catch {
    return false
  }
}

export function validateStatusTransition(
  previousStatus: SubscriptionStatus,
  nextStatus: SubscriptionStatus,
): boolean {
  if (previousStatus === nextStatus) {
    return true
  }

  return ALLOWED_STATUS_TRANSITIONS[previousStatus].includes(nextStatus)
}

export function validateSubscriptionInput(
  input: SubscriptionFormInput,
): ValidationResult {
  const errors: Record<string, string> = {}

  if (!input.name.trim()) {
    errors.name = 'Le nom est obligatoire.'
  }

  if (!VALID_SUBSCRIPTION_STATUSES.includes(input.status)) {
    errors.status = 'Le statut est invalide.'
  }

  if (!VALID_RENEWAL_MODES.includes(input.renewalMode)) {
    errors.renewalMode = 'Le mode de renouvellement est invalide.'
  }

  if (typeof input.currentPriceMinor === 'number' && input.currentPriceMinor < 0) {
    errors.currentPriceMinor = 'Le prix ne peut pas être négatif.'
  }

  if (input.nextChargeDate && !isValidCivilDate(input.nextChargeDate)) {
    errors.nextChargeDate = 'La date de prochaine échéance est invalide (YYYY-MM-DD).'
  }

  if (input.status === 'PAUSED' && input.pauseUntil && !isValidCivilDate(input.pauseUntil)) {
    errors.pauseUntil = 'La date de fin de pause est invalide (YYYY-MM-DD).'
  }

  if (
    input.status === 'CANCELLED_PENDING_END' &&
    input.serviceEndDate &&
    !isValidCivilDate(input.serviceEndDate)
  ) {
    errors.serviceEndDate = 'La date de fin de service est invalide (YYYY-MM-DD).'
  }

  if (input.managementUrl && !isValidUrl(input.managementUrl)) {
    errors.managementUrl = 'L\'URL de gestion est invalide.'
  }

  if (input.cancellationUrl && !isValidUrl(input.cancellationUrl)) {
    errors.cancellationUrl = 'L\'URL de résiliation est invalide.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}
