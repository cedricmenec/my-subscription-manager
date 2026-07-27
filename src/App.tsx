import { type FormEvent, useEffect, useMemo, useState } from 'react'
import type { SyncState } from 'dexie-cloud-addon'
import {
  db,
  DEFAULT_DB_NAME,
  type IntervalUnit,
  type Payment,
  type PaymentStatus,
  type RenewalMode,
  type Subscription,
  type SubscriptionStatus,
} from './data/db'
import { saveLocalDraft } from './data/localDrafts'
import {
  getConnectedIdentity,
  loginWithEmailOtp,
  logout,
  purgeLocalData,
  type ConnectedIdentity,
} from './services/auth'
import { getSyncStatusLabel, mapSyncStateToAppStatus } from './services/syncState'
import {
  getFinancialSummary,
  listPayments,
  materializeProjectedPayments,
  updatePaymentStatus,
} from './services/payments'
import {
  archiveSubscription,
  computeSubscriptionCompletion,
  createCategory,
  createSubscription,
  listCategories,
  listSubscriptions,
  type SubscriptionFilters,
  type SubscriptionSort,
  type SubscriptionValidationError,
  updateSubscription,
} from './services/subscriptions'
import { validateExchangeRate } from './services/finance'

type OperationStatus =
  | 'aucune-operation'
  | 'enregistre-localement'
  | 'en-attente-sync'
  | 'synchronise'
  | 'erreur-sync'

interface FinancialSummaryState {
  baseCurrency: string
  /** @deprecated Utiliser monthlyEquivalent */
  monthlyEquivalentMinor: number
  monthlyEquivalent: number
  /** @deprecated Utiliser annualEquivalent */
  annualEquivalentMinor: number
  annualEquivalent: number
  /** @deprecated Utiliser projected30 */
  projected30Minor: number
  projected30: number
  /** @deprecated Utiliser projected90 */
  projected90Minor: number
  projected90: number
  /** @deprecated Utiliser expensesYearToDate */
  expensesYearToDateMinor: number
  expensesYearToDate: number
  includedSubscriptionCount: number
  excludedCurrencySubscriptionCount: number
  excludedSubscriptions: Array<{ id: string; reason: string }>
}

interface SubscriptionFormState {
  name: string
  provider: string
  planName: string
  categoryId: string
  status: SubscriptionStatus
  renewalMode: RenewalMode
  currentPrice: string
  currency: string
  billingIntervalCount: string
  billingIntervalUnit: IntervalUnit | ''
  commitmentIntervalCount: string
  commitmentIntervalUnit: IntervalUnit | ''
  renewalIntervalCount: string
  renewalIntervalUnit: IntervalUnit | ''
  nextChargeDate: string
  pauseUntil: string
  serviceEndDate: string
  managementUrl: string
  cancellationUrl: string
  cancellationInstructions: string
  notes: string
}

const STATUS_OPTIONS: SubscriptionStatus[] = [
  'TRIAL',
  'ACTIVE',
  'PAUSED',
  'CANCELLED_PENDING_END',
  'ENDED',
  'UNKNOWN',
]

const RENEWAL_OPTIONS: RenewalMode[] = ['AUTOMATIC', 'MANUAL', 'UNKNOWN']
const INTERVAL_UNIT_OPTIONS: IntervalUnit[] = ['WEEK', 'MONTH', 'YEAR']

const STATUS_LABELS: Record<SubscriptionStatus, string> = {
  TRIAL: 'Essai',
  ACTIVE: 'Actif',
  PAUSED: 'En pause',
  CANCELLED_PENDING_END: 'Résilié, encore utilisable',
  ENDED: 'Terminé',
  UNKNOWN: 'À qualifier',
}

const RENEWAL_LABELS: Record<RenewalMode, string> = {
  AUTOMATIC: 'Automatique',
  MANUAL: 'Manuel',
  UNKNOWN: 'Inconnu',
}

const INTERVAL_LABELS: Record<IntervalUnit, string> = {
  DAY: 'Jour',
  WEEK: 'Semaine',
  MONTH: 'Mois',
  YEAR: 'Année',
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PROJECTED: 'Prévu',
  ASSUMED_PAID: 'Supposé payé',
  CONFIRMED_PAID: 'Confirmé',
  SKIPPED: 'Ignoré',
  REFUNDED: 'Remboursé',
}

const EMPTY_SUMMARY: FinancialSummaryState = {
  baseCurrency: 'EUR',
  monthlyEquivalentMinor: 0,
  monthlyEquivalent: 0,
  annualEquivalentMinor: 0,
  annualEquivalent: 0,
  projected30Minor: 0,
  projected30: 0,
  projected90Minor: 0,
  projected90: 0,
  expensesYearToDateMinor: 0,
  expensesYearToDate: 0,
  includedSubscriptionCount: 0,
  excludedCurrencySubscriptionCount: 0,
  excludedSubscriptions: [],
}

const EMPTY_FORM: SubscriptionFormState = {
  name: '',
  provider: '',
  planName: '',
  categoryId: '',
  status: 'UNKNOWN',
  renewalMode: 'UNKNOWN',
  currentPrice: '',
  currency: 'EUR',
  billingIntervalCount: '1',
  billingIntervalUnit: 'MONTH',
  commitmentIntervalCount: '',
  commitmentIntervalUnit: '',
  renewalIntervalCount: '',
  renewalIntervalUnit: '',
  nextChargeDate: '',
  pauseUntil: '',
  serviceEndDate: '',
  managementUrl: '',
  cancellationUrl: '',
  cancellationInstructions: '',
  notes: '',
}

function getOperationLabel(status: OperationStatus): string {
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

function resolveOperationStatus(
  operationStatus: OperationStatus,
  appSyncStatus: ReturnType<typeof mapSyncStateToAppStatus>,
): OperationStatus {
  if (operationStatus === 'aucune-operation') {
    return operationStatus
  }

  if (appSyncStatus === 'erreur') {
    return 'erreur-sync'
  }

  if (appSyncStatus === 'synchronise') {
    return 'synchronise'
  }

  if (appSyncStatus === 'en-attente' || appSyncStatus === 'synchronisation-en-cours') {
    return 'en-attente-sync'
  }

  return operationStatus
}

function parseOptionalNumber(value: string): number | undefined {
  if (!value.trim()) {
    return undefined
  }

  const numericValue = Number(value)
  return Number.isFinite(numericValue) ? numericValue : undefined
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', {
      style: 'currency',
      currency,
    }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

function formatInterval(count?: number, unit?: IntervalUnit): string {
  if (!count || !unit) {
    return 'Non renseigné'
  }

  const label = INTERVAL_LABELS[unit]
  return `${count} ${label.toLowerCase()}${count > 1 ? 's' : ''}`
}

function toFormState(subscription: Subscription): SubscriptionFormState {
  const price = typeof subscription.currentPrice === 'number'
    ? String(subscription.currentPrice)
    : typeof subscription.currentPriceMinor === 'number'
      ? String(subscription.currentPriceMinor / 100)
      : ''

  return {
    name: subscription.name,
    provider: subscription.provider ?? '',
    planName: subscription.planName ?? '',
    categoryId: subscription.categoryId ?? '',
    status: subscription.status,
    renewalMode: subscription.renewalMode,
    currentPrice: price,
    currency: subscription.currency ?? 'EUR',
    billingIntervalCount: subscription.billingIntervalCount
      ? String(subscription.billingIntervalCount)
      : '1',
    billingIntervalUnit: subscription.billingIntervalUnit ?? 'MONTH',
    commitmentIntervalCount: subscription.commitmentIntervalCount
      ? String(subscription.commitmentIntervalCount)
      : '',
    commitmentIntervalUnit: subscription.commitmentIntervalUnit ?? '',
    renewalIntervalCount: subscription.renewalIntervalCount
      ? String(subscription.renewalIntervalCount)
      : '',
    renewalIntervalUnit: subscription.renewalIntervalUnit ?? '',
    nextChargeDate: subscription.nextChargeDate ?? '',
    pauseUntil: subscription.pauseUntil ?? '',
    serviceEndDate: subscription.serviceEndDate ?? '',
    managementUrl: subscription.managementUrl ?? '',
    cancellationUrl: subscription.cancellationUrl ?? '',
    cancellationInstructions: subscription.cancellationInstructions ?? '',
    notes: subscription.notes ?? '',
  }
}

function App() {
  const [syncState, setSyncState] = useState<SyncState>(() => db.cloud.syncState.getValue())
  const [persistedSyncState, setPersistedSyncState] = useState(() =>
    db.cloud.persistedSyncState.getValue(),
  )
  const [identity, setIdentity] = useState<ConnectedIdentity>(() => getConnectedIdentity())
  const [email, setEmail] = useState('')
  const [operationStatus, setOperationStatus] =
    useState<OperationStatus>('aucune-operation')
  const [feedback, setFeedback] = useState('')
  const [networkOnline, setNetworkOnline] = useState<boolean>(navigator.onLine)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
  const [payments, setPayments] = useState<Payment[]>([])
  const [summary, setSummary] = useState<FinancialSummaryState>(EMPTY_SUMMARY)
  const [categories, setCategories] = useState<Array<{ id: string; name: string }>>([])
  const [formState, setFormState] = useState<SubscriptionFormState>(EMPTY_FORM)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [editingSubscriptionId, setEditingSubscriptionId] = useState<string | null>(null)
  const [newCategoryName, setNewCategoryName] = useState('')
  const [search, setSearch] = useState('')
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'ALL'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string | 'ALL'>('ALL')
  const [renewalFilter, setRenewalFilter] = useState<RenewalMode | 'ALL'>('ALL')
  const [sortBy, setSortBy] = useState<SubscriptionSort>('nextChargeDate')
  const [onlyIncomplete, setOnlyIncomplete] = useState(false)
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})
  const [newExchangeCurrency, setNewExchangeCurrency] = useState('')
  const [newExchangeRate, setNewExchangeRate] = useState('')
  const [exchangeRateErrors, setExchangeRateErrors] = useState<Record<string, string>>({})

  const appSyncStatus = useMemo(() => mapSyncStateToAppStatus(syncState), [syncState])

  useEffect(() => {
    const syncSubscription = db.cloud.syncState.subscribe(setSyncState)
    const persistedSyncSubscription = db.cloud.persistedSyncState.subscribe(setPersistedSyncState)
    const userSubscription = db.cloud.currentUser.subscribe(() => {
      setIdentity(getConnectedIdentity())
    })

    function handleOnline() {
      setNetworkOnline(navigator.onLine)
    }

    window.addEventListener('online', handleOnline)
    window.addEventListener('offline', handleOnline)

    return () => {
      syncSubscription.unsubscribe()
      persistedSyncSubscription.unsubscribe()
      userSubscription.unsubscribe()
      window.removeEventListener('online', handleOnline)
      window.removeEventListener('offline', handleOnline)
    }
  }, [])

  const filters = useMemo<SubscriptionFilters>(
    () => ({
      search,
      status: statusFilter,
      categoryId: categoryFilter,
      renewalMode: renewalFilter,
      sortBy,
      onlyIncomplete,
    }),
    [search, statusFilter, categoryFilter, renewalFilter, sortBy, onlyIncomplete],
  )

  useEffect(() => {
    async function loadContextData() {
      try {
        const [loadedSubscriptions, loadedCategories] = await Promise.all([
          listSubscriptions(filters),
          listCategories(),
        ])

        setSubscriptions(loadedSubscriptions)
        setCategories(loadedCategories.map(category => ({ id: category.id, name: category.name })))

        const settings = await db.settings.where('key').equals('main').first()
        if (settings?.exchangeRates) {
          setExchangeRates(settings.exchangeRates)
        }

        try {
          await materializeProjectedPayments()
        } catch (error) {
          console.error('materializeProjectedPayments failed during initial load', error)
          setFeedback('Impossible de générer certaines échéances. Les données affichées restent disponibles.')
        }

        const [loadedPayments, loadedSummary] = await Promise.all([
          listPayments(),
          getFinancialSummary(),
        ])

        setPayments(loadedPayments)
        setSummary(loadedSummary)
      } catch (error) {
        console.error('loadContextData failed', error)
        setFeedback(
          `Chargement impossible: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
        )
      }
    }

    void loadContextData()
  }, [filters])

  const effectiveOperationStatus = useMemo(
    () => resolveOperationStatus(operationStatus, appSyncStatus),
    [operationStatus, appSyncStatus],
  )

  const incompleteSubscriptions = useMemo(
    () => subscriptions.filter(item => !computeSubscriptionCompletion(item).isComplete),
    [subscriptions],
  )

  async function refreshSubscriptions() {
    setSubscriptions(await listSubscriptions(filters))
  }

  async function refreshCategories() {
    const loadedCategories = await listCategories()
    setCategories(loadedCategories.map(category => ({ id: category.id, name: category.name })))
  }

  async function refreshFinance() {
    try {
      await materializeProjectedPayments()
    } catch (error) {
      console.error('materializeProjectedPayments failed during refresh', error)
      setFeedback('Impossible de générer certaines échéances. Les données affichées restent disponibles.')
    }

    try {
      const [loadedPayments, loadedSummary] = await Promise.all([listPayments(), getFinancialSummary()])
      setPayments(loadedPayments)
      setSummary(loadedSummary)
    } catch (error) {
      console.error('refreshFinance failed', error)
      setFeedback(
        `Impossible d'actualiser les finances: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      )
    }
  }

  function updateFormField<K extends keyof SubscriptionFormState>(
    field: K,
    value: SubscriptionFormState[K],
  ) {
    setFormState(previous => ({ ...previous, [field]: value }))
  }

  async function handleLogin() {
    try {
      if (!email.trim()) {
        setFeedback('Saisissez une adresse e-mail pour démarrer la connexion OTP.')
        return
      }

      await loginWithEmailOtp(email.trim())
      setFeedback('Demande OTP envoyée. Consultez votre e-mail pour poursuivre.')
    } catch (error) {
      setFeedback(
        `Échec de la connexion: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      )
    }
  }

  async function handleLogout() {
    try {
      await logout()
      setFeedback('Déconnexion effectuée.')
    } catch (error) {
      setFeedback(
        `Impossible de se déconnecter: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      )
    }
  }

  async function handlePurgeLocalData() {
    const shouldPurge = window.confirm(
      'Supprimer les données locales de cet appareil ? La copie distante Dexie Cloud est conservée.',
    )

    if (!shouldPurge) {
      return
    }

    try {
      await purgeLocalData()
      setOperationStatus('aucune-operation')
      setFeedback('Purge locale terminée. Les données distantes restent intactes.')
    } catch (error) {
      setFeedback(
        `Échec de la purge locale: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      )
    }
  }

  async function handleSaveLocalDraft() {
    try {
      const now = Date.now().toString()
      await saveLocalDraft({
        key: `draft-${now}`,
        value: `Brouillon créé le ${new Date().toISOString()}`,
      })
      setOperationStatus('enregistre-localement')
      setFeedback('Modification locale enregistrée sans attente réseau.')
    } catch (error) {
      setOperationStatus('erreur-sync')
      setFeedback(
        `Échec de l'enregistrement local: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      )
    }
  }

  async function handleSyncNow() {
    try {
      await db.cloud.sync()
      setFeedback('Synchronisation manuelle terminée.')
    } catch (error) {
      setFeedback(
        `Synchronisation impossible: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      )
    }
  }

  async function handleAddExchangeRate() {
    setExchangeRateErrors({})

    const trimmedCurrency = newExchangeCurrency.trim().toUpperCase()
    const parsedRate = newExchangeRate.trim() ? Number(newExchangeRate.trim()) : NaN

    const validation = validateExchangeRate(trimmedCurrency, parsedRate)
    if (!validation.isValid) {
      setExchangeRateErrors(validation.errors)
      return
    }

    const updatedRates = { ...exchangeRates, [trimmedCurrency]: parsedRate }
    setExchangeRates(updatedRates)
    setNewExchangeCurrency('')
    setNewExchangeRate('')
    setExchangeRateErrors({})
    setFeedback(`Taux de conversion ${trimmedCurrency}→EUR: ${parsedRate} enregistré.`)

    try {
      const settings = await db.settings.where('key').equals('main').first()
      if (settings) {
        await db.settings.put({
          ...settings,
          exchangeRates: updatedRates,
          updatedAt: new Date(),
        })
      } else {
        const now = new Date()
        await db.settings.put({
          id: `stt-${crypto.randomUUID()}`,
          key: 'main',
          baseCurrency: 'EUR',
          timezone: 'Europe/Paris',
          paymentAssumptionEnabled: false,
          paymentAssumptionDelayDays: 5,
          exchangeRates: updatedRates,
          createdAt: now,
          updatedAt: now,
          schemaVersion: 3,
        })
      }
      setOperationStatus('enregistre-localement')
      void refreshFinance()
    } catch (error) {
      setFeedback(
        `Impossible de sauvegarder le taux: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      )
    }
  }

  async function handleRemoveExchangeRate(currency: string) {
    const updatedRates = { ...exchangeRates }
    delete updatedRates[currency]
    setExchangeRates(updatedRates)
    setFeedback(`Taux de conversion ${currency} supprimé.`)

    try {
      const settings = await db.settings.where('key').equals('main').first()
      if (settings) {
        await db.settings.put({
          ...settings,
          exchangeRates: updatedRates,
          updatedAt: new Date(),
        })
      }
      setOperationStatus('enregistre-localement')
      void refreshFinance()
    } catch (error) {
      setFeedback(
        `Impossible de supprimer le taux: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      )
    }
  }

  async function handleSubmitSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormErrors({})

    try {
      const payload = {
        name: formState.name,
        provider: formState.provider,
        planName: formState.planName,
        categoryId: formState.categoryId,
        status: formState.status,
        renewalMode: formState.renewalMode,
        currentPrice: parseOptionalNumber(formState.currentPrice),
        currency: formState.currency,
        billingIntervalCount: parseOptionalNumber(formState.billingIntervalCount),
        billingIntervalUnit: formState.billingIntervalUnit || undefined,
        commitmentIntervalCount: parseOptionalNumber(formState.commitmentIntervalCount),
        commitmentIntervalUnit: formState.commitmentIntervalUnit || undefined,
        renewalIntervalCount: parseOptionalNumber(formState.renewalIntervalCount),
        renewalIntervalUnit: formState.renewalIntervalUnit || undefined,
        nextChargeDate: formState.nextChargeDate,
        pauseUntil: formState.pauseUntil,
        serviceEndDate: formState.serviceEndDate,
        managementUrl: formState.managementUrl,
        cancellationUrl: formState.cancellationUrl,
        cancellationInstructions: formState.cancellationInstructions,
        notes: formState.notes,
      }

      if (editingSubscriptionId) {
        await updateSubscription(editingSubscriptionId, payload)
        setFeedback('Abonnement modifié localement. Synchronisation asynchrone en cours.')
      } else {
        await createSubscription(payload)
        setFeedback('Abonnement créé localement. Synchronisation asynchrone en cours.')
      }

      setOperationStatus('enregistre-localement')
      setFormState(EMPTY_FORM)
      setEditingSubscriptionId(null)
      await Promise.all([refreshSubscriptions(), refreshFinance()])
    } catch (error) {
      if (error instanceof Error && error.name === 'SubscriptionValidationError') {
        const typedError = error as SubscriptionValidationError
        setFormErrors(typedError.errors)
      }

      setFeedback(
        `Enregistrement impossible: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      )
    }
  }

  function handleEditSubscription(subscription: Subscription) {
    setEditingSubscriptionId(subscription.id)
    setFormErrors({})
    setFormState(toFormState(subscription))
  }

  async function handleArchiveSubscription(id: string) {
    await archiveSubscription(id)
    setOperationStatus('enregistre-localement')
    setFeedback('Abonnement archivé localement. Synchronisation asynchrone en cours.')
    await Promise.all([refreshSubscriptions(), refreshFinance()])
  }

  async function handleCreateCategory() {
    try {
      await createCategory(newCategoryName)
      setNewCategoryName('')
      await refreshCategories()
    } catch (error) {
      setFeedback(
        `Impossible de créer la catégorie: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      )
    }
  }

  async function handlePaymentAction(payment: Payment, status: PaymentStatus) {
    await updatePaymentStatus(payment.id, {
      status,
      paidDate: status === 'CONFIRMED_PAID' ? payment.scheduledDate : payment.paidDate,
    })
    setOperationStatus('enregistre-localement')
    setFeedback(`Paiement mis à jour localement: ${PAYMENT_STATUS_LABELS[status]}.`)
    await refreshFinance()
  }

  const identityLabel = identity.isLoggedIn
    ? identity.email ?? identity.userId ?? identity.name ?? 'Connecté'
    : 'Non connecté'

  const lastSyncDate = persistedSyncState?.timestamp
    ? persistedSyncState.timestamp.toISOString()
    : 'N/A'

  return (
    <div className="app-shell">
      <header className="topbar">
        <a className="brand" href="/" aria-label="Abos, accueil">
          <span className="brand-mark" aria-hidden="true">
            A
          </span>
          <span>Abos</span>
        </a>
        <span className="usage-label">Espace personnel</span>
      </header>

      <main className="main-content">
        <header className="page-header">
          <div>
            <p className="section-label">Vue principale</p>
            <h1>Abonnements</h1>
          </div>
          <p className="item-count" aria-label="Nombre d'abonnements">
            {subscriptions.length} abonnement{subscriptions.length > 1 ? 's' : ''}
          </p>
        </header>

        <section className="status-panel" aria-label="Statut global de synchronisation">
          <div>
            <p className="status-title">Synchronisation</p>
            <p className="status-value">{getSyncStatusLabel(appSyncStatus)}</p>
          </div>
          <div>
            <p className="status-title">Dernière opération locale</p>
            <p className="status-value">{getOperationLabel(effectiveOperationStatus)}</p>
          </div>
          <button type="button" className="secondary-button" onClick={handleSyncNow}>
            Synchroniser maintenant
          </button>
        </section>

        <section className="control-card" aria-labelledby="exchange-rates-title">
          <h2 id="exchange-rates-title">Taux de conversion</h2>
          <p>Configurez les taux de conversion pour inclure les abonnements en devise étrangère dans les totaux consolidés (1 unité devise = X EUR).</p>
          {Object.keys(exchangeRates).length > 0 ? (
            <ul className="payment-list">
              {Object.entries(exchangeRates).map(([currency, rate]) => (
                <li key={currency} className="payment-item">
                  <div>
                    <p className="payment-status payment-status-confirmed_paid">{currency} → EUR</p>
                    <p>Taux: {rate}</p>
                  </div>
                  <div className="button-row">
                    <button type="button" className="danger-button" onClick={() => void handleRemoveExchangeRate(currency)}>
                      Supprimer
                    </button>
                  </div>
                </li>
              ))}
            </ul>
          ) : (
            <p>Aucun taux de conversion configuré. Les abonnements en devise étrangère sont exclus des totaux.</p>
          )}
          <div className="category-row">
            <input
              value={newExchangeCurrency}
              onChange={event => setNewExchangeCurrency(event.target.value)}
              placeholder="Devise (ex: USD)"
              maxLength={3}
              style={{ textTransform: 'uppercase' }}
            />
            <input
              value={newExchangeRate}
              onChange={event => setNewExchangeRate(event.target.value)}
              placeholder="Taux (ex: 0.92)"
              type="number"
              step="any"
              min="0"
            />
            <button type="button" onClick={() => void handleAddExchangeRate()}>
              Ajouter
            </button>
          </div>
          {exchangeRateErrors.currency ? <span className="field-error">{exchangeRateErrors.currency}</span> : null}
          {exchangeRateErrors.rate ? <span className="field-error">{exchangeRateErrors.rate}</span> : null}
        </section>

        <section className="summary-grid" aria-labelledby="financial-summary-title">
          <article className="summary-card">
            <p className="status-title">Coût mensuel équivalent</p>
            <h2 id="financial-summary-title">
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
              {Object.keys(exchangeRates).length > 0
                ? ` | ${Object.keys(exchangeRates).length} taux configuré(s)`
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
            <p>
              Dépenses YTD: {formatMoney(summary.expensesYearToDate, summary.baseCurrency)}
            </p>
          </article>
        </section>

        <section className="controls-grid" aria-label="Actions de connexion et de stockage">
          <article className="control-card">
            <h2>Connexion Dexie Cloud</h2>
            <label htmlFor="email-input">Adresse e-mail</label>
            <input
              id="email-input"
              name="email"
              type="email"
              placeholder="prenom.nom@example.com"
              value={email}
              onChange={event => setEmail(event.target.value)}
            />
            <div className="button-row">
              <button type="button" onClick={handleLogin}>
                Se connecter (OTP)
              </button>
              <button type="button" className="secondary-button" onClick={handleLogout}>
                Se déconnecter
              </button>
            </div>
          </article>

          <article className="control-card">
            <h2>Local-first</h2>
            <p>
              Les écritures sont validées localement sur cet appareil avant la synchronisation
              réseau.
            </p>
            <div className="button-row">
              <button type="button" onClick={handleSaveLocalDraft}>
                Enregistrer un brouillon local
              </button>
              <button type="button" className="danger-button" onClick={handlePurgeLocalData}>
                Purger les données locales
              </button>
            </div>
          </article>
        </section>

        {feedback ? <p className="feedback">{feedback}</p> : null}

        <section className="control-card" aria-labelledby="filters-title">
          <h2 id="filters-title">Recherche, filtres et tri</h2>
          <div className="form-grid form-grid-compact">
            <label>
              Recherche
              <input
                type="search"
                value={search}
                onChange={event => setSearch(event.target.value)}
                placeholder="Nom, fournisseur, notes"
              />
            </label>
            <label>
              Statut
              <select
                value={statusFilter}
                onChange={event => setStatusFilter(event.target.value as SubscriptionStatus | 'ALL')}
              >
                <option value="ALL">Tous</option>
                {STATUS_OPTIONS.map(status => (
                  <option key={status} value={status}>
                    {STATUS_LABELS[status]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Catégorie
              <select value={categoryFilter} onChange={event => setCategoryFilter(event.target.value)}>
                <option value="ALL">Toutes</option>
                {categories.map(category => (
                  <option key={category.id} value={category.id}>
                    {category.name}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Renouvellement
              <select
                value={renewalFilter}
                onChange={event => setRenewalFilter(event.target.value as RenewalMode | 'ALL')}
              >
                <option value="ALL">Tous</option>
                {RENEWAL_OPTIONS.map(mode => (
                  <option key={mode} value={mode}>
                    {RENEWAL_LABELS[mode]}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tri principal
              <select value={sortBy} onChange={event => setSortBy(event.target.value as SubscriptionSort)}>
                <option value="nextChargeDate">Prochaine échéance</option>
                <option value="updatedAt">Dernière mise à jour</option>
              </select>
            </label>
            <label className="checkbox-label">
              <input
                type="checkbox"
                checked={onlyIncomplete}
                onChange={event => setOnlyIncomplete(event.target.checked)}
              />
              Uniquement les abonnements incomplets
            </label>
          </div>
        </section>

        <section className="list-section" aria-labelledby="list-title">
          <h2 id="list-title">Liste des abonnements</h2>
          {subscriptions.length === 0 ? (
            <p>Aucun abonnement ne correspond aux filtres.</p>
          ) : (
            <ul className="subscription-list">
              {subscriptions.map(subscription => {
                const completion = computeSubscriptionCompletion(subscription)
                const exclusion = summary.excludedSubscriptions.find(ex => ex.id === subscription.id)
                const subCurrency = subscription.currency
                const hasConversion = Boolean(
                  !exclusion &&
                    subCurrency &&
                    subCurrency !== summary.baseCurrency &&
                    exchangeRates[subCurrency],
                )

                return (
                  <li key={subscription.id} className="subscription-item">
                    <div>
                      <h3>
                        {subscription.name}
                        {exclusion ? (
                          <span className="exclusion-badge" title={exclusion.reason}>
                            ⚠️ Exclu
                          </span>
                        ) : null}
                        {hasConversion && subCurrency ? (
                          <span
                            className="conversion-badge"
                            title={`Taux ${subCurrency}→${summary.baseCurrency}: ${exchangeRates[subCurrency]}`}
                          >
                            💱 Converti
                          </span>
                        ) : null}
                      </h3>
                      <p>
                        Statut: {STATUS_LABELS[subscription.status]} | Renouvellement:{' '}
                        {RENEWAL_LABELS[subscription.renewalMode]}
                      </p>
                      <p>
                        Facturation: {formatInterval(subscription.billingIntervalCount, subscription.billingIntervalUnit)}
                      </p>
                      <p>
                        Prochaine échéance: {subscription.nextChargeDate ?? 'Non renseignée'} |
                        {' '}Complétude: {completion.score}%
                      </p>
                      {typeof subscription.currentPrice === 'number' && subscription.currency ? (
                        <p>
                          Tarif courant: {formatMoney(subscription.currentPrice, subscription.currency)}
                        </p>
                      ) : typeof subscription.currentPriceMinor === 'number' && subscription.currency ? (
                        <p>
                          Tarif courant: {formatMoney(subscription.currentPriceMinor / 100, subscription.currency)}
                        </p>
                      ) : null}
                      {subscription.notes ? <p>Notes: {subscription.notes}</p> : null}
                    </div>
                    <div className="button-row">
                      <button type="button" onClick={() => handleEditSubscription(subscription)}>
                        Modifier
                      </button>
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => {
                          void handleArchiveSubscription(subscription.id)
                        }}
                      >
                        Archiver
                      </button>
                    </div>
                  </li>
                )
              })}
            </ul>
          )}
        </section>

        <section className="control-card" aria-labelledby="payments-title">
          <h2 id="payments-title">Paiements</h2>
          {payments.length === 0 ? (
            <p>Aucun paiement projeté ou enregistré pour le moment.</p>
          ) : (
            <ul className="payment-list">
              {payments.map(payment => (
                <li key={payment.id} className="payment-item">
                  <div>
                    <p className={`payment-status payment-status-${payment.status.toLowerCase()}`}>
                      {PAYMENT_STATUS_LABELS[payment.status]}
                    </p>
                    <h3>{payment.scheduledDate}</h3>
                    <p>{formatMoney(payment.amount.amount ?? payment.amount.amountMinor / 100, payment.amount.currency)}</p>
                    <p>Abonnement: {payment.subscriptionId}</p>
                  </div>
                  <div className="button-row">
                    {payment.status === 'PROJECTED' || payment.status === 'ASSUMED_PAID' ? (
                      <button
                        type="button"
                        className="secondary-button"
                        onClick={() => {
                          void handlePaymentAction(payment, 'CONFIRMED_PAID')
                        }}
                      >
                        Confirmer
                      </button>
                    ) : null}
                    {payment.status !== 'SKIPPED' ? (
                      <button
                        type="button"
                        onClick={() => {
                          void handlePaymentAction(payment, 'SKIPPED')
                        }}
                      >
                        Ignorer
                      </button>
                    ) : null}
                    {payment.status === 'ASSUMED_PAID' || payment.status === 'CONFIRMED_PAID' ? (
                      <button
                        type="button"
                        className="danger-button"
                        onClick={() => {
                          void handlePaymentAction(payment, 'REFUNDED')
                        }}
                      >
                        Rembourser
                      </button>
                    ) : null}
                  </div>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="control-card" aria-labelledby="form-title">
          <h2 id="form-title">
            {editingSubscriptionId ? 'Modifier un abonnement' : 'Créer un abonnement'}
          </h2>
          <form onSubmit={handleSubmitSubscription} noValidate>
            <div className="form-grid">
              <label>
                Nom
                <input value={formState.name} onChange={event => updateFormField('name', event.target.value)} />
                {formErrors.name ? <span className="field-error">{formErrors.name}</span> : null}
              </label>
              <label>
                Fournisseur
                <input value={formState.provider} onChange={event => updateFormField('provider', event.target.value)} />
              </label>
              <label>
                Plan
                <input value={formState.planName} onChange={event => updateFormField('planName', event.target.value)} />
              </label>
              <label>
                Prix
                <input value={formState.currentPrice} onChange={event => updateFormField('currentPrice', event.target.value)} />
                {formErrors.currentPrice ? <span className="field-error">{formErrors.currentPrice}</span> : null}
              </label>
              <label>
                Devise
                <input value={formState.currency} onChange={event => updateFormField('currency', event.target.value)} />
              </label>
              <label>
                Statut
                <select value={formState.status} onChange={event => updateFormField('status', event.target.value as SubscriptionStatus)}>
                  {STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>
                      {STATUS_LABELS[status]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Mode de renouvellement
                <select value={formState.renewalMode} onChange={event => updateFormField('renewalMode', event.target.value as RenewalMode)}>
                  {RENEWAL_OPTIONS.map(mode => (
                    <option key={mode} value={mode}>
                      {RENEWAL_LABELS[mode]}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Facturation: quantité
                <input value={formState.billingIntervalCount} onChange={event => updateFormField('billingIntervalCount', event.target.value)} />
              </label>
              <label>
                Facturation: unité
                <select value={formState.billingIntervalUnit} onChange={event => updateFormField('billingIntervalUnit', event.target.value as IntervalUnit)}>
                  {INTERVAL_UNIT_OPTIONS.map(unit => (
                    <option key={unit} value={unit}>
                      {INTERVAL_LABELS[unit]}
                    </option>
                  ))}
                </select>
                {formErrors.billingInterval ? <span className="field-error">{formErrors.billingInterval}</span> : null}
              </label>
              <label>
                Engagement: quantité
                <input value={formState.commitmentIntervalCount} onChange={event => updateFormField('commitmentIntervalCount', event.target.value)} />
              </label>
              <label>
                Engagement: unité
                <select value={formState.commitmentIntervalUnit} onChange={event => updateFormField('commitmentIntervalUnit', event.target.value as IntervalUnit | '')}>
                  <option value="">Aucune</option>
                  {INTERVAL_UNIT_OPTIONS.map(unit => (
                    <option key={unit} value={unit}>
                      {INTERVAL_LABELS[unit]}
                    </option>
                  ))}
                </select>
                {formErrors.commitmentInterval ? <span className="field-error">{formErrors.commitmentInterval}</span> : null}
              </label>
              <label>
                Renouvellement: quantité
                <input value={formState.renewalIntervalCount} onChange={event => updateFormField('renewalIntervalCount', event.target.value)} />
              </label>
              <label>
                Renouvellement: unité
                <select value={formState.renewalIntervalUnit} onChange={event => updateFormField('renewalIntervalUnit', event.target.value as IntervalUnit | '')}>
                  <option value="">Aucun</option>
                  {INTERVAL_UNIT_OPTIONS.map(unit => (
                    <option key={unit} value={unit}>
                      {INTERVAL_LABELS[unit]}
                    </option>
                  ))}
                </select>
                {formErrors.renewalInterval ? <span className="field-error">{formErrors.renewalInterval}</span> : null}
              </label>
              <label>
                Catégorie
                <select value={formState.categoryId} onChange={event => updateFormField('categoryId', event.target.value)}>
                  <option value="">Aucune</option>
                  {categories.map(category => (
                    <option key={category.id} value={category.id}>
                      {category.name}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Prochaine échéance
                <input type="date" value={formState.nextChargeDate} onChange={event => updateFormField('nextChargeDate', event.target.value)} />
                {formErrors.nextChargeDate ? <span className="field-error">{formErrors.nextChargeDate}</span> : null}
              </label>
              <label>
                Fin de pause
                <input type="date" value={formState.pauseUntil} onChange={event => updateFormField('pauseUntil', event.target.value)} />
                {formErrors.pauseUntil ? <span className="field-error">{formErrors.pauseUntil}</span> : null}
              </label>
              <label>
                Fin de service
                <input type="date" value={formState.serviceEndDate} onChange={event => updateFormField('serviceEndDate', event.target.value)} />
                {formErrors.serviceEndDate ? <span className="field-error">{formErrors.serviceEndDate}</span> : null}
              </label>
              <label>
                URL de gestion
                <input value={formState.managementUrl} onChange={event => updateFormField('managementUrl', event.target.value)} />
                {formErrors.managementUrl ? <span className="field-error">{formErrors.managementUrl}</span> : null}
              </label>
              <label>
                URL de résiliation
                <input value={formState.cancellationUrl} onChange={event => updateFormField('cancellationUrl', event.target.value)} />
                {formErrors.cancellationUrl ? <span className="field-error">{formErrors.cancellationUrl}</span> : null}
              </label>
            </div>

            <label>
              Instructions de résiliation
              <textarea value={formState.cancellationInstructions} onChange={event => updateFormField('cancellationInstructions', event.target.value)} />
            </label>
            <label>
              Notes
              <textarea value={formState.notes} onChange={event => updateFormField('notes', event.target.value)} />
            </label>

            <div className="button-row">
              <button type="submit">
                {editingSubscriptionId ? 'Enregistrer les modifications' : 'Créer'}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={() => {
                  setEditingSubscriptionId(null)
                  setFormErrors({})
                  setFormState(EMPTY_FORM)
                }}
              >
                Réinitialiser le formulaire
              </button>
            </div>
          </form>

          <div className="category-row">
            <input value={newCategoryName} onChange={event => setNewCategoryName(event.target.value)} placeholder="Nouvelle catégorie" />
            <button type="button" onClick={() => void handleCreateCategory()}>
              Ajouter la catégorie
            </button>
          </div>
        </section>

        <section className="control-card" aria-labelledby="incomplete-title">
          <h2 id="incomplete-title">À compléter</h2>
          {incompleteSubscriptions.length === 0 ? (
            <p>Tous les abonnements visibles sont complets.</p>
          ) : (
            <ul className="incomplete-list">
              {incompleteSubscriptions.map(subscription => {
                const completion = computeSubscriptionCompletion(subscription)
                return (
                  <li key={subscription.id}>
                    <strong>{subscription.name}</strong>: {completion.label}
                  </li>
                )
              })}
            </ul>
          )}
          {summary.excludedCurrencySubscriptionCount > 0 ? (
            <details className="exclusion-details">
              <summary>{summary.excludedCurrencySubscriptionCount} abonnement(s) exclu(s) des totaux consolidés</summary>
              <ul className="incomplete-list">
                {summary.excludedSubscriptions.map(ex => {
                  const sub = subscriptions.find(s => s.id === ex.id)
                  return (
                    <li key={ex.id}>
                      <strong>{sub?.name ?? ex.id}</strong>: {ex.reason}
                    </li>
                  )
                })}
              </ul>
            </details>
          ) : null}
        </section>

        {subscriptions.length === 0 ? (
          <section className="empty-state" aria-labelledby="empty-state-title">
            <span className="empty-state-icon" aria-hidden="true">
              <span />
            </span>
            <div>
              <h2 id="empty-state-title">Aucun abonnement enregistré</h2>
              <p>Utilisez le formulaire ci-dessus pour créer une première fiche.</p>
            </div>
          </section>
        ) : null}

        <section className="diagnostics" aria-labelledby="diagnostics-title">
          <h2 id="diagnostics-title">Diagnostic</h2>
          <dl>
            <div>
              <dt>Version applicative</dt>
              <dd>{import.meta.env.VITE_APP_VERSION ?? '0.0.0-dev'}</dd>
            </div>
            <div>
              <dt>Base locale</dt>
              <dd>{DEFAULT_DB_NAME}</dd>
            </div>
            <div>
              <dt>Identité connectée</dt>
              <dd>{identityLabel}</dd>
            </div>
            <div>
              <dt>Statut réseau</dt>
              <dd>{networkOnline ? 'En ligne' : 'Hors ligne'}</dd>
            </div>
            <div>
              <dt>Statut Dexie Cloud</dt>
              <dd>{getSyncStatusLabel(appSyncStatus)}</dd>
            </div>
            <div>
              <dt>Dernière synchronisation</dt>
              <dd>{lastSyncDate}</dd>
            </div>
            <div>
              <dt>Environnement</dt>
              <dd>{import.meta.env.VITE_APP_ENVIRONMENT ?? 'development'}</dd>
            </div>
          </dl>
        </section>
      </main>
    </div>
  )
}

export default App