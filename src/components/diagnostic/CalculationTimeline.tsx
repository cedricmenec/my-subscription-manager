import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'

export default function CalculationTimeline() {
  const calcLogs = useLiveQuery(
    () =>
      db.diagnosticLogs
        .where('category')
        .equals('calc-engine')
        .reverse()
        .limit(40)
        .toArray(),
    [],
  )

  if (!calcLogs || calcLogs.length === 0) {
    return (
      <div className="diagnostic-card">
        <h3 className="diagnostic-card-title">Timeline des calculs</h3>
        <p className="diagnostic-empty">(aucune exécution enregistrée)</p>
      </div>
    )
  }

  return (
    <div className="diagnostic-card">
      <h3 className="diagnostic-card-title">Timeline des calculs</h3>
      <div className="diagnostic-timeline">
        {calcLogs.map((entry, index) => {
          let parsed: Record<string, unknown> | null = null
          try {
            parsed = JSON.parse(entry.message) as Record<string, unknown>
          } catch {
            // ignore
          }

          const isRunSummary = parsed && 'trigger' in parsed && 'status' in parsed
          const isProjectedResult = parsed && parsed.event === 'projected-payments-result'
          const isRenewalResult = parsed && parsed.event === 'next-renewal-date-result'
          const isRenewalError = parsed && parsed.event === 'next-renewal-date-error'
          const isRenewalSkip = parsed && parsed.event === 'next-renewal-date-skip'

          if (isRunSummary && parsed) {
            const trigger = String(parsed.trigger ?? '?')
            const status = String(parsed.status ?? 'unknown')
            const startedAt = parsed.startedAt ? new Date(parsed.startedAt as string) : null
            const finishedAt = parsed.finishedAt ? new Date(parsed.finishedAt as string) : null
            const durationMs =
              startedAt && finishedAt ? finishedAt.getTime() - startedAt.getTime() : null
            const entries = (parsed.entries as Array<{ calculatorId: string; status: string; durationMs: number }>) ?? []
            const isSlow = durationMs !== null && durationMs > 1000

            const time = startedAt
              ? startedAt.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit', second: '2-digit' })
              : '?'

            const detail = entries
              .map(e => `${e.calculatorId}:${e.status} ${e.durationMs}ms`)
              .join(', ')

            return (
              <div
                key={entry.id ?? index}
                className={`diagnostic-timeline-item${isSlow ? ' diagnostic-timeline-item-slow' : ''}`}
              >
                <span className="diagnostic-timeline-time">{time}</span>
                <span className={`diagnostic-timeline-badge badge-${status}`}>{status}</span>
                <span className="diagnostic-timeline-trigger">{trigger}</span>
                <span className="diagnostic-timeline-duration">
                  {durationMs !== null ? `${durationMs}ms` : '?'}
                  {isSlow && ' ⚠️'}
                </span>
                <span className="diagnostic-timeline-detail">{detail}</span>
              </div>
            )
          }

          if (isProjectedResult && parsed) {
            const deleteCount = Number(parsed.deleteCount ?? 0)
            const createCount = Number(parsed.createCount ?? 0)
            const totalWrites = deleteCount + createCount

            return (
              <div
                key={entry.id ?? index}
                className={`diagnostic-timeline-item${totalWrites === 0 ? ' diagnostic-timeline-item-idempotent' : ''}`}
              >
                <span className="diagnostic-timeline-time">
                  {new Date(entry.timestamp).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span className="diagnostic-timeline-badge badge-write">📝</span>
                <span className="diagnostic-timeline-trigger">projected-payments</span>
                <span className="diagnostic-timeline-duration">
                  {totalWrites === 0 ? '✅ idempotent' : `${deleteCount}D + ${createCount}C = ${totalWrites} écritures`}
                </span>
              </div>
            )
          }

          if (isRenewalResult && parsed) {
            const updatedCount = Number(parsed.updatedCount ?? 0)
            const skippedCount = Number(parsed.skippedCount ?? 0)
            const errorCount = Number(parsed.errorCount ?? 0)
            const hasErrors = errorCount > 0

            return (
              <div
                key={entry.id ?? index}
                className={`diagnostic-timeline-item${hasErrors ? ' diagnostic-timeline-item-error' : ''}`}
              >
                <span className="diagnostic-timeline-time">
                  {new Date(entry.timestamp).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span className="diagnostic-timeline-badge badge-renewal">📅</span>
                <span className="diagnostic-timeline-trigger">next-renewal-date</span>
                <span className="diagnostic-timeline-duration">
                  {hasErrors ? `⚠️ ${errorCount} erreur${errorCount > 1 ? 's' : ''}` : '✅ ok'}
                </span>
                <span className="diagnostic-timeline-detail">
                  {updatedCount} maj, {skippedCount} ignoré{skippedCount !== 1 ? 's' : ''}
                  {hasErrors && `, ${errorCount} erreur${errorCount > 1 ? 's' : ''}`}
                </span>
              </div>
            )
          }

          if (isRenewalError && parsed) {
            const subscriptionId = String(parsed.subscriptionId ?? '?')
            const errorMessage = String(parsed.error ?? '?')

            return (
              <div
                key={entry.id ?? index}
                className="diagnostic-timeline-item diagnostic-timeline-item-error"
              >
                <span className="diagnostic-timeline-time">
                  {new Date(entry.timestamp).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span className="diagnostic-timeline-badge badge-error">❌</span>
                <span className="diagnostic-timeline-trigger">next-renewal-date</span>
                <span className="diagnostic-timeline-detail">
                  {subscriptionId}: {errorMessage}
                </span>
              </div>
            )
          }

          if (isRenewalSkip && parsed) {
            const reason = String(parsed.reason ?? '?')
            const subscriptionName = String(parsed.subscriptionName ?? parsed.subscriptionId ?? '?')

            const reasonLabels: Record<string, string> = {
              'missing-anchor': 'Ancre absente',
              'missing-renewal-cycle': 'Cycle de renouvellement absent',
              'mode-not-automatic': 'Mode non automatique',
              'status-ended': 'Statut terminé',
            }
            const reasonLabel = reasonLabels[reason] ?? reason

            return (
              <div
                key={entry.id ?? index}
                className="diagnostic-timeline-item"
              >
                <span className="diagnostic-timeline-time">
                  {new Date(entry.timestamp).toLocaleTimeString('fr-FR', {
                    hour: '2-digit',
                    minute: '2-digit',
                    second: '2-digit',
                  })}
                </span>
                <span className="diagnostic-timeline-badge badge-skip">⏭️</span>
                <span className="diagnostic-timeline-trigger">next-renewal-date</span>
                <span className="diagnostic-timeline-detail">
                  {subscriptionName} — {reasonLabel}
                </span>
              </div>
            )
          }

          return null
        })}
      </div>
    </div>
  )
}