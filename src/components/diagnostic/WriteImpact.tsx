import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'

export default function WriteImpact() {
  const projectedResults = useLiveQuery(
    () =>
      db.diagnosticLogs
        .where('category')
        .equals('calc-engine')
        .reverse()
        .limit(100)
        .toArray(),
    [],
  )

  if (!projectedResults || projectedResults.length === 0) {
    return (
      <div className="diagnostic-card">
        <h3 className="diagnostic-card-title">Impact en écritures</h3>
        <p className="diagnostic-empty">(aucune donnée)</p>
      </div>
    )
  }

  // Extract projected-payments results
  const results = projectedResults
    .map(entry => {
      try {
        const parsed = JSON.parse(entry.message) as Record<string, unknown>
        if (parsed.event === 'projected-payments-result') {
          return {
            runId: String(parsed.runId ?? ''),
            deleteCount: Number(parsed.deleteCount ?? 0),
            createCount: Number(parsed.createCount ?? 0),
            totalPayments: Number(parsed.totalPayments ?? 0),
            timestamp: new Date(entry.timestamp),
          }
        }
        return null
      } catch {
        return null
      }
    })
    .filter(Boolean) as Array<{
    runId: string
    deleteCount: number
    createCount: number
    totalPayments: number
    timestamp: Date
  }>

  if (results.length === 0) {
    return (
      <div className="diagnostic-card">
        <h3 className="diagnostic-card-title">Impact en écritures</h3>
        <p className="diagnostic-empty">(en attente d'exécution du calculateur)</p>
      </div>
    )
  }

  const lastResult = results[0]
  const totalWrites = lastResult.deleteCount + lastResult.createCount

  return (
    <div className="diagnostic-card">
      <h3 className="diagnostic-card-title">Impact en écritures</h3>
      <div className="write-impact-stats">
        <div className="write-impact-stat">
          <span className="write-impact-value">
            {lastResult.deleteCount}
          </span>
          <span className="write-impact-label">DELETEs</span>
        </div>
        <div className="write-impact-stat">
          <span className="write-impact-value">
            {lastResult.createCount}
          </span>
          <span className="write-impact-label">CREATEs</span>
        </div>
        <div className="write-impact-stat">
          <span className={`write-impact-value${totalWrites === 0 ? ' write-impact-idempotent' : ''}`}>
            {totalWrites === 0 ? '✅' : totalWrites}
          </span>
          <span className="write-impact-label">
            {totalWrites === 0 ? 'IDEMPOTENT' : 'Écritures totales'}
          </span>
        </div>
      </div>
      <p className="write-impact-trend">
        Dernier run : {lastResult.timestamp.toLocaleTimeString('fr-FR')}
      </p>
      {results.length >= 2 && (
        <details className="write-impact-details">
          <summary>Historique des runs récents</summary>
          <ul className="write-impact-history">
            {results.slice(0, 10).map(r => {
              const w = r.deleteCount + r.createCount
              return (
                <li key={r.runId} className={w === 0 ? 'write-impact-history-idempotent' : ''}>
                  {r.timestamp.toLocaleTimeString('fr-FR')} — {r.deleteCount}D + {r.createCount}C
                  {w === 0 ? ' ✅' : ` = ${w} écritures`}
                </li>
              )
            })}
          </ul>
        </details>
      )}
    </div>
  )
}