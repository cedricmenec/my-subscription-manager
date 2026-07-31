import {
  type IntervalUnit,
  type RenewalMode,
  type SubscriptionStatus,
} from '../data/db'
import { hasDistinctContractualRenewal } from './renewal'

const VALID_RENEWAL_MODES: RenewalMode[] = ['ROLLING', 'AUTOMATIC', 'MANUAL', 'UNKNOWN']
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
  currentPrice?: number
  billingIntervalUnit?: IntervalUnit
  billingIntervalCount?: number
  commitmentIntervalUnit?: IntervalUnit
  commitmentIntervalCount?: number
  renewalIntervalUnit?: IntervalUnit
  renewalIntervalCount?: number
  nextChargeDate?: string
  nextRenewalDate?: string
  subscriptionDate?: string
  renewalPeriodStartDate?: string
  commitmentStartDate?: string
  pauseStartDate?: string
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

  validateIntervalPair(
    input.billingIntervalUnit,
    input.billingIntervalCount,
    'billingInterval',
    errors,
  )

  if (input.renewalMode === 'AUTOMATIC') {
    if (!input.renewalIntervalUnit || !input.renewalIntervalCount) {
      errors.renewalInterval = 'Le cycle de renouvellement contractuel est obligatoire.'
    }
    if (!input.renewalPeriodStartDate && !input.subscriptionDate) {
      errors.subscriptionDate = 'Une date d’ancrage du renouvellement est obligatoire.'
    }
  }
  validateIntervalPair(
    input.commitmentIntervalUnit,
    input.commitmentIntervalCount,
    'commitmentInterval',
    errors,
  )
  validateIntervalPair(
    input.renewalIntervalUnit,
    input.renewalIntervalCount,
    'renewalInterval',
    errors,
  )

  if (input.nextChargeDate && !isValidCivilDate(input.nextChargeDate)) {
    errors.nextChargeDate = 'La date de prochaine échéance est invalide (YYYY-MM-DD).'
  }

  if (input.nextRenewalDate && !isValidCivilDate(input.nextRenewalDate)) {
    errors.nextRenewalDate = 'La date de prochain renouvellement est invalide (YYYY-MM-DD).'
  }

  if (input.subscriptionDate && !isValidCivilDate(input.subscriptionDate)) {
    errors.subscriptionDate = 'La date de souscription est invalide (YYYY-MM-DD).'
  }

  if (input.renewalPeriodStartDate && !isValidCivilDate(input.renewalPeriodStartDate)) {
    errors.renewalPeriodStartDate = 'La date de début de période de renouvellement est invalide (YYYY-MM-DD).'
  }

  if (input.commitmentStartDate && !isValidCivilDate(input.commitmentStartDate)) {
    errors.commitmentStartDate = "La date de début d'engagement est invalide (YYYY-MM-DD)."
  }

  if (input.pauseStartDate && !isValidCivilDate(input.pauseStartDate)) {
    errors.pauseStartDate = 'La date de début de pause est invalide (YYYY-MM-DD).'
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

  // Règle de gate : nextChargeDate ne peut pas être après nextRenewalDate
  if (
    hasDistinctContractualRenewal(input) &&
    input.nextChargeDate &&
    input.nextRenewalDate &&
    input.nextChargeDate > input.nextRenewalDate
  ) {
    errors.nextChargeDate = 'La prochaine échéance ne peut pas être après la date de renouvellement.'
  }

  return {
    isValid: Object.keys(errors).length === 0,
    errors,
  }
}

function validateIntervalPair(
  unit: IntervalUnit | undefined,
  count: number | undefined,
  fieldPrefix: 'billingInterval' | 'commitmentInterval' | 'renewalInterval',
  errors: Record<string, string>,
): void {
  const hasUnit = Boolean(unit)
  const hasCount = typeof count === 'number'

  if (!hasUnit && !hasCount) {
    return
  }

  if (!hasUnit || !hasCount) {
    errors[fieldPrefix] = 'L\'unité et la quantité de l\'intervalle doivent être renseignées ensemble.'
    return
  }

  if (!Number.isInteger(count) || count < 1) {
    errors[fieldPrefix] = 'La quantité de l\'intervalle doit être un entier strictement positif.'
  }
}
