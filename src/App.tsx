import { useCallback, useEffect, useMemo, useState } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import type { SyncState } from 'dexie-cloud-addon'
import {
  db,
  DEFAULT_DB_NAME,
  type Payment,
  type PaymentStatus,
  type Subscription,
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
  updatePaymentStatus,
} from './services/payments'
import { createCalculationEngine } from './services/calculationEngine'
import {
  archiveSubscription,
  listCategories,
  listSubscriptions,
  type SubscriptionFilters,
} from './services/subscriptions'
import TopBar from './components/TopBar'
import type { AppPage } from './components/TopBar'
import DiagnosticDialog from './components/DiagnosticDialog'
import type { DiagnosticInfo } from './components/DiagnosticDialog'
import DashboardPage from './pages/DashboardPage'
import SubscriptionsPage from './pages/SubscriptionsPage'
import PaymentsPage from './pages/PaymentsPage'
import SettingsPage from './pages/SettingsPage'
import DataPage from './pages/DataPage'

type OperationStatus =
  | 'aucune-operation'
  | 'enregistre-localement'
  | 'en-attente-sync'
  | 'synchronise'
  | 'erreur-sync'

interface FinancialSummaryState {
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

const EMPTY_SUMMARY: FinancialSummaryState = {
  baseCurrency: 'EUR',
  monthlyEquivalent: 0,
  annualEquivalent: 0,
  projected30: 0,
  projected90: 0,
  expensesYearToDate: 0,
  includedSubscriptionCount: 0,
  excludedCurrencySubscriptionCount: 0,
  excludedSubscriptions: [],
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

function App() {
  const [currentPage, setCurrentPage] = useState<AppPage>(() => {
    const hash = window.location.hash.slice(1) || '/'
    if (hash.startsWith('/subscriptions')) return 'subscriptions'
    if (hash.startsWith('/payments')) return 'payments'
    if (hash.startsWith('/settings')) return 'settings'
    if (hash.startsWith('/data')) return 'data'
    return 'dashboard'
  })
  const [showDiagnostic, setShowDiagnostic] = useState(false)
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
  const [newCategoryName, setNewCategoryName] = useState('')
  const [exchangeRates, setExchangeRates] = useState<Record<string, number>>({})

  const calculationEngine = useMemo(() => createCalculationEngine({ debounceMs: 250 }), [])
  const livePayments = useLiveQuery(() => db.payments.orderBy('scheduledDate').toArray(), [])

  const appSyncStatus = useMemo(() => mapSyncStateToAppStatus(syncState), [syncState])

  // Synchronisation hash ↔ état de navigation
  const navigate = useCallback((page: AppPage) => {
    setCurrentPage(page)
    const hashMap: Record<AppPage, string> = {
      dashboard: '/',
      subscriptions: '/subscriptions',
      payments: '/payments',
      settings: '/settings',
      data: '/data',
    }
    window.location.hash = hashMap[page]
  }, [])

  useEffect(() => {
    function handleHashChange() {
      const hash = window.location.hash.slice(1) || '/'
      if (hash.startsWith('/subscriptions')) {
        setCurrentPage('subscriptions')
      } else if (hash.startsWith('/payments')) {
        setCurrentPage('payments')
      } else if (hash.startsWith('/settings')) {
        setCurrentPage('settings')
      } else if (hash.startsWith('/data')) {
        setCurrentPage('data')
      } else {
        setCurrentPage('dashboard')
      }
    }

    window.addEventListener('hashchange', handleHashChange)
    return () => window.removeEventListener('hashchange', handleHashChange)
  }, [])

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
      search: '',
      status: 'ALL',
      categoryId: 'ALL',
      renewalMode: 'ALL',
      sortBy: 'nextChargeDate',
      sortDirection: 'asc',
    }),
    [],
  )

  useEffect(() => {
    calculationEngine.start()
    return () => calculationEngine.stop()
  }, [calculationEngine])

  useEffect(() => {
    if (livePayments) {
      setPayments(livePayments)
    }
  }, [livePayments])

  useEffect(() => {
    async function loadContextData() {
      try {
        const [loadedSubscriptions, loadedCategories, settings, loadedPayments, loadedSummary] = await Promise.all([
          listSubscriptions(filters),
          listCategories(),
          db.settings.where('key').equals('main').first(),
          listPayments(),
          getFinancialSummary(),
        ])

        setSubscriptions(loadedSubscriptions)
        setCategories(loadedCategories.map(category => ({ id: category.id, name: category.name })))

        if (settings?.exchangeRates) {
          setExchangeRates(settings.exchangeRates)
        }

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
  }, [calculationEngine, filters])

  const effectiveOperationStatus = useMemo(
    () => resolveOperationStatus(operationStatus, appSyncStatus),
    [operationStatus, appSyncStatus],
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
      await calculationEngine.run(undefined, 'manual')
    } catch (error) {
      console.error('calculationEngine run failed during refresh', error)
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

  async function handleAddExchangeRate(currency: string, rate: number) {
    const updatedRates = { ...exchangeRates, [currency]: rate }
    setExchangeRates(updatedRates)
    setFeedback(`Taux de conversion ${currency}→EUR: ${rate} enregistré.`)

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

  async function handleArchiveSubscription(id: string) {
    await archiveSubscription(id)
    setOperationStatus('enregistre-localement')
    setFeedback('Abonnement archivé localement. Synchronisation asynchrone en cours.')
    await Promise.all([refreshSubscriptions(), refreshFinance()])
  }

  async function handleCreateCategory() {
    try {
      const { createCategory } = await import('./services/subscriptions')
      await createCategory(newCategoryName)
      setNewCategoryName('')
      await refreshCategories()
    } catch (error) {
      setFeedback(
        `Impossible de créer la catégorie: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      )
    }
  }

  async function handleDeleteCategory(id: string) {
    try {
      const { deleteCategory } = await import('./services/subscriptions')
      await deleteCategory(id)
      await refreshCategories()
    } catch (error) {
      setFeedback(
        `Impossible de supprimer la catégorie: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
      )
    }
  }

  async function handlePaymentAction(payment: Payment, status: PaymentStatus) {
    await updatePaymentStatus(payment.id, {
      status,
      paidDate: status === 'CONFIRMED_PAID' ? payment.scheduledDate : payment.paidDate,
    })
    setOperationStatus('enregistre-localement')
    setFeedback(`Paiement mis à jour localement.`)
    await refreshFinance()
  }

  const identityLabel = useMemo(
    () => identity.isLoggedIn
      ? identity.email ?? identity.userId ?? identity.name ?? 'Connecté'
      : 'Non connecté',
    [identity],
  )

  const lastSyncDate = persistedSyncState?.timestamp
    ? persistedSyncState.timestamp.toISOString()
    : 'N/A'

  const diagnosticInfo: DiagnosticInfo = {
    appVersion: import.meta.env.VITE_APP_VERSION ?? '0.0.0-dev',
    dbName: DEFAULT_DB_NAME,
    identityLabel,
    networkOnline,
    syncStatusLabel: getSyncStatusLabel(appSyncStatus),
    lastSyncDate,
    environment: import.meta.env.VITE_APP_ENVIRONMENT ?? 'development',
  }

  return (
    <div className="app-shell">
      <TopBar
        currentPage={currentPage}
        onNavigate={navigate}
        onOpenDiagnostic={() => setShowDiagnostic(true)}
        identity={identity}
      />

      <DiagnosticDialog
        isOpen={showDiagnostic}
        onClose={() => setShowDiagnostic(false)}
        info={diagnosticInfo}
        debugGraph={calculationEngine.getDebugGraph()}
      />

      {feedback ? <p className="feedback">{feedback}</p> : null}

      <main className="main-content">
        {currentPage === 'dashboard' && (
          <DashboardPage
            summary={summary}
            subscriptions={subscriptions}
            payments={payments}
            syncState={syncState}
            operationStatus={effectiveOperationStatus}
            onSyncNow={handleSyncNow}
          />
        )}
        {currentPage === 'subscriptions' && (
          <SubscriptionsPage
            subscriptions={subscriptions}
            categories={categories}
            summary={summary}
            exchangeRates={exchangeRates}
            onRefreshSubscriptions={refreshSubscriptions}
            onRefreshFinance={refreshFinance}
            onFeedback={setFeedback}
            onArchiveSubscription={handleArchiveSubscription}
            onSetOperationStatus={setOperationStatus as (status: string) => void}
          />
        )}
        {currentPage === 'payments' && (
          <PaymentsPage
            payments={payments}
            onPaymentAction={handlePaymentAction}
          />
        )}
        {currentPage === 'settings' && (
          <SettingsPage
            categories={categories}
            exchangeRates={exchangeRates}
            newCategoryName={newCategoryName}
            email={email}
            identityLabel={identityLabel}
            syncState={syncState}
            onCreateCategory={handleCreateCategory}
            onDeleteCategory={handleDeleteCategory}
            onNewCategoryNameChange={setNewCategoryName}
            onAddExchangeRate={handleAddExchangeRate}
            onRemoveExchangeRate={handleRemoveExchangeRate}
            onLogin={handleLogin}
            onLogout={handleLogout}
            onEmailChange={setEmail}
            onSaveLocalDraft={handleSaveLocalDraft}
            onPurgeLocalData={handlePurgeLocalData}
          />
        )}
        {currentPage === 'data' && (
          <DataPage
            onFeedback={setFeedback}
            onRefresh={() => {
              void refreshSubscriptions()
              void refreshFinance()
            }}
          />
        )}
      </main>
    </div>
  )
}

export default App