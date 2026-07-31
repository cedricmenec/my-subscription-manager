import { useMemo, useState, type ReactNode } from 'react'
import type {
  IntervalUnit,
  Payment,
  PaymentStatus,
  RenewalMode,
  Subscription,
  SubscriptionStatus,
} from '../data/db'
import { addIntervalToCivilDate, parseCivilDate, todayCivilDate } from '../services/civilDate'
import SubscriptionDialog, { toFormState } from '../components/SubscriptionDialog'

interface SubscriptionDetailPageProps {
  subscription?: Subscription
  isLoading: boolean
  payments: Payment[]
  categories: Array<{ id: string; name: string }>
  onBack: () => void
  onRefreshSubscriptions: () => void
  onRefreshFinance: () => void
  onFeedback: (message: string) => void
  onSetOperationStatus: (status: string) => void
}

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIAL: 'Essai',
  ACTIVE: 'Actif',
  PAUSED: 'En pause',
  CANCELLED_PENDING_END: 'Résilié, encore utilisable',
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

const RENEWAL_LABELS: Record<RenewalMode, string> = {
  ROLLING: 'Reconduction continue',
  AUTOMATIC: 'Renouvellement automatique',
  MANUAL: 'Renouvellement manuel',
  UNKNOWN: 'À qualifier',
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PROJECTED: 'Prévu',
  ASSUMED_PAID: 'Supposé payé',
  CONFIRMED_PAID: 'Confirmé',
  SKIPPED: 'Ignoré',
  REFUNDED: 'Remboursé',
}

const INTERVAL_LABELS: Record<IntervalUnit, string> = {
  DAY: 'jour',
  WEEK: 'semaine',
  MONTH: 'mois',
  YEAR: 'année',
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

function formatDate(value?: string): string {
  if (!value) return 'Non renseignée'
  try {
    return new Intl.DateTimeFormat('fr-FR', {
      day: 'numeric',
      month: 'long',
      year: 'numeric',
      timeZone: 'UTC',
    }).format(parseCivilDate(value))
  } catch {
    return value
  }
}

function formatTimestamp(value: unknown): string {
  const date = value instanceof Date
    ? value
    : typeof value === 'string' || typeof value === 'number'
      ? new Date(value)
      : undefined

  if (!date || Number.isNaN(date.getTime())) {
    return '—'
  }

  return new Intl.DateTimeFormat('fr-FR', {
    dateStyle: 'medium',
    timeStyle: 'short',
  }).format(date)
}

function formatRelativeDate(value: string, today: string): string {
  const millisecondsPerDay = 86_400_000
  const difference = Math.round(
    (parseCivilDate(value).getTime() - parseCivilDate(today).getTime()) / millisecondsPerDay,
  )

  if (difference === 0) return 'aujourd’hui'
  if (difference === 1) return 'demain'
  if (difference === -1) return 'hier'
  if (difference > 1) return `dans ${difference} jours`
  return `en retard de ${Math.abs(difference)} jours`
}

function formatInterval(count?: number, unit?: IntervalUnit): string {
  if (!count || !unit) return 'Non renseigné'
  const label = INTERVAL_LABELS[unit]
  return `${count} ${label}${count > 1 ? 's' : ''}`
}

function DetailField({ label, children }: { label: string; children: ReactNode }) {
  return (
    <div className="subscription-detail-field">
      <dt>{label}</dt>
      <dd>{children}</dd>
    </div>
  )
}

function PaymentRows({ payments }: { payments: Payment[] }) {
  return (
    <ul className="subscription-payment-list">
      {payments.map(payment => (
        <li key={payment.id}>
          <div>
            <strong>{formatDate(payment.scheduledDate)}</strong>
            {payment.paidDate ? <small>Payé le {formatDate(payment.paidDate)}</small> : null}
          </div>
          <span className={`payment-status payment-status-${payment.status.toLowerCase()}`}>
            {PAYMENT_STATUS_LABELS[payment.status]}
          </span>
          <strong>{formatMoney(payment.amount.amount, payment.amount.currency)}</strong>
        </li>
      ))}
    </ul>
  )
}

export default function SubscriptionDetailPage({
  subscription,
  isLoading,
  payments,
  categories,
  onBack,
  onRefreshSubscriptions,
  onRefreshFinance,
  onFeedback,
  onSetOperationStatus,
}: SubscriptionDetailPageProps) {
  const [dialogOpen, setDialogOpen] = useState(false)
  const today = todayCivilDate()

  const groups = useMemo(() => {
    if (!subscription) {
      return { upcoming: [], attention: [], history: [] }
    }

    const relevant = payments
      .filter(payment => payment.subscriptionId === subscription.id && !payment.deletedAt)
      .sort((left, right) => left.scheduledDate.localeCompare(right.scheduledDate))

    return {
      upcoming: relevant
        .filter(payment => payment.status === 'PROJECTED' && payment.scheduledDate >= today)
        .slice(0, 12),
      attention: relevant
        .filter(payment =>
          (payment.status === 'PROJECTED' || payment.status === 'ASSUMED_PAID') &&
          payment.scheduledDate < today,
        )
        .reverse(),
      history: relevant
        .filter(payment =>
          payment.status === 'CONFIRMED_PAID' ||
          payment.status === 'SKIPPED' ||
          payment.status === 'REFUNDED',
        )
        .reverse(),
    }
  }, [payments, subscription, today])

  if (isLoading) {
    return (
      <div className="subscription-detail-page" aria-busy="true">
        <p className="section-label">Abonnement</p>
        <h1>Chargement de l’abonnement…</h1>
      </div>
    )
  }

  if (!subscription) {
    return (
      <div className="subscription-detail-page">
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true"><span /></span>
          <div>
            <h1>Abonnement introuvable</h1>
            <p>Cet abonnement n’existe pas ou n’est plus disponible sur cet appareil.</p>
            <button type="button" className="primary-button" onClick={onBack}>
              Retour aux abonnements
            </button>
          </div>
        </div>
      </div>
    )
  }

  const category = categories.find(item => item.id === subscription.categoryId)
  const nextPayment = groups.upcoming[0]
  const nextPaymentDate = nextPayment?.scheduledDate ?? subscription.nextChargeDate
  const nextPaymentAmount = nextPayment
    ? formatMoney(nextPayment.amount.amount, nextPayment.amount.currency)
    : typeof subscription.currentPrice === 'number' && subscription.currency
      ? formatMoney(subscription.currentPrice, subscription.currency)
      : 'Montant non renseigné'
  const commitmentEndDate =
    subscription.commitmentStartDate &&
    subscription.commitmentIntervalUnit &&
    subscription.commitmentIntervalCount
      ? addIntervalToCivilDate(
          subscription.commitmentStartDate,
          subscription.commitmentIntervalUnit,
          subscription.commitmentIntervalCount,
        )
      : undefined

  function handleSaved() {
    onSetOperationStatus('enregistre-localement')
    onRefreshSubscriptions()
    onRefreshFinance()
  }

  return (
    <div className="subscription-detail-page">
      <button type="button" className="detail-back-button" onClick={onBack}>
        ← Retour aux abonnements
      </button>

      <header className="page-header subscription-detail-header">
        <div>
          <p className="section-label">Fiche abonnement</p>
          <div className="subscription-detail-title">
            <h1>{subscription.name}</h1>
            <span className={`compact-status-badge ${STATUS_CLASSES[subscription.status]}`}>
              {STATUS_LABELS[subscription.status]}
            </span>
          </div>
          <p className="subscription-detail-subtitle">
            {[subscription.planName, subscription.provider, category?.name].filter(Boolean).join(' · ') ||
              'Informations générales'}
          </p>
        </div>
        <button type="button" className="primary-button" onClick={() => setDialogOpen(true)}>
          Modifier
        </button>
      </header>

      <section className="subscription-highlight-grid" aria-label="Prochaines échéances importantes">
        <article className="subscription-highlight-card subscription-highlight-primary">
          <p className="section-label">Prochain paiement</p>
          {nextPaymentDate ? (
            <>
              <strong className="subscription-highlight-amount">{nextPaymentAmount}</strong>
              <time dateTime={nextPaymentDate}>{formatDate(nextPaymentDate)}</time>
              <span>{formatRelativeDate(nextPaymentDate, today)}</span>
            </>
          ) : (
            <>
              <strong className="subscription-highlight-empty">Aucune échéance disponible</strong>
              <span>Complétez la date de prochaine facturation pour activer les projections.</span>
            </>
          )}
        </article>

        {subscription.renewalMode === 'AUTOMATIC' ? (
          <article className="subscription-highlight-card">
            <p className="section-label">Prochain renouvellement</p>
            {subscription.nextRenewalDate ? (
              <>
                <strong className="subscription-highlight-date">
                  {formatDate(subscription.nextRenewalDate)}
                </strong>
                <span>{formatRelativeDate(subscription.nextRenewalDate, today)}</span>
                <span>Renouvellement automatique</span>
              </>
            ) : (
              <>
                <strong className="subscription-highlight-empty">Date non calculable</strong>
                <span>Vérifiez la période et le cycle de renouvellement.</span>
              </>
            )}
          </article>
        ) : null}
      </section>

      {groups.attention.length > 0 ? (
        <section className="subscription-detail-section subscription-attention-section" aria-labelledby="attention-title">
          <div className="subscription-section-heading">
            <div>
              <p className="section-label">Action recommandée</p>
              <h2 id="attention-title">À vérifier</h2>
            </div>
            <span className="item-count">{groups.attention.length}</span>
          </div>
          <p>Ces échéances sont passées mais leur statut financier n’est pas finalisé.</p>
          <PaymentRows payments={groups.attention} />
        </section>
      ) : null}

      <section className="subscription-detail-section" aria-labelledby="upcoming-title">
        <div className="subscription-section-heading">
          <div>
            <p className="section-label">Calendrier</p>
            <h2 id="upcoming-title">Prochaines échéances</h2>
          </div>
          <span className="item-count">{groups.upcoming.length}</span>
        </div>
        {groups.upcoming.length > 0 ? (
          <PaymentRows payments={groups.upcoming} />
        ) : (
          <p className="subscription-detail-empty">Aucune échéance matérialisée à venir.</p>
        )}
      </section>

      <div className="subscription-info-grid">
        <section className="subscription-detail-section" aria-labelledby="identity-title">
          <h2 id="identity-title">Identité et classement</h2>
          <dl>
            <DetailField label="Nom">{subscription.name}</DetailField>
            <DetailField label="Fournisseur">{subscription.provider || 'Non renseigné'}</DetailField>
            <DetailField label="Formule">{subscription.planName || 'Non renseignée'}</DetailField>
            <DetailField label="Catégorie">{category?.name || 'Non classé'}</DetailField>
            <DetailField label="Statut">{STATUS_LABELS[subscription.status]}</DetailField>
          </dl>
        </section>

        <section className="subscription-detail-section" aria-labelledby="billing-title">
          <h2 id="billing-title">Tarification et facturation</h2>
          <dl>
            <DetailField label="Prix courant">
              {typeof subscription.currentPrice === 'number' && subscription.currency
                ? formatMoney(subscription.currentPrice, subscription.currency)
                : 'Non renseigné'}
            </DetailField>
            <DetailField label="Devise">{subscription.currency || 'Non renseignée'}</DetailField>
            <DetailField label="Cycle de facturation">
              {formatInterval(subscription.billingIntervalCount, subscription.billingIntervalUnit)}
            </DetailField>
            <DetailField label="Prochaine facturation">{formatDate(subscription.nextChargeDate)}</DetailField>
          </dl>
        </section>

        <section className="subscription-detail-section" aria-labelledby="renewal-title">
          <h2 id="renewal-title">Engagement et renouvellement</h2>
          <dl>
            <DetailField label="Mode de renouvellement">
              {RENEWAL_LABELS[subscription.renewalMode]}
            </DetailField>
            {subscription.renewalMode !== 'ROLLING' ? (
              <>
                <DetailField label="Cycle de renouvellement">
                  {formatInterval(subscription.renewalIntervalCount, subscription.renewalIntervalUnit)}
                </DetailField>
                <DetailField label="Date de souscription">{formatDate(subscription.subscriptionDate)}</DetailField>
                <DetailField label="Début de période de renouvellement">
                  {formatDate(subscription.renewalPeriodStartDate)}
                </DetailField>
                <DetailField label="Prochain renouvellement">{formatDate(subscription.nextRenewalDate)}</DetailField>
              </>
            ) : null}
            <DetailField label="Début d’engagement">{formatDate(subscription.commitmentStartDate)}</DetailField>
            <DetailField label="Durée d’engagement">
              {formatInterval(subscription.commitmentIntervalCount, subscription.commitmentIntervalUnit)}
            </DetailField>
            <DetailField label="Fin d’engagement calculée">{formatDate(commitmentEndDate)}</DetailField>
          </dl>
        </section>

        <section className="subscription-detail-section" aria-labelledby="lifecycle-title">
          <h2 id="lifecycle-title">Cycle de vie</h2>
          <dl>
            <DetailField label="Début de service">{formatDate(subscription.startDate)}</DetailField>
            <DetailField label="Début de pause">{formatDate(subscription.pauseStartDate)}</DetailField>
            <DetailField label="Fin de pause">{formatDate(subscription.pauseUntil)}</DetailField>
            <DetailField label="Fin de service">{formatDate(subscription.serviceEndDate)}</DetailField>
          </dl>
        </section>

        <section className="subscription-detail-section" aria-labelledby="management-title">
          <h2 id="management-title">Gestion et résiliation</h2>
          <dl>
            <DetailField label="Gestion">
              {subscription.managementUrl ? (
                <a href={subscription.managementUrl} target="_blank" rel="noreferrer">
                  Ouvrir le site de gestion
                </a>
              ) : 'Aucune URL'}
            </DetailField>
            <DetailField label="Résiliation">
              {subscription.cancellationUrl ? (
                <a href={subscription.cancellationUrl} target="_blank" rel="noreferrer">
                  Ouvrir la page de résiliation
                </a>
              ) : 'Aucune URL'}
            </DetailField>
            <DetailField label="Instructions">
              <span className="preserve-whitespace">
                {subscription.cancellationInstructions || 'Aucune instruction'}
              </span>
            </DetailField>
          </dl>
        </section>

        <section className="subscription-detail-section" aria-labelledby="alerts-title">
          <h2 id="alerts-title">Alertes et commentaires</h2>
          <dl>
            <DetailField label="Alerte avant renouvellement">
              {subscription.notifyBeforeRenewal
                ? `${subscription.notifyBeforeRenewalDays ?? 'Délai non renseigné'} jour(s) avant`
                : 'Désactivée'}
            </DetailField>
            <DetailField label="Notes">
              <span className="preserve-whitespace">{subscription.notes || 'Aucune note'}</span>
            </DetailField>
          </dl>
        </section>
      </div>

      <details className="subscription-detail-section subscription-history">
        <summary>
          Historique des paiements
          <span className="item-count">{groups.history.length}</span>
        </summary>
        {groups.history.length > 0 ? (
          <PaymentRows payments={groups.history} />
        ) : (
          <p className="subscription-detail-empty">Aucun paiement finalisé dans l’historique.</p>
        )}
      </details>

      <section className="subscription-detail-metadata" aria-label="Métadonnées">
        <span>Identifiant : {subscription.id}</span>
        <span>Créé le {formatTimestamp(subscription.createdAt)}</span>
        <span>Mis à jour le {formatTimestamp(subscription.updatedAt)}</span>
      </section>

      <SubscriptionDialog
        key={`subscription-detail-dialog-${subscription.id}`}
        isOpen={dialogOpen}
        onClose={() => setDialogOpen(false)}
        onSaved={handleSaved}
        onSavedAfterSave={() => onRefreshSubscriptions()}
        onFeedback={onFeedback}
        editingId={subscription.id}
        formState={toFormState(subscription)}
        categories={categories}
      />
    </div>
  )
}
