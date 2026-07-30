import { db, type DiagnosticLog, type Subscription, type SubscriptionDatabase } from '../data/db'
import { materializeProjectedPaymentsWithStats } from './payments'
import { addIntervalToCivilDate, compareCivilDates, todayCivilDate } from './civilDate'

export type CalculationTriggerType = 'mutation' | 'startup' | 'interval' | 'stale-check' | 'manual'
export type CalculationStatus = 'ok' | 'error' | 'skipped-debounced'

export interface CalculationDefinition {
  id: string
  dependsOn: string[]
  run: (context: CalculationContext) => Promise<void> | void
}

export interface CalculationContext {
  database: SubscriptionDatabase
  trigger: CalculationTriggerType
  selectedCalculatorIds?: string[]
  runId: string
  logger: CalculationLogger
}

export interface CalculationLogger {
  log(entry: DiagnosticLog): Promise<void> | void
}

export interface CalculationEngineOptions {
  debounceMs?: number
  intervalMs?: number
  staleCheckMs?: number
  registry?: CalculationDefinition[]
  logger?: CalculationLogger
  database?: SubscriptionDatabase
  circuitBreakerThreshold?: number
  circuitBreakerWindowMs?: number
  circuitBreakerBlockMs?: number
}

export interface CalculationRunSummary {
  runId: string
  trigger: CalculationTriggerType
  selectedCalculatorIds?: string[]
  startedAt: Date
  finishedAt: Date
  status: 'completed' | 'failed' | 'skipped'
  entries: Array<{
    calculatorId: string
    status: CalculationStatus
    durationMs: number
    message?: string
  }>
}

export interface CircuitBreakerState {
  active: boolean
  threshold: number
  windowMs: number
  blockMs: number
  blockedUntil: number | null
  blockedUntilDate: string | null
  recentMutationCount: number
  mutationTimestamps: number[]
}

export interface InstanceInfo {
  id: string
  startedAt: Date
  runCount: number
}

interface QueuedRun {
  trigger: CalculationTriggerType
  selectedCalculatorIds?: string[]
  runId: string
}

export interface CalculationEngine {
  run: (calculatorIds?: string[], trigger?: CalculationTriggerType) => Promise<CalculationRunSummary>
  getRegistry: () => CalculationDefinition[]
  getDebugGraph: () => string[]
  getCircuitBreakerState: () => CircuitBreakerState
  getInstanceInfo: () => InstanceInfo
  start: () => void
  stop: () => void
}

const INSTANCE_ID = `inst-${crypto.randomUUID().slice(0, 8)}`
let instanceRunCount = 0

export function createCalculationEngine(options: CalculationEngineOptions = {}): CalculationEngine {
  const database = options.database ?? db
  const debounceMs = options.debounceMs ?? 300
  const intervalMs = options.intervalMs ?? 0
  const staleCheckMs = options.staleCheckMs ?? 60 * 60 * 1000
  const logger = options.logger ?? createDiagnosticLogger(database)
  const registry = options.registry ?? createDefaultRegistry()
  const circuitBreakerThreshold = options.circuitBreakerThreshold ?? 5
  const circuitBreakerWindowMs = options.circuitBreakerWindowMs ?? 10_000
  const circuitBreakerBlockMs = options.circuitBreakerBlockMs ?? 30_000
  const registryIds = new Set(registry.map(definition => definition.id))

  for (const definition of registry) {
    for (const dependencyId of definition.dependsOn) {
      if (!registryIds.has(dependencyId)) {
        throw new Error(`Calculateur ${definition.id} dépend de ${dependencyId} absent du registre.`)
      }
    }
  }

  let debounceTimer: ReturnType<typeof setTimeout> | undefined
  let pendingRun: QueuedRun | undefined
  let isRunning = false
  let isStarted = false
  let intervalTimer: ReturnType<typeof setInterval> | undefined
  let mutationSuppressionUntil = 0
  let cleanupHooks: Array<() => void> = []
  // Circuit breaker state
  let mutationTimestamps: number[] = []
  let circuitBreakerBlockedUntil = 0

  function getDebugGraph(): string[] {
    return registry.map(definition => `${definition.id} -> ${definition.dependsOn.join(', ') || '(none)'}`)
  }

  function getRegistry(): CalculationDefinition[] {
    return [...registry]
  }

  function getCircuitBreakerState(): CircuitBreakerState {
    const now = Date.now()
    // Prune old timestamps
    const cutoff = now - circuitBreakerWindowMs
    mutationTimestamps = mutationTimestamps.filter(t => t >= cutoff)

    return {
      active: now < circuitBreakerBlockedUntil,
      threshold: circuitBreakerThreshold,
      windowMs: circuitBreakerWindowMs,
      blockMs: circuitBreakerBlockMs,
      blockedUntil: circuitBreakerBlockedUntil > now ? circuitBreakerBlockedUntil : null,
      blockedUntilDate: circuitBreakerBlockedUntil > now
        ? new Date(circuitBreakerBlockedUntil).toISOString()
        : null,
      recentMutationCount: mutationTimestamps.length,
      mutationTimestamps: [...mutationTimestamps],
    }
  }

  function getInstanceInfo(): InstanceInfo {
    return {
      id: INSTANCE_ID,
      startedAt: new Date(),
      runCount: instanceRunCount,
    }
  }

  function checkCircuitBreaker(): boolean {
    const now = Date.now()

    // If already blocked, check if expired
    if (now < circuitBreakerBlockedUntil) {
      return true // blocked
    }

    // Reset block if expired
    if (circuitBreakerBlockedUntil > 0) {
      circuitBreakerBlockedUntil = 0
    }

    // Prune old timestamps outside the window
    const cutoff = now - circuitBreakerWindowMs
    mutationTimestamps = mutationTimestamps.filter(t => t >= cutoff)

    return false // not blocked
  }

  function recordMutationTrigger(): void {
    const now = Date.now()
    mutationTimestamps.push(now)

    // Prune old timestamps
    const cutoff = now - circuitBreakerWindowMs
    mutationTimestamps = mutationTimestamps.filter(t => t >= cutoff)

    // Check if threshold exceeded
    if (mutationTimestamps.length >= circuitBreakerThreshold) {
      circuitBreakerBlockedUntil = now + circuitBreakerBlockMs
      mutationTimestamps = [] // reset after triggering

      void logger.log({
        timestamp: new Date(),
        category: 'circuit-breaker',
        message: JSON.stringify({
          event: 'triggered',
          threshold: circuitBreakerThreshold,
          windowMs: circuitBreakerWindowMs,
          blockMs: circuitBreakerBlockMs,
          blockedUntil: new Date(circuitBreakerBlockedUntil).toISOString(),
          instanceId: INSTANCE_ID,
        }),
      })
    }
  }

  function scheduleRun(trigger: CalculationTriggerType, selectedCalculatorIds?: string[]): void {
    // Circuit breaker check: only block mutation triggers
    if (trigger === 'mutation') {
      const blocked = checkCircuitBreaker()
      if (blocked) {
        return
      }
      recordMutationTrigger()
    }

    if (isRunning) {
      pendingRun = { trigger, selectedCalculatorIds, runId: createRunId() }
      return
    }

    pendingRun = { trigger, selectedCalculatorIds, runId: createRunId() }

    if (debounceTimer) {
      clearTimeout(debounceTimer)
    }

    debounceTimer = setTimeout(() => {
      const queuedRun = pendingRun
      pendingRun = undefined
      if (queuedRun) {
        void executeRun(queuedRun)
      }
    }, debounceMs)
  }

  async function executeRun(queuedRun: QueuedRun): Promise<CalculationRunSummary> {
    if (isRunning) {
      return {
        runId: queuedRun.runId,
        trigger: queuedRun.trigger,
        selectedCalculatorIds: queuedRun.selectedCalculatorIds,
        startedAt: new Date(),
        finishedAt: new Date(),
        status: 'skipped',
        entries: [],
      }
    }

    isRunning = true
    mutationSuppressionUntil = Date.now() + 5000
    instanceRunCount++
    const startedAt = new Date()
    const selected = queuedRun.selectedCalculatorIds ?? registry.map(definition => definition.id)
    const orderedIds = resolveExecutionOrder(selected)
    const entries: CalculationRunSummary['entries'] = []

    try {
      for (const calculatorId of orderedIds) {
        const definition = registry.find(candidate => candidate.id === calculatorId)
        if (!definition) {
          continue
        }

        const start = Date.now()
        await definition.run({
          database,
          trigger: queuedRun.trigger,
          selectedCalculatorIds: selected,
          runId: queuedRun.runId,
          logger,
        })
        entries.push({
          calculatorId,
          status: 'ok',
          durationMs: Date.now() - start,
        })
      }

      await Promise.resolve().then(() => writeLastRunWatermark(startedAt, database))
      const summary: CalculationRunSummary = {
        runId: queuedRun.runId,
        trigger: queuedRun.trigger,
        selectedCalculatorIds: selected,
        startedAt,
        finishedAt: new Date(),
        status: 'completed',
        entries,
      }

      await logger.log({
        timestamp: new Date(),
        category: 'calc-engine',
        message: JSON.stringify({
          ...summary,
          instanceId: INSTANCE_ID,
        }),
      })

      isRunning = false
      mutationSuppressionUntil = 0
      return summary
    } catch (error) {
      const summary: CalculationRunSummary = {
        runId: queuedRun.runId,
        trigger: queuedRun.trigger,
        selectedCalculatorIds: selected,
        startedAt,
        finishedAt: new Date(),
        status: 'failed',
        entries,
      }

      await logger.log({
        timestamp: new Date(),
        category: 'calc-engine',
        message: JSON.stringify({
          ...summary,
          instanceId: INSTANCE_ID,
          error: error instanceof Error ? error.message : String(error),
        }),
      })
      isRunning = false
      mutationSuppressionUntil = 0
      throw error
    }
  }

  async function run(calculatorIds?: string[], trigger: CalculationTriggerType = 'manual'): Promise<CalculationRunSummary> {
    const queuedRun: QueuedRun = {
      trigger,
      selectedCalculatorIds: calculatorIds,
      runId: createRunId(),
    }

    return executeRun(queuedRun)
  }

  function resolveExecutionOrder(selectedCalculatorIds: string[]): string[] {
    const requested = new Set(selectedCalculatorIds)
    const required = new Set<string>()

    for (const calculatorId of requested) {
      collectDependencies(calculatorId, required)
    }

    const ordered: string[] = []
    const visited = new Set<string>()

    const visit = (calculatorId: string) => {
      if (visited.has(calculatorId)) {
        return
      }

      const definition = registry.find(candidate => candidate.id === calculatorId)
      if (!definition) {
        return
      }

      for (const dependencyId of definition.dependsOn) {
        visit(dependencyId)
      }

      if (required.has(calculatorId)) {
        ordered.push(calculatorId)
      }
      visited.add(calculatorId)
    }

    for (const calculatorId of [...requested]) {
      visit(calculatorId)
    }

    return ordered
  }

  function collectDependencies(calculatorId: string, required: Set<string>): void {
    const definition = registry.find(candidate => candidate.id === calculatorId)
    if (!definition) {
      return
    }

    required.add(calculatorId)
    for (const dependencyId of definition.dependsOn) {
      collectDependencies(dependencyId, required)
    }
  }

  async function maybeScheduleStaleCheck(): Promise<void> {
    const lastRun = await database.calculationState.get('last-full-run')
    const lastRunAt = lastRun ? new Date(lastRun.value) : undefined
    if (!lastRunAt || Date.now() - lastRunAt.getTime() > staleCheckMs) {
      scheduleRun('stale-check')
    }
  }

  function registerMutationHooks(): void {
    const refreshFromMutation = () => {
      if (Date.now() < mutationSuppressionUntil) {
        return
      }
      scheduleRun('mutation')
    }

    database.subscriptions.hook('creating', refreshFromMutation)
    database.subscriptions.hook('updating', refreshFromMutation)
    database.payments.hook('creating', refreshFromMutation)
    database.payments.hook('updating', refreshFromMutation)
    database.settings.hook('creating', refreshFromMutation)
    database.settings.hook('updating', refreshFromMutation)
    cleanupHooks = []
  }

  function start(): void {
    if (isStarted) {
      return
    }

    isStarted = true
    registerMutationHooks()

    if (intervalMs > 0) {
      intervalTimer = window.setInterval(() => {
        void run(undefined, 'interval')
      }, intervalMs)
    }

    void maybeScheduleStaleCheck().then(() => {
      if (!debounceTimer) {
        void run(undefined, 'startup')
      }
    })
  }

  function stop(): void {
    isStarted = false
    if (debounceTimer) {
      clearTimeout(debounceTimer)
      debounceTimer = undefined
    }
    if (intervalTimer) {
      clearInterval(intervalTimer)
      intervalTimer = undefined
    }
    cleanupHooks.forEach(cleanup => cleanup())
    cleanupHooks = []
  }

  return {
    run,
    getRegistry,
    getDebugGraph,
    getCircuitBreakerState,
    getInstanceInfo,
    start,
    stop,
  }
}

function createDefaultRegistry(): CalculationDefinition[] {
  return [
    {
      id: 'projected-payments',
      dependsOn: [],
      run: async context => {
        const result = await materializeProjectedPaymentsWithStats({ database: context.database })
        context.logger.log({
          timestamp: new Date(),
          category: 'calc-engine',
          message: JSON.stringify({
            event: 'projected-payments-result',
            runId: context.runId,
            instanceId: INSTANCE_ID,
            deleteCount: result.deleteCount,
            createCount: result.createCount,
            totalPayments: result.payments.length,
          }),
        })
      },
    },
    {
      id: 'next-renewal-date',
      dependsOn: [],
      run: async context => {
        const database = context.database
        const today = todayCivilDate()
        const subscriptions = await database.subscriptions
          .filter(sub => !sub.archivedAt)
          .toArray()

        let updatedCount = 0
        let skippedCount = 0
        let errorCount = 0

        for (const sub of subscriptions) {
          try {
            const newDate = computeNextRenewalDateForSub(sub, today)
            const { notify, notifyDays } = computeDefaultAlertForSub(sub)

            const hasDateChanged = newDate !== sub.nextRenewalDate
            const hasNotifyChanged =
              notify !== sub.notifyBeforeRenewal ||
              notifyDays !== sub.notifyBeforeRenewalDays

            if (hasDateChanged || hasNotifyChanged) {
              await database.subscriptions.put({
                ...sub,
                nextRenewalDate: newDate,
                nextChargeDate: newDate ?? sub.nextChargeDate,
                notifyBeforeRenewal: notify,
                notifyBeforeRenewalDays: notifyDays,
                updatedAt: new Date(),
              })
              updatedCount++
            } else {
              skippedCount++
            }
          } catch (error) {
            errorCount++
            context.logger.log({
              timestamp: new Date(),
              category: 'calc-engine',
              message: JSON.stringify({
                event: 'next-renewal-date-error',
                runId: context.runId,
                instanceId: INSTANCE_ID,
                subscriptionId: sub.id,
                error: error instanceof Error ? error.message : String(error),
              }),
            })
          }
        }

        context.logger.log({
          timestamp: new Date(),
          category: 'calc-engine',
          message: JSON.stringify({
            event: 'next-renewal-date-result',
            runId: context.runId,
            instanceId: INSTANCE_ID,
            totalProcessed: subscriptions.length,
            updatedCount,
            skippedCount,
            errorCount,
          }),
        })
      },
    },
  ]
}

/**
 * Calcule nextRenewalDate pour un abonnement selon les règles métier.
 * - ENDED → undefined
 * - CANCELLED_PENDING_END avec serviceEndDate dépassée → undefined
 * - renewalMode ≠ AUTOMATIC → undefined
 * - Ancre: renewalPeriodStartDate > subscriptionDate > undefined
 * - Boucle while pour ajouter renewalInterval jusqu'à dépasser today
 */
export function computeNextRenewalDateForSub(
  sub: Subscription,
  today: string,
): string | undefined {
  // Règles d'arrêt
  if (sub.status === 'ENDED') {
    return undefined
  }

  if (
    sub.status === 'CANCELLED_PENDING_END' &&
    sub.serviceEndDate &&
    compareCivilDates(sub.serviceEndDate, today) < 0
  ) {
    return undefined
  }

  // Pas de renouvellement automatique → pas de calcul
  if (sub.renewalMode !== 'AUTOMATIC') {
    return undefined
  }

  // Déterminer l'ancre: renewalPeriodStartDate prioritaire, subscriptionDate en fallback
  const anchor = sub.renewalPeriodStartDate ?? sub.subscriptionDate
  if (!anchor) {
    return undefined
  }

  if (!sub.renewalIntervalUnit) {
    // Fallback sur le cycle de facturation si le cycle de renouvellement n'est pas défini
    if (!sub.billingIntervalUnit) {
      return undefined
    }
  }

  const count = sub.renewalIntervalCount ?? sub.billingIntervalCount ?? 1
  const unit = sub.renewalIntervalUnit ?? sub.billingIntervalUnit
  let result = anchor

  while (compareCivilDates(result, today) < 0) {
    result = addIntervalToCivilDate(result, unit!, count)
  }

  return result
}

/**
 * Détermine les valeurs par défaut de notifyBeforeRenewal et notifyBeforeRenewalDays.
 * Si l'utilisateur a déjà renseigné ces champs, les valeurs sont conservées.
 */
export function computeDefaultAlertForSub(sub: Subscription): {
  notify: boolean | undefined
  notifyDays: number | undefined
} {
  // Valeurs utilisateur déjà renseignées → conserver
  if (sub.notifyBeforeRenewal !== undefined && sub.notifyBeforeRenewalDays !== undefined) {
    return {
      notify: sub.notifyBeforeRenewal,
      notifyDays: sub.notifyBeforeRenewalDays,
    }
  }

  // Mode MANUAL → always / 7j
  if (sub.renewalMode === 'MANUAL') {
    return { notify: true, notifyDays: 7 }
  }

  // Si pas de cycle défini → fallback
  if (!sub.renewalIntervalUnit || !sub.renewalIntervalCount) {
    return { notify: true, notifyDays: 7 }
  }

  const unit = sub.renewalIntervalUnit
  const count = sub.renewalIntervalCount

  // Mensuel (ou hebdo court) → opt-in / 7j
  if (
    (unit === 'MONTH' && count <= 1) ||
    (unit === 'WEEK' && count <= 4)
  ) {
    return { notify: true, notifyDays: 7 }
  }

  // Annuel (ou long) → opt-out / 30j
  if (
    unit === 'YEAR' ||
    (unit === 'MONTH' && count >= 6)
  ) {
    return { notify: false, notifyDays: 30 }
  }

  // Fallback
  return { notify: true, notifyDays: 7 }
}

function createDiagnosticLogger(database: SubscriptionDatabase): CalculationLogger {
  return {
    log: async (entry: DiagnosticLog) => {
      await database.diagnosticLogs.add(entry)
    },
  }
}

async function writeLastRunWatermark(date: Date, database: SubscriptionDatabase): Promise<void> {
  await database.calculationState.put({
    key: 'last-full-run',
    value: date.toISOString(),
    updatedAt: new Date(),
  })
}

function createRunId(): string {
  return `calc-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`
}
