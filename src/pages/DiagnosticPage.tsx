import { useMemo, useState, useCallback } from 'react'
import type { CalculationEngine, CalculationRunSummary } from '../services/calculationEngine'
import SyncRateGauge from '../components/diagnostic/SyncRateGauge'
import CalculationTimeline from '../components/diagnostic/CalculationTimeline'
import WriteImpact from '../components/diagnostic/WriteImpact'
import CircuitBreakerStatus from '../components/diagnostic/CircuitBreakerStatus'
import InstanceIdentity from '../components/diagnostic/InstanceIdentity'

interface DiagnosticPageProps {
  calculationEngine: CalculationEngine
}

export default function DiagnosticPage({ calculationEngine }: DiagnosticPageProps) {
  const [isRunning, setIsRunning] = useState(false)
  const [lastRunStatus, setLastRunStatus] = useState<CalculationRunSummary['status'] | null>(null)
  const [lastRunAt, setLastRunAt] = useState<Date | null>(null)

  const handleRerun = useCallback(async () => {
    setIsRunning(true)
    try {
      const summary = await calculationEngine.run(undefined, 'manual')
      setLastRunStatus(summary.status)
      setLastRunAt(new Date())
    } catch {
      setLastRunStatus('failed')
      setLastRunAt(new Date())
    } finally {
      setIsRunning(false)
    }
  }, [calculationEngine])

  const cbState = useMemo(
    () => calculationEngine.getCircuitBreakerState(),
    [calculationEngine],
  )
  const instanceInfo = useMemo(
    () => calculationEngine.getInstanceInfo(),
    [calculationEngine],
  )

  return (
    <div>
      <div className="page-header">
        <div>
          <p className="section-label">Diagnostic</p>
          <h1>Diagnostic système</h1>
        </div>
      </div>

      <div className="diagnostic-grid">
        <SyncRateGauge />
        <CircuitBreakerStatus state={cbState} />
        <InstanceIdentity info={instanceInfo} />
        <WriteImpact />
      </div>

      <div className="diagnostic-full-width" style={{ marginBottom: '12px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', flexWrap: 'wrap' }}>
          <button onClick={handleRerun} disabled={isRunning}>
            {isRunning ? 'Calcul en cours…' : 'Relancer les calculs'}
          </button>
          {lastRunAt && lastRunStatus && (
            <span style={{ color: '#52605d', fontSize: '0.8rem' }}>
              Dernier run&nbsp;: {lastRunAt.toLocaleTimeString('fr-FR', {
                hour: '2-digit',
                minute: '2-digit',
                second: '2-digit',
              })} — <span style={{ fontWeight: 700, color: lastRunStatus === 'completed' ? '#0b5e4e' : '#a44335' }}>{lastRunStatus === 'completed' ? '✓ terminé' : '✗ échec'}</span>
            </span>
          )}
        </div>
      </div>

      <div className="diagnostic-full-width">
        <CalculationTimeline />
      </div>
    </div>
  )
}