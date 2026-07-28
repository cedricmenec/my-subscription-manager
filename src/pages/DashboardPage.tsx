import { type Subscription } from '../data/db'
import type { SyncState } from 'dexie-cloud-addon'
import { getSyncStatusLabel, mapSyncStateToAppStatus } from '../services/syncState'
import { computeSubscriptionCompletion } from '../services/subscriptions'

interface FinancialSummary {
  baseCurrency: string
  monthlyEquivalent: number
  annualEquivalent: number
  projected30: number
  projected90: number
  expensesYearToDate: number
  includedSubscriptionCount: number
  excludedCurrencySubscriptionCount: number
  excludedSubscriptions: Array<{ id: string; reason: string }>
}

interface DashboardPageProps {
  summary: FinancialSummary
  subscriptions: Subscription[]
  payments: Array<{ id: string; scheduledDate: string; amount: { amount: number; currency: string }; subscriptionId: string }>
  syncState: SyncState
  operationStatus: string
  onSyncNow: () => void
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

function getOperationLabel(status: string): string {
  switch (status) {
    case 'enregistre-localement':
      return 'Enregistré sur cet appareil'
    case 'en-attente-sync':
      return 'Synchronisation en attente'
    case 'synchronise':
      return 'Synchronisé'
    case 'erreur-sync':
      return 'Erreur de synchronisation'
    case 'aucune-operation':
    default:
      return 'Aucune opération locale récente'
  }
}

export default function DashboardPage({
  summary,
  subscriptions,
  payments,
  syncState,
  operationStatus,
  onSyncNow,
}: DashboardPageProps) {
  const appSyncStatus = mapSyncStateToAppStatus(syncState)

  // Calculate next 5 upcoming charges
  const upcomingCharges = [...payments]
    .filter(p => p.scheduledDate && new Date(p.scheduledDate) >= new Date(new Date().toDateString()))
    .sort((a, b) => a.scheduledDate.localeCompare(b.scheduledDate))
    .slice(0, 5)

  const incompleteSubs = subscriptions.filter(s => !computeSubscriptionCompletion(s).isComplete)

  return (
    <div className="dashboard-page">
      <header className="page-header">
        <div>
          <p className="section-label">Tableau de bord</p>
          <h1>Pilotage</h1>
        </div>
      </header>

      {/* Statut sync */}
      <section className="status-panel" aria-label="Statut global de synchronisation">
        <div>
          <p className="status-title">Synchronisation</p>
          <p className="status-value">{getSyncStatusLabel(appSyncStatus)}</p>
        </div>
        <div>
          <p className="status-title">Dernière opération locale</p>
          <p className="status-value">{getOperationLabel(operationStatus)}</p>
        </div>
        <button type="button" className="secondary-button" onClick={onSyncNow}>
          Synchroniser maintenant
        </button>
      </section>

      {/* Financial summary cards */}
      <section className="summary-grid" aria-labelledby="dashboard-summary-title">
        <article className="summary-card">
          <p className="status-title">Coût mensuel équivalent</p>
          <h2 id="dashboard-summary-title">
            {formatMoney(summary.monthlyEquivalent, summary.baseCurrency)}
          </h2>
          <p>{summary.includedSubscriptionCount} abonnement(s) inclus</p>
        </article>
        <article className="summary-card">
          <p className="status-title">Coût annuel équivalent</p>
          <h2>{formatMoney(summary.annualEquivalent, summary.baseCurrency)}</h2>
          <p>
            Base consolidée: {summary.baseCurrency}
            {summary.excludedCurrencySubscriptionCount > 0
              ? ` | ${summary.excludedCurrencySubscriptionCount} exclu(s)`
              : ''}
          </p>
        </article>
        <article className="summary-card">
          <p className="status-title">Décaissements à 30 jours</p>
          <h2>{formatMoney(summary.projected30, summary.baseCurrency)}</h2>
          <p>Projection locale</p>
        </article>
        <article className="summary-card">
          <p className="status-title">Décaissements à 90 jours</p>
          <h2>{formatMoney(summary.projected90, summary.baseCurrency)}</h2>
          <p>Dépenses YTD: {formatMoney(summary.expensesYearToDate, summary.baseCurrency)}</p>
        </article>
      </section>

      <div className="dashboard-grid-2col">
        {/* Upcoming charges */}
        <section className="dashboard-card" aria-labelledby="upcoming-title">
          <h2 id="upcoming-title" className="dashboard-card-title">⏰ Prochaines échéances</h2>
          {upcomingCharges.length === 0 ? (
            <p className="dashboard-card-empty">Aucune échéance à venir.</p>
          ) : (
            <ul className="dashboard-list">
              {upcomingCharges.map(p => {
                const sub = subscriptions.find(s => s.id === p.subscriptionId)
                return (
                  <li key={p.id} className="dashboard-list-item">
                    <span className="dashboard-list-date">{p.scheduledDate}</span>
                    <span className="dashboard-list-name">{sub?.name ?? 'Abonnement'}</span>
                    <span className="dashboard-list-amount">
                      {formatMoney(p.amount.amount, p.amount.currency)}
                    </span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        {/* Incomplete subscriptions */}
        <section className="dashboard-card" aria-labelledby="incomplete-title">
          <h2 id="incomplete-title" className="dashboard-card-title">⚠️ Abonnements à compléter</h2>
          {incompleteSubs.length === 0 ? (
            <p className="dashboard-card-empty">Tous les abonnements sont complets.</p>
          ) : (
            <ul className="dashboard-list">
              {incompleteSubs.map(s => {
                const completion = computeSubscriptionCompletion(s)
                return (
                  <li key={s.id} className="dashboard-list-item">
                    <span className="dashboard-list-name">{s.name}</span>
                    <span className="dashboard-list-score">{completion.score}%</span>
                  </li>
                )
              })}
            </ul>
          )}
        </section>
      </div>
    </div>
  )
}