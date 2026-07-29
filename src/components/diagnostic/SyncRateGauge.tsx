import { useEffect, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../../data/db'

const SYNC_QUOTA = 50
const SYNC_WINDOW_MS = 5 * 60 * 1000

export default function SyncRateGauge() {
  const [syncCount, setSyncCount] = useState(0)

  const logs = useLiveQuery(
    () =>
      db.diagnosticLogs
        .where('category')
        .anyOf('calc-engine', 'circuit-breaker')
        .reverse()
        .limit(500)
        .toArray(),
    [],
  )

  useEffect(() => {
    if (!logs) return

    const cutoff = Date.now() - SYNC_WINDOW_MS
    const recent = logs.filter(
      entry => new Date(entry.timestamp).getTime() >= cutoff,
    )
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setSyncCount(recent.length)
  }, [logs])

  const ratio = syncCount / SYNC_QUOTA
  const percent = Math.min(Math.round(ratio * 100), 100)
  const barColor =
    percent >= 80 ? 'var(--color-danger)' : percent >= 50 ? 'var(--color-warning)' : 'var(--color-success)'

  return (
    <div className="diagnostic-card">
      <h3 className="diagnostic-card-title">Jauge de synchronisation</h3>
      <div className="sync-gauge">
        <div className="sync-gauge-bar-bg">
          <div
            className="sync-gauge-bar-fill"
            style={{ width: `${percent}%`, backgroundColor: barColor }}
            role="meter"
            aria-valuenow={syncCount}
            aria-valuemin={0}
            aria-valuemax={SYNC_QUOTA}
            aria-label={`${syncCount} synchronisations sur ${SYNC_QUOTA} dans les 5 dernières minutes`}
          />
        </div>
        <span className="sync-gauge-label">
          {syncCount} / {SYNC_QUOTA} syncs (5 min)
        </span>
      </div>
      {percent >= 80 && (
        <p className="diagnostic-warning">
          ⚠️ Quota quasi atteint — risque de saturation des synchronisations.
        </p>
      )}
    </div>
  )
}