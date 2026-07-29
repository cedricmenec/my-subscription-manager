import { db, type DiagnosticLog, type SubscriptionDatabase } from '../data/db'
import { materializeProjectedPayments } from './payments'

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

interface QueuedRun {
  trigger: CalculationTriggerType
  selectedCalculatorIds?: string[]
  runId: string
}

export interface CalculationEngine {
  run: (calculatorIds?: string[], trigger?: CalculationTriggerType) => Promise<CalculationRunSummary>
  getRegistry: () => CalculationDefinition[]
  getDebugGraph: () => string[]
  start: () => void
  stop: () => void
}

export function createCalculationEngine(options: CalculationEngineOptions = {}): CalculationEngine {
  const database = options.database ?? db
  const debounceMs = options.debounceMs ?? 300
  const intervalMs = options.intervalMs ?? 0
  const staleCheckMs = options.staleCheckMs ?? 60 * 60 * 1000
  const logger = options.logger ?? createDiagnosticLogger(database)
  const registry = options.registry ?? createDefaultRegistry()
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

  function getDebugGraph(): string[] {
    return registry.map(definition => `${definition.id} -> ${definition.dependsOn.join(', ') || '(none)'}`)
  }

  function getRegistry(): CalculationDefinition[] {
    return [...registry]
  }

  function scheduleRun(trigger: CalculationTriggerType, selectedCalculatorIds?: string[]): void {
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
    mutationSuppressionUntil = Date.now() + 1000
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
        message: JSON.stringify(summary),
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
        await materializeProjectedPayments({ database: context.database })
      },
    },
  ]
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
