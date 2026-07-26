import { type FormEvent, useEffect, useMemo, useState } from 'react'
import type { SyncState } from 'dexie-cloud-addon'
import {
  db,
  DEFAULT_DB_NAME,
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

type OperationStatus =
  | 'aucune-operation'
  | 'enregistre-localement'
  | 'en-attente-sync'
  | 'synchronise'
  | 'erreur-sync'

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

const STATUS_OPTIONS: SubscriptionStatus[] = [
  'TRIAL',
  'ACTIVE',
  'PAUSED',
  'CANCELLED_PENDING_END',
  'ENDED',
  'UNKNOWN',
]

const RENEWAL_OPTIONS: RenewalMode[] = ['AUTOMATIC', 'MANUAL', 'UNKNOWN']

const BILLING_OPTIONS = ['WEEKLY', 'MONTHLY', 'YEARLY', 'UNKNOWN'] as const

interface SubscriptionFormState {
  name: string
  provider: string
  planName: string
  categoryId: string
  status: SubscriptionStatus
  renewalMode: RenewalMode
  currentPriceMinor: string
  currency: string
  billingInterval: (typeof BILLING_OPTIONS)[number]
  nextChargeDate: string
  pauseUntil: string
  serviceEndDate: string
  managementUrl: string
  cancellationUrl: string
  cancellationInstructions: string
  notes: string
}

const EMPTY_FORM: SubscriptionFormState = {
  name: '',
  provider: '',
  planName: '',
  categoryId: '',
  status: 'UNKNOWN',
  renewalMode: 'UNKNOWN',
  currentPriceMinor: '',
  currency: 'EUR',
  billingInterval: 'UNKNOWN',
  nextChargeDate: '',
  pauseUntil: '',
  serviceEndDate: '',
  managementUrl: '',
  cancellationUrl: '',
  cancellationInstructions: '',
  notes: '',
}

function toFormState(subscription: Subscription): SubscriptionFormState {
  return {
    name: subscription.name,
    provider: subscription.provider ?? '',
    planName: subscription.planName ?? '',
    categoryId: subscription.categoryId ?? '',
    status: subscription.status,
    renewalMode: subscription.renewalMode,
    currentPriceMinor:
      typeof subscription.currentPriceMinor === 'number'
        ? String(subscription.currentPriceMinor)
        : '',
    currency: subscription.currency ?? 'EUR',
    billingInterval: subscription.billingInterval ?? 'UNKNOWN',
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
  const [syncState, setSyncState] = useState<SyncState>(() =>
    db.cloud.syncState.getValue(),
  )
  const [persistedSyncState, setPersistedSyncState] = useState(() =>
    db.cloud.persistedSyncState.getValue(),
  )
  const [identity, setIdentity] = useState<ConnectedIdentity>(() =>
    getConnectedIdentity(),
  )
  const [email, setEmail] = useState('')
  const [operationStatus, setOperationStatus] =
    useState<OperationStatus>('aucune-operation')
  const [feedback, setFeedback] = useState('')
  const [networkOnline, setNetworkOnline] = useState<boolean>(navigator.onLine)
  const [subscriptions, setSubscriptions] = useState<Subscription[]>([])
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

  const appSyncStatus = useMemo(
    () => mapSyncStateToAppStatus(syncState),
    [syncState],
  )

  useEffect(() => {
    const syncSubscription = db.cloud.syncState.subscribe(setSyncState)
    const persistedSyncSubscription =
      db.cloud.persistedSyncState.subscribe(setPersistedSyncState)
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
      const [loadedSubscriptions, loadedCategories] = await Promise.all([
        listSubscriptions(filters),
        listCategories(),
      ])

      setSubscriptions(loadedSubscriptions)
      setCategories(loadedCategories.map(category => ({ id: category.id, name: category.name })))
    }

    void loadContextData()
  }, [filters])

  const effectiveOperationStatus = useMemo(
    () => resolveOperationStatus(operationStatus, appSyncStatus),
    [operationStatus, appSyncStatus],
  )

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

  async function refreshSubscriptions() {
    setSubscriptions(await listSubscriptions(filters))
  }

  async function refreshCategories() {
    const loadedCategories = await listCategories()
    setCategories(loadedCategories.map(category => ({ id: category.id, name: category.name })))
  }

  function updateFormField<K extends keyof SubscriptionFormState>(
    field: K,
    value: SubscriptionFormState[K],
  ) {
    setFormState(previous => ({ ...previous, [field]: value }))
  }

  async function handleSubmitSubscription(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormErrors({})

    try {
      const numericPrice =
        formState.currentPriceMinor.trim().length > 0
          ? Number(formState.currentPriceMinor)
          : undefined

      const payload = {
        name: formState.name,
        provider: formState.provider,
        planName: formState.planName,
        categoryId: formState.categoryId,
        status: formState.status,
        renewalMode: formState.renewalMode,
        currentPriceMinor: Number.isFinite(numericPrice) ? numericPrice : undefined,
        currency: formState.currency,
        billingInterval: formState.billingInterval,
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
      await refreshSubscriptions()
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
    await refreshSubscriptions()
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

  const identityLabel = identity.isLoggedIn
    ? identity.email ?? identity.userId ?? identity.name ?? 'Connecté'
    : 'Non connecté'

  const lastSyncDate = persistedSyncState?.timestamp
    ? persistedSyncState.timestamp.toISOString()
    : 'N/A'

  const incompleteSubscriptions = useMemo(
    () => subscriptions.filter(item => !computeSubscriptionCompletion(item).isComplete),
    [subscriptions],
  )

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
              <button
                type="button"
                className="danger-button"
                onClick={handlePurgeLocalData}
              >
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
                    {status}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Catégorie
              <select
                value={categoryFilter}
                onChange={event => setCategoryFilter(event.target.value)}
              >
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
                    {mode}
                  </option>
                ))}
              </select>
            </label>
            <label>
              Tri principal
              <select
                value={sortBy}
                onChange={event => setSortBy(event.target.value as SubscriptionSort)}
              >
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

                return (
                  <li key={subscription.id} className="subscription-item">
                    <div>
                      <h3>{subscription.name}</h3>
                      <p>
                        Statut: {subscription.status} | Renouvellement: {subscription.renewalMode}
                      </p>
                      <p>
                        Prochaine échéance: {subscription.nextChargeDate ?? 'Non renseignée'} | Complétude:{' '}
                        {completion.score}%
                      </p>
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

        <section className="control-card" aria-labelledby="form-title">
          <h2 id="form-title">
            {editingSubscriptionId ? 'Modifier un abonnement' : 'Créer un abonnement'}
          </h2>
          <form onSubmit={handleSubmitSubscription} noValidate>
            <div className="form-grid">
              <label>
                Nom
                <input
                  value={formState.name}
                  onChange={event => updateFormField('name', event.target.value)}
                />
                {formErrors.name ? <span className="field-error">{formErrors.name}</span> : null}
              </label>
              <label>
                Fournisseur
                <input
                  value={formState.provider}
                  onChange={event => updateFormField('provider', event.target.value)}
                />
              </label>
              <label>
                Plan
                <input
                  value={formState.planName}
                  onChange={event => updateFormField('planName', event.target.value)}
                />
              </label>
              <label>
                Prix (centimes)
                <input
                  value={formState.currentPriceMinor}
                  onChange={event => updateFormField('currentPriceMinor', event.target.value)}
                />
                {formErrors.currentPriceMinor ? (
                  <span className="field-error">{formErrors.currentPriceMinor}</span>
                ) : null}
              </label>
              <label>
                Devise
                <input
                  value={formState.currency}
                  onChange={event => updateFormField('currency', event.target.value)}
                />
              </label>
              <label>
                Statut
                <select
                  value={formState.status}
                  onChange={event => updateFormField('status', event.target.value as SubscriptionStatus)}
                >
                  {STATUS_OPTIONS.map(status => (
                    <option key={status} value={status}>
                      {status}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Mode de renouvellement
                <select
                  value={formState.renewalMode}
                  onChange={event => updateFormField('renewalMode', event.target.value as RenewalMode)}
                >
                  {RENEWAL_OPTIONS.map(mode => (
                    <option key={mode} value={mode}>
                      {mode}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Intervalle de facturation
                <select
                  value={formState.billingInterval}
                  onChange={event =>
                    updateFormField(
                      'billingInterval',
                      event.target.value as (typeof BILLING_OPTIONS)[number],
                    )
                  }
                >
                  {BILLING_OPTIONS.map(interval => (
                    <option key={interval} value={interval}>
                      {interval}
                    </option>
                  ))}
                </select>
              </label>
              <label>
                Catégorie
                <select
                  value={formState.categoryId}
                  onChange={event => updateFormField('categoryId', event.target.value)}
                >
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
                <input
                  type="date"
                  value={formState.nextChargeDate}
                  onChange={event => updateFormField('nextChargeDate', event.target.value)}
                />
                {formErrors.nextChargeDate ? (
                  <span className="field-error">{formErrors.nextChargeDate}</span>
                ) : null}
              </label>
              <label>
                Fin de pause
                <input
                  type="date"
                  value={formState.pauseUntil}
                  onChange={event => updateFormField('pauseUntil', event.target.value)}
                />
                {formErrors.pauseUntil ? (
                  <span className="field-error">{formErrors.pauseUntil}</span>
                ) : null}
              </label>
              <label>
                Fin de service
                <input
                  type="date"
                  value={formState.serviceEndDate}
                  onChange={event => updateFormField('serviceEndDate', event.target.value)}
                />
                {formErrors.serviceEndDate ? (
                  <span className="field-error">{formErrors.serviceEndDate}</span>
                ) : null}
              </label>
              <label>
                URL de gestion
                <input
                  value={formState.managementUrl}
                  onChange={event => updateFormField('managementUrl', event.target.value)}
                />
                {formErrors.managementUrl ? (
                  <span className="field-error">{formErrors.managementUrl}</span>
                ) : null}
              </label>
              <label>
                URL de résiliation
                <input
                  value={formState.cancellationUrl}
                  onChange={event => updateFormField('cancellationUrl', event.target.value)}
                />
                {formErrors.cancellationUrl ? (
                  <span className="field-error">{formErrors.cancellationUrl}</span>
                ) : null}
              </label>
            </div>

            <label>
              Instructions de résiliation
              <textarea
                value={formState.cancellationInstructions}
                onChange={event =>
                  updateFormField('cancellationInstructions', event.target.value)
                }
              />
            </label>
            <label>
              Notes
              <textarea
                value={formState.notes}
                onChange={event => updateFormField('notes', event.target.value)}
              />
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
            <input
              value={newCategoryName}
              onChange={event => setNewCategoryName(event.target.value)}
              placeholder="Nouvelle catégorie"
            />
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
        </section>

        <section className="empty-state" aria-labelledby="empty-state-title">
          <span className="empty-state-icon" aria-hidden="true">
            <span />
          </span>
          <div>
            <h2 id="empty-state-title">Aucun abonnement enregistré</h2>
            <p>Utilisez le formulaire ci-dessus pour créer une première fiche.</p>
          </div>
        </section>

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
