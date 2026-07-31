import type { Subscription } from '../data/db'

export function hasEngagement(
  subscription: Pick<Subscription, 'commitmentIntervalUnit' | 'commitmentIntervalCount'>,
): boolean {
  return Boolean(subscription.commitmentIntervalUnit && subscription.commitmentIntervalCount)
}

export function normalizeSubscriptionContinuation<T extends Partial<Subscription>>(
  subscription: T,
): T {
  const normalized = { ...subscription }

  // Nettoyer les champs d'engagement si le mode ne le permet pas
  if (normalized.renewalMode !== 'AUTOMATIC') {
    delete normalized.nextRenewalDate
    delete normalized.notifyBeforeRenewal
    delete normalized.notifyBeforeRenewalDays
  }

  return normalized
}
