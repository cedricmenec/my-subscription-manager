import type { CircuitBreakerState } from '../../services/calculationEngine'

interface CircuitBreakerStatusProps {
  state: CircuitBreakerState
}

export default function CircuitBreakerStatus({ state }: CircuitBreakerStatusProps) {
  return (
    <div className="diagnostic-card">
      <h3 className="diagnostic-card-title">Circuit Breaker</h3>
      <div className="circuit-breaker-info">
        <div className="circuit-breaker-indicator">
          {state.active ? (
            <span className="circuit-breaker-active">
              <span className="circuit-breaker-dot circuit-breaker-dot-red" />
              🔒 Bloqué
            </span>
          ) : (
            <span className="circuit-breaker-inactive">
              <span className="circuit-breaker-dot circuit-breaker-dot-green" />
              ○ Inactif
            </span>
          )}
        </div>

        <dl className="circuit-breaker-details">
          <div>
            <dt>Seuil</dt>
            <dd>{state.threshold} runs mutation en {state.windowMs / 1000}s</dd>
          </div>
          <div>
            <dt>Durée de blocage</dt>
            <dd>{state.blockMs / 1000}s</dd>
          </div>
          <div>
            <dt>Runs mutation récents</dt>
            <dd>{state.recentMutationCount}</dd>
          </div>
          {state.active && state.blockedUntilDate && (
            <>
              <div>
                <dt>Début du blocage</dt>
                <dd>{new Date(state.blockedUntilDate).toLocaleTimeString('fr-FR')}</dd>
              </div>
              <div>
                <dt>Fin estimée</dt>
                <dd>
                  {new Date(
                    new Date(state.blockedUntilDate).getTime() + state.blockMs,
                  ).toLocaleTimeString('fr-FR')}
                </dd>
              </div>
            </>
          )}
        </dl>
      </div>
    </div>
  )
}