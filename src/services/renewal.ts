import type { Subscription } from '../data/db'

const CONTRACTUAL_RENEWAL_FIELDS = [
  'renewalIntervalUnit',
  'renewalIntervalCount',
  'renewalPeriodStartDate',
  'nextRenewalDate',
  'notifyBeforeRenewal',
  'notifyBeforeRenewalDays',
] as const

type ContinuationData = Pick<
  Subscription,
  | 'renewalMode'
  | 'billingIntervalUnit'
  | 'billingIntervalCount'
  | 'renewalIntervalUnit'
  | 'renewalIntervalCount'
  | 'nextChargeDate'
  | 'nextRenewalDate'
>

export function isDeterministicLegacyRolling(
  subscription: Partial<ContinuationData>,
): boolean {
  return Boolean(
    subscription.renewalMode === 'AUTOMATIC' &&
      subscription.billingIntervalUnit &&
      subscription.billingIntervalUnit !== 'YEAR' &&
      subscription.billingIntervalUnit === subscription.renewalIntervalUnit &&
      (subscription.billingIntervalCount ?? 1) ===
        (subscription.renewalIntervalCount ?? 1) &&
      subscription.nextChargeDate &&
      subscription.nextRenewalDate &&
      subscription.nextChargeDate === subscription.nextRenewalDate,
  )
}

export function hasDistinctContractualRenewal(
  subscription: Partial<ContinuationData>,
): boolean {
  if (
    subscription.renewalMode !== 'AUTOMATIC' &&
    subscription.renewalMode !== 'MANUAL'
  ) {
    return false
  }

  if (!subscription.renewalIntervalUnit) {
    return false
  }

  const hasSameLegacyAutomaticCycle =
    subscription.renewalMode === 'AUTOMATIC' &&
    subscription.billingIntervalUnit === subscription.renewalIntervalUnit &&
    (subscription.billingIntervalCount ?? 1) ===
      (subscription.renewalIntervalCount ?? 1)

  return !hasSameLegacyAutomaticCycle
}

export function normalizeSubscriptionContinuation<T extends Partial<Subscription>>(
  subscription: T,
  options: { normalizeLegacy?: boolean } = {},
): T {
  const normalized = { ...subscription }

  if (options.normalizeLegacy && isDeterministicLegacyRolling(normalized)) {
    normalized.renewalMode = 'ROLLING'
  }

  if (normalized.renewalMode === 'ROLLING') {
    for (const field of CONTRACTUAL_RENEWAL_FIELDS) {
      delete normalized[field]
    }
  }

  return normalized
}
