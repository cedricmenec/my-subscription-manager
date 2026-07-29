import { useState, useMemo, useEffect } from 'react'
import { type Subscription, type SubscriptionStatus, type RenewalMode } from '../data/db'
import { type SubscriptionSort, type SortDirection, type SubscriptionFilters, computeSubscriptionCompletion } from '../services/subscriptions'
import { type CompactColumn } from '../components/SubscriptionCompactList'
import AdvancedSearchBar from '../components/AdvancedSearchBar'
import SubscriptionCompactList from '../components/SubscriptionCompactList'
import SubscriptionCardList from '../components/SubscriptionCardList'
import SubscriptionDialog, { type SubscriptionFormState, EMPTY_FORM, toFormState } from '../components/SubscriptionDialog'

interface SubscriptionsPageProps {
  subscriptions: Subscription[]
  categories: Array<{ id: string; name: string }>
  summary: {
    baseCurrency: string
    excludedSubscriptions: Array<{ id: string; reason: string }>
  }
  exchangeRates: Record<string, number>
  onRefreshSubscriptions: () => void
  onRefreshFinance: () => void
  onFeedback: (message: string) => void
  onArchiveSubscription: (id: string) => void
  onSetOperationStatus: (status: string) => void
}

const STATUS_OPTIONS: SubscriptionStatus[] = [
  'TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED_PENDING_END', 'ENDED', 'UNKNOWN',
]

const RENEWAL_OPTIONS: RenewalMode[] = ['AUTOMATIC', 'MANUAL', 'UNKNOWN']

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

function getViewMode(): 'compact' | 'cards' {
  try {
    const stored = localStorage.getItem('subscription-view-mode')
    if (stored === 'compact' || stored === 'cards') return stored
  } catch { /* ignore */ }
  return 'compact'
}

function setViewMode(mode: 'compact' | 'cards') {
  try {
    localStorage.setItem('subscription-view-mode', mode)
  } catch { /* ignore */ }
}

export default function SubscriptionsPage({
  subscriptions,
  categories,
  summary,
  exchangeRates,
  onRefreshSubscriptions,
  onRefreshFinance,
  onFeedback,
  onArchiveSubscription,
  onSetOperationStatus,
}: SubscriptionsPageProps) {
  const [viewMode, setViewModeState] = useState<'compact' | 'cards'>(getViewMode)
  const [dialogOpen, setDialogOpen] = useState(false)
  const [editingId, setEditingId] = useState<string | null>(null)
  const [formState, setFormState] = useState<SubscriptionFormState>(EMPTY_FORM)

  // Local filters
  // searchDraft is the immediate input; search is the debounced effective value
  const [searchDraft, setSearchDraft] = useState('')
  const [search, setSearch] = useState('')
  useEffect(() => {
    const timer = setTimeout(() => setSearch(searchDraft), 300)
    return () => clearTimeout(timer)
  }, [searchDraft])

  const [dateMin, setDateMin] = useState('')
  const [dateMax, setDateMax] = useState('')
  const [renewalDateMin, setRenewalDateMin] = useState('')
  const [renewalDateMax, setRenewalDateMax] = useState('')
  const [amountMin, setAmountMin] = useState('')
  const [amountMax, setAmountMax] = useState('')
  const [statusFilter, setStatusFilter] = useState<SubscriptionStatus | 'ALL'>('ALL')
  const [categoryFilter, setCategoryFilter] = useState<string | 'ALL'>('ALL')
  const [renewalFilter, setRenewalFilter] = useState<RenewalMode | 'ALL'>('ALL')
  const [sortBy, setSortBy] = useState<SubscriptionSort>('nextChargeDate')
  const [sortDirection, setSortDirection] = useState<SortDirection>('asc')
  const [onlyIncomplete, setOnlyIncomplete] = useState(false)
  const [showAdvanced, setShowAdvanced] = useState(false)

  const filters: SubscriptionFilters = useMemo(() => ({
    search,
    status: statusFilter,
    categoryId: categoryFilter,
    renewalMode: renewalFilter,
    sortBy,
    sortDirection,
    onlyIncomplete,
    dateMin: dateMin || undefined,
    dateMax: dateMax || undefined,
    renewalDateMin: renewalDateMin || undefined,
    renewalDateMax: renewalDateMax || undefined,
    amountMin: amountMin ? parseFloat(amountMin) : undefined,
    amountMax: amountMax ? parseFloat(amountMax) : undefined,
  }), [search, statusFilter, categoryFilter, renewalFilter, sortBy, sortDirection, onlyIncomplete, dateMin, dateMax, renewalDateMin, renewalDateMax, amountMin, amountMax])

  // Client-side filtering (since we already have the data)
  const filteredSubscriptions = useMemo(() => {
    let result = [...subscriptions]

    // Search text — case-insensitive on name, provider, notes
    if (filters.search) {
      const q = filters.search.toLowerCase()
      result = result.filter(s =>
        (s.name ?? '').toLowerCase().includes(q) ||
        (s.provider ?? '').toLowerCase().includes(q) ||
        (s.notes ?? '').toLowerCase().includes(q),
      )
    }

    // Status filter
    if (filters.status && filters.status !== 'ALL') {
      result = result.filter(s => s.status === filters.status)
    }

    // Category filter
    if (filters.categoryId && filters.categoryId !== 'ALL') {
      result = result.filter(s => s.categoryId === filters.categoryId)
    }

    // Renewal mode filter
    if (filters.renewalMode && filters.renewalMode !== 'ALL') {
      result = result.filter(s => s.renewalMode === filters.renewalMode)
    }

    // Only incomplete filter
    if (filters.onlyIncomplete) {
      result = result.filter(s => !computeSubscriptionCompletion(s).isComplete)
    }

    // Apply filters that are not already handled by the backend
    if (filters.dateMin) {
      result = result.filter(s => !s.nextChargeDate || s.nextChargeDate >= filters.dateMin!)
    }
    if (filters.dateMax) {
      result = result.filter(s => !s.nextChargeDate || s.nextChargeDate <= filters.dateMax!)
    }
    if (filters.renewalDateMin) {
      result = result.filter(s => !s.nextRenewalDate || s.nextRenewalDate >= filters.renewalDateMin!)
    }
    if (filters.renewalDateMax) {
      result = result.filter(s => !s.nextRenewalDate || s.nextRenewalDate <= filters.renewalDateMax!)
    }
    if (filters.amountMin !== undefined) {
      result = result.filter(s => typeof s.currentPrice !== 'number' || s.currentPrice >= filters.amountMin!)
    }
    if (filters.amountMax !== undefined) {
      result = result.filter(s => typeof s.currentPrice !== 'number' || s.currentPrice <= filters.amountMax!)
    }

    // Sort
    result.sort((a, b) => {
      const dir = filters.sortDirection === 'desc' ? -1 : 1
      switch (filters.sortBy) {
        case 'name':
          return a.name.localeCompare(b.name) * dir
        case 'currentPrice': {
          const pa = typeof a.currentPrice === 'number' ? a.currentPrice : 0
          const pb = typeof b.currentPrice === 'number' ? b.currentPrice : 0
          return (pa - pb) * dir
        }
        case 'createdAt':
          return (a.createdAt.getTime() - b.createdAt.getTime()) * dir
        case 'completion':
          return (computeSubscriptionCompletion(a).score - computeSubscriptionCompletion(b).score) * dir
        case 'updatedAt':
          return (b.updatedAt.getTime() - a.updatedAt.getTime()) * dir
        case 'nextChargeDate':
        case 'nextRenewalDate':
        default: {
          const field = filters.sortBy === 'nextRenewalDate' ? 'nextRenewalDate' : 'nextChargeDate'
          const da = a[field] ?? '9999-12-31'
          const db = b[field] ?? '9999-12-31'
          return da.localeCompare(db) * dir
        }
      }
    })

    return result
  }, [subscriptions, filters])

  // Derived data for indicators
  const excludedIds = summary.excludedSubscriptions.map(ex => ex.id)
  const excludedReasons = new Map(summary.excludedSubscriptions.map(ex => [ex.id, ex.reason]))
  const convertedIds = subscriptions
    .filter(s => {
      if (excludedIds.includes(s.id)) return false
      return s.currency && s.currency !== summary.baseCurrency && exchangeRates[s.currency]
    })
    .map(s => s.id)

  function handleSwitchView(mode: 'compact' | 'cards') {
    setViewModeState(mode)
    setViewMode(mode)
  }

  function handleSort(column: CompactColumn) {
    const sortMap: Record<string, SubscriptionSort> = {
      name: 'name',
      status: 'name',
      currentPrice: 'currentPrice',
      nextChargeDate: 'nextChargeDate',
      nextRenewalDate: 'nextRenewalDate',
      categoryId: 'name',
    }
    const newSortBy = sortMap[column] ?? 'nextChargeDate'

    if (newSortBy === sortBy) {
      setSortDirection(prev => prev === 'asc' ? 'desc' : 'asc')
    } else {
      setSortBy(newSortBy as SubscriptionSort)
      setSortDirection('asc')
    }
  }

  function handleEdit(subscription: Subscription) {
    setEditingId(subscription.id)
    setFormState(toFormState(subscription))
    setDialogOpen(true)
  }

  function handleNewSubscription() {
    setEditingId(null)
    setFormState(EMPTY_FORM)
    setDialogOpen(true)
  }

  async function handleArchive(id: string) {
    await onArchiveSubscription(id)
    onSetOperationStatus('enregistre-localement')
    onFeedback('Abonnement archivé localement. Synchronisation asynchrone en cours.')
    onRefreshSubscriptions()
    onRefreshFinance()
  }

  function handleDialogSaved() {
    onSetOperationStatus('enregistre-localement')
    onRefreshSubscriptions()
    onRefreshFinance()
  }

  return (
    <div className="subscriptions-page">
      <header className="page-header">
        <div>
          <p className="section-label">Gestion des abonnements</p>
          <h1>Abonnements</h1>
        </div>
        <div className="page-header-actions">
          <p className="item-count" aria-label="Nombre d'abonnements">
            {filteredSubscriptions.length} abonnement{filteredSubscriptions.length > 1 ? 's' : ''}
          </p>
          <button type="button" className="primary-button" onClick={handleNewSubscription}>
            + Nouvel abonnement
          </button>
        </div>
      </header>

      {/* Filters */}
      <section className="control-card" aria-labelledby="filters-title">
        <h2 id="filters-title" className="sr-only">Filtres</h2>
        <div className="form-grid form-grid-compact">
          <label>
            Statut
            <select value={statusFilter} onChange={e => setStatusFilter(e.target.value as SubscriptionStatus | 'ALL')}>
              <option value="ALL">Tous</option>
              {STATUS_OPTIONS.map(s => (
                <option key={s} value={s}>{STATUS_LABELS[s]}</option>
              ))}
            </select>
          </label>
          <label>
            Renouvellement
            <select value={renewalFilter} onChange={e => setRenewalFilter(e.target.value as RenewalMode | 'ALL')}>
              <option value="ALL">Tous</option>
              {RENEWAL_OPTIONS.map(m => (
                <option key={m} value={m}>{RENEWAL_LABELS[m]}</option>
              ))}
            </select>
          </label>
          <label>
            Tri
            <select value={sortBy} onChange={e => setSortBy(e.target.value as SubscriptionSort)}>
              <option value="nextChargeDate">Prochaine échéance</option>
              <option value="nextRenewalDate">Prochain renouvellement</option>
              <option value="name">Nom</option>
              <option value="currentPrice">Montant</option>
              <option value="createdAt">Date de création</option>
              <option value="updatedAt">Dernière mise à jour</option>
              <option value="completion">Complétude</option>
            </select>
          </label>
          <label className="checkbox-label">
            <input type="checkbox" checked={onlyIncomplete} onChange={e => setOnlyIncomplete(e.target.checked)} />
            Uniquement incomplets
          </label>
        </div>
      </section>

      {/* Advanced search */}
      <AdvancedSearchBar
        search={searchDraft}
        onSearchChange={setSearchDraft}
        dateMin={dateMin}
        onDateMinChange={setDateMin}
        dateMax={dateMax}
        onDateMaxChange={setDateMax}
        renewalDateMin={renewalDateMin}
        onRenewalDateMinChange={setRenewalDateMin}
        renewalDateMax={renewalDateMax}
        onRenewalDateMaxChange={setRenewalDateMax}
        amountMin={amountMin}
        onAmountMinChange={setAmountMin}
        amountMax={amountMax}
        onAmountMaxChange={setAmountMax}
        categoryFilter={categoryFilter}
        onCategoryFilterChange={setCategoryFilter}
        categories={categories}
        showAdvanced={showAdvanced}
        onToggleAdvanced={() => setShowAdvanced(prev => !prev)}
      />

      {/* View toggle */}
      <div className="view-toggle-bar">
        <div className="view-toggle" role="tablist" aria-label="Mode d'affichage">
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'compact'}
            className={`view-toggle-btn ${viewMode === 'compact' ? 'view-toggle-active' : ''}`}
            onClick={() => handleSwitchView('compact')}
          >
            📋 Compact
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={viewMode === 'cards'}
            className={`view-toggle-btn ${viewMode === 'cards' ? 'view-toggle-active' : ''}`}
            onClick={() => handleSwitchView('cards')}
          >
            🃏 Cartes
          </button>
        </div>
      </div>

      {/* List */}
      <section className="list-section" aria-labelledby="list-title">
        <h2 id="list-title" className="sr-only">Liste des abonnements</h2>
        {filteredSubscriptions.length === 0 ? (
          <div className="empty-state">
            <span className="empty-state-icon" aria-hidden="true"><span /></span>
            <div>
              <h2>Aucun abonnement trouvé</h2>
              <p>Créez un abonnement ou ajustez vos filtres.</p>
            </div>
          </div>
        ) : viewMode === 'compact' ? (
          <SubscriptionCompactList
            subscriptions={filteredSubscriptions}
            sortBy={sortBy as CompactColumn}
            sortDirection={sortDirection}
            onSort={handleSort}
            onEdit={handleEdit}
            onArchive={handleArchive}
            categories={categories}
            excludedIds={excludedIds}
            excludedReasons={excludedReasons}
            convertedIds={convertedIds}
          />
        ) : (
          <SubscriptionCardList
            subscriptions={filteredSubscriptions}
            onEdit={handleEdit}
            onArchive={handleArchive}
            categories={categories}
            excludedIds={excludedIds}
            excludedReasons={excludedReasons}
            convertedIds={convertedIds}
          />
        )}
      </section>

      {/* Subscription Dialog */}
      <SubscriptionDialog
        key={editingId ?? 'new'}
        isOpen={dialogOpen}
        onClose={() => {
          setDialogOpen(false)
          setEditingId(null)
        }}
        onSaved={handleDialogSaved}
        onFeedback={onFeedback}
        editingId={editingId}
        formState={formState}
        categories={categories}
      />
    </div>
  )
}