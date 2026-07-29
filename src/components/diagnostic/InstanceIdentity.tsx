import type { InstanceInfo } from '../../services/calculationEngine'

interface InstanceIdentityProps {
  info: InstanceInfo
}

export default function InstanceIdentity({ info }: InstanceIdentityProps) {
  return (
    <div className="diagnostic-card">
      <h3 className="diagnostic-card-title">Identité de l'instance</h3>
      <dl className="instance-info-details">
        <div>
          <dt>ID</dt>
          <dd><code>{info.id}</code></dd>
        </div>
        <div>
          <dt>Démarrée le</dt>
          <dd>{info.startedAt.toLocaleString('fr-FR')}</dd>
        </div>
        <div>
          <dt>Calculs émis</dt>
          <dd>{info.runCount}</dd>
        </div>
      </dl>
    </div>
  )
}