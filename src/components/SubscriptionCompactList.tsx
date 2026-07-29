import { type Subscription, type SubscriptionStatus } from '../data/db'
import { type SortDirection } from '../services/subscriptions'

export type CompactColumn =
  | 'name'
  | 'status'
  | 'currentPrice'
  | 'billingInterval'
  | 'nextChargeDate'
  | 'nextRenewalDate'
  | 'categoryId'

export const COMPACT_COLUMNS: { key: CompactColumn; label: string; sortable: boolean }[] = [
  { key: 'name', label: 'Nom', sortable: true },
  { key: 'status', label: 'Statut', sortable: true },
  { key: 'currentPrice', label: 'Prix', sortable: true },
  { key: 'billingInterval', label: 'Cycle', sortable: false },
  { key: 'nextChargeDate', label: 'Échéance', sortable: true },
  { key: 'nextRenewalDate', label: 'Renouvellement', sortable: true },
  { key: 'categoryId', label: 'Catégorie', sortable: true },
]

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIAL: 'Essai',
  ACTIVE: 'Actif',
  PAUSED: 'En pause',
  CANCELLED_PENDING_END: 'Résilié',
  ENDED: 'Terminé',
  UNKNOWN: 'À qualifier',
}

const STATUS_CLASSES: Record<SubscriptionStatus, string> = {
  TRIAL: 'compact-status-trial',
  ACTIVE: 'compact-status-active',
  PAUSED: 'compact-status-paused',
  CANCELLED_PENDING_END: 'compact-status-ending',
  ENDED: 'compact-status-ended',
  UNKNOWN: 'compact-status-unknown',
}

const INTERVAL_LABELS: Record<string, string> = {
  DAY: 'jour',
  WEEK: 'semaine',
  MONTH: 'mois',
  YEAR: 'année',
}

function formatInterval(count?: number, unit?: string): string {
  if (!count || !unit) return '—'
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

interface SubscriptionCompactListProps {
  subscriptions: Subscription[]
  sortBy: CompactColumn
  sortDirection: SortDirection
  onSort: (column: CompactColumn) => void
  onEdit: (subscription: Subscription) => void
  onArchive: (id: string) => void
  categories: Array<{ id: string; name: string }>
  excludedIds: string[]
  excludedReasons: Map<string, string>
  convertedIds: string[]
}

export default function SubscriptionCompactList({
  subscriptions,
  sortBy,
  sortDirection,
  onSort,
  onEdit,
  onArchive,
  categories,
  excludedIds,
  excludedReasons,
  convertedIds,
}: SubscriptionCompactListProps) {
  function getCategoryName(categoryId?: string): string {
    if (!categoryId) return '—'
    const cat = categories.find(c => c.id === categoryId)
    return cat?.name ?? '—'
  }

  function renderSortIndicator(column: CompactColumn): string {
    if (column !== sortBy) return ''
    return sortDirection === 'asc' ? ' ⬍' : ' ⬎'
  }

  return (
    <div className="compact-list-wrapper">
      <table className="compact-table" role="grid" aria-label="Liste des abonnements">
        <thead>
          <tr>
            {COMPACT_COLUMNS.map(col => (
              <th
                key={col.key}
                className={col.sortable ? 'compact-th-sortable' : 'compact-th'}
                onClick={col.sortable ? () => onSort(col.key) : undefined}
                tabIndex={col.sortable ? 0 : undefined}
                onKeyDown={col.sortable ? (e) => { if (e.key === 'Enter') onSort(col.key) } : undefined}
                aria-sort={
                  col.key === sortBy
                    ? sortDirection === 'asc' ? 'ascending' : 'descending'
                    : undefined
                }
              >
                {col.label}{renderSortIndicator(col.key)}
              </th>
            ))}
            <th className="compact-th-actions" aria-label="Actions">Actions</th>
          </tr>
        </thead>
        <tbody>
          {subscriptions.length === 0 ? (
            <tr>
              <td colSpan={8} className="compact-empty">
                Aucun abonnement ne correspond aux filtres.
              </td>
            </tr>
          ) : (
            subscriptions.map(sub => (
              <tr key={sub.id} className="compact-row">
                <td className="compact-cell-name">
                  <span className="compact-name">{sub.name}</span>
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
                </td>
                <td>
                  <span className={`compact-status-badge ${STATUS_CLASSES[sub.status]}`}>
                    {STATUS_LABELS[sub.status]}
                  </span>
                </td>
                <td className="compact-cell-price">
                  {typeof sub.currentPrice === 'number' && sub.currency
                    ? formatMoney(sub.currentPrice, sub.currency)
                    : '—'}
                </td>
                <td>{formatInterval(sub.billingIntervalCount, sub.billingIntervalUnit)}</td>
                <td>{sub.nextChargeDate ?? '—'}</td>
                <td>{sub.nextRenewalDate ?? 'Calcul auto'}</td>
                <td>{getCategoryName(sub.categoryId)}</td>
                <td className="compact-cell-actions">
                  <button
                    type="button"
                    className="compact-action-btn"
                    onClick={() => onEdit(sub)}
                    aria-label={`Modifier ${sub.name}`}
                    title="Modifier"
                  >
                    ✎
                  </button>
                  <button
                    type="button"
                    className="compact-action-btn compact-action-archive"
                    onClick={() => onArchive(sub.id)}
                    aria-label={`Archiver ${sub.name}`}
                    title="Archiver"
                  >
                    🗑
                  </button>
                </td>
              </tr>
            ))
          )}
        </tbody>
      </table>
    </div>
  )
}
