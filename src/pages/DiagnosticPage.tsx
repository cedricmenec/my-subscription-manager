import { useMemo } from 'react'
import { createCalculationEngine, type CalculationEngine } from '../services/calculationEngine'
import SyncRateGauge from '../components/diagnostic/SyncRateGauge'
import CalculationTimeline from '../components/diagnostic/CalculationTimeline'
import WriteImpact from '../components/diagnostic/WriteImpact'
import CircuitBreakerStatus from '../components/diagnostic/CircuitBreakerStatus'
import InstanceIdentity from '../components/diagnostic/InstanceIdentity'

interface DiagnosticPageProps {
  calculationEngine: CalculationEngine
}

export default function DiagnosticPage({ calculationEngine }: DiagnosticPageProps) {
  const cbState = useMemo(
    () => calculationEngine.getCircuitBreakerState(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [calculationEngine],
  )
  const instanceInfo = useMemo(
    () => calculationEngine.getInstanceInfo(),
    // eslint-disable-next-line react-hooks/exhaustive-deps
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

      <div className="diagnostic-full-width">
        <CalculationTimeline />
      </div>
    </div>
  )
}