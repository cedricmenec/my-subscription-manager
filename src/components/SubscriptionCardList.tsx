import { type Subscription, type SubscriptionStatus } from '../data/db'

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIAL: 'Essai',
  ACTIVE: 'Actif',
  PAUSED: 'En pause',
  CANCELLED_PENDING_END: 'Résilié',
  ENDED: 'Terminé',
  UNKNOWN: 'À qualifier',
}

const STATUS_CLASSES: Record<SubscriptionStatus, string> = {
  TRIAL: 'card-status-trial',
  ACTIVE: 'card-status-active',
  PAUSED: 'card-status-paused',
  CANCELLED_PENDING_END: 'card-status-ending',
  ENDED: 'card-status-ended',
  UNKNOWN: 'card-status-unknown',
}

const INTERVAL_LABELS: Record<string, string> = {
  DAY: 'jour',
  WEEK: 'semaine',
  MONTH: 'mois',
  YEAR: 'année',
}

function formatInterval(count?: number, unit?: string): string {
  if (!count || !unit) return ''
  const label = INTERVAL_LABELS[unit] ?? unit.toLowerCase()
  return `${count} ${label}${count > 1 ? 's' : ''}`
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

interface SubscriptionCardListProps {
  subscriptions: Subscription[]
  onEdit: (subscription: Subscription) => void
  onArchive: (id: string) => void
  categories: Array<{ id: string; name: string }>
  excludedIds: string[]
  excludedReasons: Map<string, string>
  convertedIds: string[]
}

export default function SubscriptionCardList({
  subscriptions,
  onEdit,
  onArchive,
  categories,
  excludedIds,
  excludedReasons,
  convertedIds,
}: SubscriptionCardListProps) {
  function getCategoryName(categoryId?: string): string {
    if (!categoryId) return ''
    const cat = categories.find(c => c.id === categoryId)
    return cat?.name ?? ''
  }

  if (subscriptions.length === 0) {
    return (
      <div className="card-list-empty">
        <p>Aucun abonnement ne correspond aux filtres.</p>
      </div>
    )
  }

  return (
    <div className="card-list-grid">
      {subscriptions.map(sub => {
        const priceStr =
          typeof sub.currentPrice === 'number' && sub.currency
            ? formatMoney(sub.currentPrice, sub.currency)
            : ''
        const intervalStr = formatInterval(sub.billingIntervalCount, sub.billingIntervalUnit)
        const priceLabel = priceStr && intervalStr ? `${priceStr} / ${intervalStr}` : priceStr || intervalStr || 'Prix non défini'
        const categoryName = getCategoryName(sub.categoryId)

        return (
          <article key={sub.id} className="subscription-card" aria-label={sub.name}>
            <div className="card-header">
              <div className="card-title-row">
                <h3 className="card-name">{sub.name}</h3>
                <span className={`card-status-badge ${STATUS_CLASSES[sub.status]}`}>
                  {STATUS_LABELS[sub.status]}
                </span>
              </div>
              {sub.provider && <p className="card-provider">{sub.provider}</p>}
            </div>

            <div className="card-body">
              <p className="card-price">{priceLabel}</p>
              {sub.nextChargeDate && (
                <p className="card-date">
                  <span className="card-date-label">Prochaine échéance</span>
                  <span className="card-date-value">{sub.nextChargeDate}</span>
                </p>
              )}
              {sub.nextRenewalDate && (
                <p className="card-date">
                  <span className="card-date-label">Prochain renouvellement</span>
                  <span className="card-date-value">{sub.nextRenewalDate}</span>
                </p>
              )}
            </div>

            <div className="card-footer">
              <div className="card-meta">
                {categoryName && <span className="card-category">{categoryName}</span>}
                <span className="card-renewal">
                  {sub.renewalMode === 'AUTOMATIC' ? 'Renouv. auto' : sub.renewalMode === 'MANUAL' ? 'Renouv. manuel' : ''}
                </span>
              </div>
              <div className="card-badges">
                {excludedIds.includes(sub.id) && (
                  <span className="exclusion-badge" title={excludedReasons.get(sub.id) ?? ''}>
                    ⚠️ Exclu
                  </span>
                )}
                {convertedIds.includes(sub.id) && (
                  <span className="conversion-badge" title="Conversion de devise active">
                    💱 Converti
                  </span>
                )}
              </div>
              <div className="card-actions">
                <button
                  type="button"
                  className="secondary-button card-action-btn"
                  onClick={() => onEdit(sub)}
                >
                  ✎ Modifier
                </button>
                <button
                  type="button"
                  className="danger-button card-action-btn"
                  onClick={() => onArchive(sub.id)}
                >
                  🗑 Archiver
                </button>
              </div>
            </div>
          </article>
        )
      })}
    </div>
  )
}
