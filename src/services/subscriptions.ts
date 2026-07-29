import {
  db,
  type Category,
  type IntervalUnit,
  type Subscription,
  type SubscriptionDatabase,
} from '../data/db'
import {
  type SubscriptionFormInput,
  validateStatusTransition,
  validateSubscriptionInput,
} from './subscriptionValidation'
import {
  addIntervalToCivilDate,
  compareCivilDates,
  todayCivilDate,
} from './civilDate'

export class SubscriptionValidationError extends Error {
  readonly errors: Record<string, string>

  constructor(errors: Record<string, string>) {
    super('Validation de la fiche abonnement échouée.')
    this.name = 'SubscriptionValidationError'
    this.errors = errors
  }
}

export type SubscriptionSort =
  | 'nextChargeDate'
  | 'nextRenewalDate'
  | 'updatedAt'
  | 'name'
  | 'currentPrice'
  | 'createdAt'
  | 'completion'

export type SortDirection = 'asc' | 'desc'

export interface SubscriptionFilters {
  search?: string
  status?: Subscription['status'] | 'ALL'
  categoryId?: string | 'ALL'
  renewalMode?: Subscription['renewalMode'] | 'ALL'
  onlyIncomplete?: boolean
  sortBy?: SubscriptionSort
  sortDirection?: SortDirection
  dateMin?: string
  dateMax?: string
  renewalDateMin?: string
  renewalDateMax?: string
  amountMin?: number
  amountMax?: number
}

export interface CompletionResult {
  isComplete: boolean
  score: number
  missingFields: string[]
  label: string
}

export interface UpsertSubscriptionInput extends SubscriptionFormInput {
  provider?: string
  planName?: string
  categoryId?: string
  currency?: string
  billingIntervalUnit?: IntervalUnit
  billingIntervalCount?: number
  commitmentIntervalUnit?: IntervalUnit
  commitmentIntervalCount?: number
  renewalIntervalUnit?: IntervalUnit
  renewalIntervalCount?: number
  startDate?: string
  nextRenewalDate?: string
  subscriptionDate?: string
  renewalPeriodStartDate?: string
  commitmentStartDate?: string
  pauseStartDate?: string
  cancellationInstructions?: string
  notes?: string
}

function createEntityId(prefix: string): string {
  return `${prefix}-${crypto.randomUUID()}`
}

function cleanOptional(value?: string): string | undefined {
  if (!value) {
    return undefined
  }

  const trimmed = value.trim()
  return trimmed.length > 0 ? trimmed : undefined
}

function normalizePositiveInteger(value?: number): number | undefined {
  return typeof value === 'number' && Number.isInteger(value) && value > 0 ? value : undefined
}

export function computeNextRenewalDate(
  subscriptionDate?: string,
  renewalIntervalUnit?: IntervalUnit,
  renewalIntervalCount?: number,
  renewalPeriodStartDate?: string,
  todayReference: Date = new Date(),
): string | undefined {
  const anchor = renewalPeriodStartDate ?? subscriptionDate
  if (!anchor || !renewalIntervalUnit || !renewalIntervalCount) {
    return undefined
  }

  const today = todayCivilDate(todayReference)
  let nextDate = anchor

  while (compareCivilDates(nextDate, today) < 0) {
    nextDate = addIntervalToCivilDate(nextDate, renewalIntervalUnit, renewalIntervalCount)
  }

  return nextDate
}

export function computeSubscriptionCompletion(
  subscription: Subscription,
): CompletionResult {
  const missingFields: string[] = []

  if (!subscription.name.trim()) missingFields.push('name')
  if (!subscription.status) missingFields.push('status')
  if (typeof subscription.currentPrice !== 'number') missingFields.push('price')
  if (!subscription.currency) missingFields.push('currency')
  if (!subscription.billingIntervalUnit || !subscription.billingIntervalCount) {
    missingFields.push('billingInterval')
  }
  if (!subscription.nextChargeDate) missingFields.push('nextChargeDate')
  if (!subscription.renewalMode) missingFields.push('renewalMode')

  const totalCriticalFields = 7
  const completedFields = totalCriticalFields - missingFields.length
  const score = Math.round((completedFields / totalCriticalFields) * 100)

  return {
    isComplete: missingFields.length === 0,
    score,
    missingFields,
    label:
      missingFields.length === 0
        ? 'Complet'
        : `${missingFields.length} champ(s) à compléter`,
  }
}

export async function listCategories(
  database: SubscriptionDatabase = db,
): Promise<Category[]> {
  return database.categories.orderBy('sortOrder').toArray()
}

export async function createCategory(
  name: string,
  database: SubscriptionDatabase = db,
): Promise<Category> {
  const trimmedName = name.trim()
  if (!trimmedName) {
    throw new Error('Le nom de catégorie est obligatoire.')
  }

  const now = new Date()
  const category: Category = {
    id: createEntityId('ctg'),
    name: trimmedName,
    sortOrder: now.getTime(),
    createdAt: now,
    updatedAt: now,
    schemaVersion: 5,
  }

  await database.categories.put(category)
  return category
}

export async function deleteCategory(
  id: string,
  database: SubscriptionDatabase = db,
): Promise<void> {
  await database.categories.delete(id)
}

export async function createSubscription(
  input: UpsertSubscriptionInput,
  database: SubscriptionDatabase = db,
): Promise<Subscription> {
  const validation = validateSubscriptionInput({
    name: input.name,
    status: input.status,
    renewalMode: input.renewalMode,
    currentPrice: input.currentPrice,
    billingIntervalUnit: input.billingIntervalUnit,
    billingIntervalCount: input.billingIntervalCount,
    commitmentIntervalUnit: input.commitmentIntervalUnit,
    commitmentIntervalCount: input.commitmentIntervalCount,
    renewalIntervalUnit: input.renewalIntervalUnit,
    renewalIntervalCount: input.renewalIntervalCount,
    nextChargeDate: input.nextChargeDate,
    nextRenewalDate: input.nextRenewalDate,
    subscriptionDate: input.subscriptionDate,
    renewalPeriodStartDate: input.renewalPeriodStartDate,
    commitmentStartDate: input.commitmentStartDate,
    pauseStartDate: input.pauseStartDate,
    pauseUntil: input.pauseUntil,
    serviceEndDate: input.serviceEndDate,
    managementUrl: input.managementUrl,
    cancellationUrl: input.cancellationUrl,
  })

  if (!validation.isValid) {
    throw new SubscriptionValidationError(validation.errors)
  }

  const now = new Date()

  const autoRenewalDate =
    input.renewalMode === 'AUTOMATIC'
      ? input.nextRenewalDate ??
        computeNextRenewalDate(
          input.subscriptionDate,
          input.renewalIntervalUnit,
          input.renewalIntervalCount,
          input.renewalPeriodStartDate,
        )
      : undefined

  const subscription: Subscription = {
    id: createEntityId('sbs'),
    name: input.name.trim(),
    provider: cleanOptional(input.provider),
    planName: cleanOptional(input.planName),
    categoryId: cleanOptional(input.categoryId),
    status: input.status,
    renewalMode: input.renewalMode,
    currentPrice: input.currentPrice,
    currency: cleanOptional(input.currency),
    billingIntervalUnit: input.billingIntervalUnit,
    billingIntervalCount: normalizePositiveInteger(input.billingIntervalCount),
    commitmentIntervalUnit: input.commitmentIntervalUnit,
    commitmentIntervalCount: normalizePositiveInteger(input.commitmentIntervalCount),
    renewalIntervalUnit: input.renewalIntervalUnit,
    renewalIntervalCount: normalizePositiveInteger(input.renewalIntervalCount),
    startDate: cleanOptional(input.startDate),
    nextChargeDate: cleanOptional(input.nextChargeDate),
    nextRenewalDate: autoRenewalDate ?? cleanOptional(input.nextRenewalDate),
    subscriptionDate: cleanOptional(input.subscriptionDate),
    renewalPeriodStartDate: cleanOptional(input.renewalPeriodStartDate) ?? cleanOptional(input.subscriptionDate),
    commitmentStartDate: cleanOptional(input.commitmentStartDate),
    pauseUntil: cleanOptional(input.pauseUntil),
    pauseStartDate: cleanOptional(input.pauseStartDate),
    serviceEndDate: cleanOptional(input.serviceEndDate),
    managementUrl: cleanOptional(input.managementUrl),
    cancellationUrl: cleanOptional(input.cancellationUrl),
    cancellationInstructions: cleanOptional(input.cancellationInstructions),
    notes: cleanOptional(input.notes),
    createdAt: now,
    updatedAt: now,
    schemaVersion: 8,
  }

  await database.transaction('rw', database.subscriptions, async () => {
    await database.subscriptions.put(subscription)
  })

  return subscription
}

export async function updateSubscription(
  id: string,
  patch: UpsertSubscriptionInput,
  database: SubscriptionDatabase = db,
): Promise<Subscription> {
  const current = await database.subscriptions.get(id)

  if (!current || current.archivedAt) {
    throw new Error('Abonnement introuvable.')
  }

  const nextStatus = patch.status ?? current.status
  if (!validateStatusTransition(current.status, nextStatus)) {
    throw new SubscriptionValidationError({
      status: 'Transition de statut non autorisée.',
    })
  }

  const merged: Subscription = {
    ...current,
    ...patch,
    name: patch.name?.trim() ?? current.name,
    provider: cleanOptional(patch.provider) ?? current.provider,
    planName: cleanOptional(patch.planName) ?? current.planName,
    categoryId: cleanOptional(patch.categoryId),
    currency: cleanOptional(patch.currency),
    currentPrice: typeof patch.currentPrice === 'number'
      ? patch.currentPrice
      : current.currentPrice,
    billingIntervalUnit: patch.billingIntervalUnit ?? current.billingIntervalUnit,
    billingIntervalCount:
      normalizePositiveInteger(patch.billingIntervalCount) ?? current.billingIntervalCount,
    commitmentIntervalUnit: patch.commitmentIntervalUnit ?? current.commitmentIntervalUnit,
    commitmentIntervalCount:
      normalizePositiveInteger(patch.commitmentIntervalCount) ?? current.commitmentIntervalCount,
    renewalIntervalUnit: patch.renewalIntervalUnit ?? current.renewalIntervalUnit,
    renewalIntervalCount:
      normalizePositiveInteger(patch.renewalIntervalCount) ?? current.renewalIntervalCount,
    startDate: cleanOptional(patch.startDate),
    nextChargeDate: cleanOptional(patch.nextChargeDate),
    // subscriptionDate est en lecture seule : on garde la valeur existante
    subscriptionDate: current.subscriptionDate,
    renewalPeriodStartDate: cleanOptional(patch.renewalPeriodStartDate),
    // nextRenewalDate est surchargé par le moteur de calcul : on recalcule ici en attendant le prochain run
    nextRenewalDate:
      patch.renewalMode === 'AUTOMATIC'
        ? computeNextRenewalDate(
            current.subscriptionDate,
            patch.renewalIntervalUnit ?? current.renewalIntervalUnit,
            normalizePositiveInteger(patch.renewalIntervalCount) ?? current.renewalIntervalCount,
            cleanOptional(patch.renewalPeriodStartDate) ?? current.renewalPeriodStartDate,
          )
        : cleanOptional(patch.nextRenewalDate),
    commitmentStartDate: cleanOptional(patch.commitmentStartDate),
    pauseUntil: cleanOptional(patch.pauseUntil),
    pauseStartDate: cleanOptional(patch.pauseStartDate),
    serviceEndDate: cleanOptional(patch.serviceEndDate),
    managementUrl: cleanOptional(patch.managementUrl),
    cancellationUrl: cleanOptional(patch.cancellationUrl),
    cancellationInstructions: cleanOptional(patch.cancellationInstructions),
    notes: cleanOptional(patch.notes),
    updatedAt: new Date(),
    schemaVersion: 8,
  }

  const validation = validateSubscriptionInput({
    name: merged.name,
    status: merged.status,
    renewalMode: merged.renewalMode,
    currentPrice: merged.currentPrice,
    billingIntervalUnit: merged.billingIntervalUnit,
    billingIntervalCount: merged.billingIntervalCount,
    commitmentIntervalUnit: merged.commitmentIntervalUnit,
    commitmentIntervalCount: merged.commitmentIntervalCount,
    renewalIntervalUnit: merged.renewalIntervalUnit,
    renewalIntervalCount: merged.renewalIntervalCount,
    nextChargeDate: merged.nextChargeDate,
    nextRenewalDate: merged.nextRenewalDate,
    subscriptionDate: merged.subscriptionDate,
    renewalPeriodStartDate: merged.renewalPeriodStartDate,
    commitmentStartDate: merged.commitmentStartDate,
    pauseStartDate: merged.pauseStartDate,
    pauseUntil: merged.pauseUntil,
    serviceEndDate: merged.serviceEndDate,
    managementUrl: merged.managementUrl,
    cancellationUrl: merged.cancellationUrl,
  })

  if (!validation.isValid) {
    throw new SubscriptionValidationError(validation.errors)
  }

  await database.transaction('rw', database.subscriptions, async () => {
    await database.subscriptions.update(id, {
      ...patch,
      name: merged.name,
      provider: merged.provider,
      planName: merged.planName,
      categoryId: merged.categoryId,
      currency: merged.currency,
      billingIntervalUnit: merged.billingIntervalUnit,
      billingIntervalCount: merged.billingIntervalCount,
      commitmentIntervalUnit: merged.commitmentIntervalUnit,
      commitmentIntervalCount: merged.commitmentIntervalCount,
      renewalIntervalUnit: merged.renewalIntervalUnit,
      renewalIntervalCount: merged.renewalIntervalCount,
      startDate: merged.startDate,
      nextChargeDate: merged.nextChargeDate,
      nextRenewalDate: merged.nextRenewalDate,
      subscriptionDate: merged.subscriptionDate,
      renewalPeriodStartDate: merged.renewalPeriodStartDate,
      commitmentStartDate: merged.commitmentStartDate,
      pauseUntil: merged.pauseUntil,
      pauseStartDate: merged.pauseStartDate,
      serviceEndDate: merged.serviceEndDate,
      managementUrl: merged.managementUrl,
      cancellationUrl: merged.cancellationUrl,
      cancellationInstructions: merged.cancellationInstructions,
      notes: merged.notes,
      status: merged.status,
      renewalMode: merged.renewalMode,
      currentPrice: merged.currentPrice,
      updatedAt: merged.updatedAt,
      schemaVersion: 8,
    })
  })

  return merged
}

function sortSubscriptions(
  subscriptions: Subscription[],
  sortBy: SubscriptionSort,
  sortDirection: SortDirection = 'asc',
): Subscription[] {
  const multiplier = sortDirection === 'asc' ? 1 : -1

  switch (sortBy) {
    case 'updatedAt':
      return subscriptions.sort(
        (left, right) => (right.updatedAt.getTime() - left.updatedAt.getTime()) * multiplier,
      )

    case 'name':
      return subscriptions.sort((left, right) =>
        left.name.localeCompare(right.name) * multiplier,
      )

    case 'currentPrice': {
      return subscriptions.sort((left, right) => {
        const leftPrice = typeof left.currentPrice === 'number' ? left.currentPrice : 0
        const rightPrice = typeof right.currentPrice === 'number' ? right.currentPrice : 0
        return (leftPrice - rightPrice) * multiplier
      })
    }

    case 'createdAt':
      return subscriptions.sort(
        (left, right) => (left.createdAt.getTime() - right.createdAt.getTime()) * multiplier,
      )

    case 'completion':
      return subscriptions.sort(
        (left, right) =>
          (computeSubscriptionCompletion(left).score - computeSubscriptionCompletion(right).score) *
          multiplier,
      )

    case 'nextChargeDate':
    default:
      return subscriptions.sort((left, right) => {
        const leftDate = left.nextChargeDate ?? '9999-12-31'
        const rightDate = right.nextChargeDate ?? '9999-12-31'
        return leftDate.localeCompare(rightDate) * multiplier
      })
  }
}

export async function archiveSubscription(
  id: string,
  database: SubscriptionDatabase = db,
): Promise<void> {
  await database.subscriptions.update(id, {
    archivedAt: new Date(),
    updatedAt: new Date(),
    schemaVersion: 8,
  })
}

export async function listSubscriptions(
  filters: SubscriptionFilters = {},
  database: SubscriptionDatabase = db,
): Promise<Subscription[]> {
  const all = await database.subscriptions.toArray()

  const visible = all.filter(subscription => !subscription.archivedAt)

  const filtered = visible.filter(subscription => {
    if (filters.search) {
      const query = filters.search.trim().toLowerCase()
      const haystack = [
        subscription.name,
        subscription.provider,
        subscription.planName,
        subscription.notes,
      ]
        .filter(Boolean)
        .join(' ')
        .toLowerCase()

      if (!haystack.includes(query)) {
        return false
      }
    }

    if (filters.status && filters.status !== 'ALL' && subscription.status !== filters.status) {
      return false
    }

    if (
      filters.categoryId &&
      filters.categoryId !== 'ALL' &&
      subscription.categoryId !== filters.categoryId
    ) {
      return false
    }

    if (
      filters.renewalMode &&
      filters.renewalMode !== 'ALL' &&
      subscription.renewalMode !== filters.renewalMode
    ) {
      return false
    }

    if (filters.onlyIncomplete && computeSubscriptionCompletion(subscription).isComplete) {
      return false
    }

    if (filters.dateMin && subscription.nextChargeDate && subscription.nextChargeDate < filters.dateMin) {
      return false
    }

    if (filters.dateMax && subscription.nextChargeDate && subscription.nextChargeDate > filters.dateMax) {
      return false
    }

    if (
      filters.amountMin !== undefined &&
      typeof subscription.currentPrice === 'number' &&
      subscription.currentPrice < filters.amountMin
    ) {
      return false
    }

    if (
      filters.amountMax !== undefined &&
      typeof subscription.currentPrice === 'number' &&
      subscription.currentPrice > filters.amountMax
    ) {
      return false
    }

    return true
  })

  return sortSubscriptions(filtered, filters.sortBy ?? 'nextChargeDate', filters.sortDirection)
}