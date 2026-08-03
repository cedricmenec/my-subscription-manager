import { useState } from 'react'
import type { SyncState } from 'dexie-cloud-addon'
import { getSyncStatusLabel, mapSyncStateToAppStatus } from '../services/syncState'
import { validateExchangeRate } from '../services/finance'
import ConfirmDialog from '../components/ConfirmDialog'
import DexieCloudConfigurationForm from '../components/DexieCloudConfigurationForm'
import {
  getConfiguredDexieCloudUrl,
  saveDexieCloudUrl,
} from '../config/dexieCloudConfiguration'

interface SettingsPageProps {
  categories: Array<{ id: string; name: string }>
  exchangeRates: Record<string, number>
  newCategoryName: string
  email: string
  identityLabel: string
  syncState: SyncState
  onCreateCategory: () => void
  onDeleteCategory: (id: string) => void
  onNewCategoryNameChange: (value: string) => void
  onAddExchangeRate: (currency: string, rate: number) => void
  onRemoveExchangeRate: (currency: string) => void
  onLogin: () => void
  onLogout: () => void
  onEmailChange: (value: string) => void
  onSaveLocalDraft: () => void
  onPurgeLocalData: () => void
}

export default function SettingsPage({
  categories,
  exchangeRates,
  newCategoryName,
  email,
  identityLabel,
  syncState,
  onCreateCategory,
  onDeleteCategory,
  onNewCategoryNameChange,
  onAddExchangeRate,
  onRemoveExchangeRate,
  onLogin,
  onLogout,
  onEmailChange,
  onSaveLocalDraft,
  onPurgeLocalData,
}: SettingsPageProps) {
  const [localCurrency, setLocalCurrency] = useState('')
  const [localRate, setLocalRate] = useState('')
  const [localErrors, setLocalErrors] = useState<Record<string, string>>({})
  const [pendingDeleteCategoryId, setPendingDeleteCategoryId] = useState<string | null>(null)
  const [pendingRemoveCurrency, setPendingRemoveCurrency] = useState<string | null>(null)
  const [pendingCloudUrl, setPendingCloudUrl] = useState<string | null>(null)
  const [cloudUrlFeedback, setCloudUrlFeedback] = useState<string | null>(null)
  const activeCloudUrl = getConfiguredDexieCloudUrl() ?? ''
  const appSyncStatus = mapSyncStateToAppStatus(syncState)

  function handleAddRate() {
    setLocalErrors({})
    const trimmedCurrency = localCurrency.trim().toUpperCase()
    const parsedRate = localRate.trim() ? Number(localRate.trim()) : NaN

    const validation = validateExchangeRate(trimmedCurrency, parsedRate)
    if (!validation.isValid) {
      setLocalErrors(validation.errors)
      return
    }

    onAddExchangeRate(trimmedCurrency, parsedRate)
    setLocalCurrency('')
    setLocalRate('')
  }

  function handleRemoveRate(currency: string) {
    setPendingRemoveCurrency(currency)
  }

  function handleConfirmDeleteCategory() {
    if (!pendingDeleteCategoryId) return
    const id = pendingDeleteCategoryId
    setPendingDeleteCategoryId(null)
    onDeleteCategory(id)
  }

  function handleConfirmRemoveRate() {
    if (!pendingRemoveCurrency) return
    const currency = pendingRemoveCurrency
    setPendingRemoveCurrency(null)
    onRemoveExchangeRate(currency)
  }

  function handleCloudUrlChange(normalizedUrl: string) {
    setCloudUrlFeedback(null)
    if (normalizedUrl === activeCloudUrl) {
      setCloudUrlFeedback('Cette URL est déjà utilisée par l’application.')
      return
    }
    setPendingCloudUrl(normalizedUrl)
  }

  function handleConfirmCloudUrlChange() {
    if (!pendingCloudUrl) return
    saveDexieCloudUrl(pendingCloudUrl)
    window.location.reload()
  }

  return (
    <div className="settings-page">
      <header className="page-header">
        <div>
          <p className="section-label">Configuration</p>
          <h1>Paramètres</h1>
        </div>
      </header>

      {/* Catégories */}
      <section className="control-card" aria-labelledby="categories-title">
        <h2 id="categories-title">Catégories</h2>
        <p>Gérez les catégories utilisées pour classer vos abonnements.</p>
        {categories.length > 0 ? (
          <ul className="settings-list">
            {categories.map(category => (
              <li key={category.id} className="settings-list-item">
                <span>{category.name}</span>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => setPendingDeleteCategoryId(category.id)}
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>Aucune catégorie créée.</p>
        )}
        <div className="category-row">
          <input
            value={newCategoryName}
            onChange={event => onNewCategoryNameChange(event.target.value)}
            placeholder="Nouvelle catégorie"
          />
          <button type="button" onClick={onCreateCategory}>
            Ajouter la catégorie
          </button>
        </div>
      </section>

      {/* Taux de conversion */}
      <section className="control-card" aria-labelledby="exchange-rates-title">
        <h2 id="exchange-rates-title">Taux de conversion</h2>
        <p>Configurez les taux de conversion pour inclure les abonnements en devise étrangère dans les totaux consolidés (1 unité devise = X EUR).</p>
        {Object.keys(exchangeRates).length > 0 ? (
          <ul className="settings-list">
            {Object.entries(exchangeRates).map(([currency, rate]) => (
              <li key={currency} className="settings-list-item">
                <div>
                  <span className="payment-status payment-status-confirmed_paid">{currency} → EUR</span>
                  <span className="settings-rate-value">Taux: {rate}</span>
                </div>
                <button
                  type="button"
                  className="danger-button"
                  onClick={() => handleRemoveRate(currency)}
                >
                  Supprimer
                </button>
              </li>
            ))}
          </ul>
        ) : (
          <p>Aucun taux de conversion configuré. Les abonnements en devise étrangère sont exclus des totaux.</p>
        )}
        <div className="category-row">
          <input
            value={localCurrency}
            onChange={event => setLocalCurrency(event.target.value)}
            placeholder="Devise (ex: USD)"
            maxLength={3}
            style={{ textTransform: 'uppercase' }}
          />
          <input
            value={localRate}
            onChange={event => setLocalRate(event.target.value)}
            placeholder="Taux (ex: 0.92)"
            type="number"
            step="any"
            min="0"
          />
          <button type="button" onClick={handleAddRate}>
            Ajouter
          </button>
        </div>
        {localErrors.currency ? <span className="field-error">{localErrors.currency}</span> : null}
        {localErrors.rate ? <span className="field-error">{localErrors.rate}</span> : null}
      </section>

      {/* Connexion Dexie Cloud */}
      <section className="control-card" aria-labelledby="connection-title">
        <h2 id="connection-title">Connexion Dexie Cloud</h2>
        <p>
          Base active : <code className="cloud-url-value">{activeCloudUrl}</code>
        </p>
        <label htmlFor="settings-email-input">Adresse e-mail</label>
        <input
          id="settings-email-input"
          name="email"
          type="email"
          placeholder="prenom.nom@example.com"
          value={email}
          onChange={event => onEmailChange(event.target.value)}
        />
        <div className="button-row">
          <button type="button" onClick={onLogin}>
            Se connecter (OTP)
          </button>
          <button type="button" className="secondary-button" onClick={onLogout}>
            Se déconnecter
          </button>
        </div>
        <p className="settings-hint">
          {identityLabel === 'Non connecté'
            ? 'Non connecté. Les données restent locales.'
            : `Connecté en tant que ${identityLabel}. Synchronisation : ${getSyncStatusLabel(appSyncStatus)}`}
        </p>
        <div className="cloud-url-change">
          <h3>Changer de base Dexie Cloud</h3>
          <p>
            Une autre URL sélectionnera une base locale distincte. La base actuelle ne sera ni
            supprimée ni modifiée.
          </p>
          <DexieCloudConfigurationForm
            initialUrl={activeCloudUrl}
            submitLabel="Changer de base"
            onSubmit={handleCloudUrlChange}
          />
          {cloudUrlFeedback ? (
            <p className="settings-hint" role="status">{cloudUrlFeedback}</p>
          ) : null}
        </div>
      </section>

      {/* Local-first */}
      <section className="control-card" aria-labelledby="local-first-title">
        <h2 id="local-first-title">Local-first</h2>
        <p>
          Les écritures sont validées localement sur cet appareil avant la synchronisation réseau.
        </p>
        <div className="button-row">
          <button type="button" onClick={onSaveLocalDraft}>
            Enregistrer un brouillon local
          </button>
          <button type="button" className="danger-button" onClick={onPurgeLocalData}>
            Purger les données locales
          </button>
        </div>
      </section>

      {/* Confirm Delete Category Dialog */}
      <ConfirmDialog
        isOpen={pendingDeleteCategoryId !== null}
        onClose={() => setPendingDeleteCategoryId(null)}
        onConfirm={handleConfirmDeleteCategory}
        title="Supprimer la catégorie"
        message={
          pendingDeleteCategoryId
            ? `La catégorie « ${categories.find(c => c.id === pendingDeleteCategoryId)?.name ?? ''} » sera définitivement supprimée. Les abonnements liés ne seront pas supprimés.`
            : ''
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
      />

      {/* Confirm Remove Rate Dialog */}
      <ConfirmDialog
        isOpen={pendingRemoveCurrency !== null}
        onClose={() => setPendingRemoveCurrency(null)}
        onConfirm={handleConfirmRemoveRate}
        title="Supprimer le taux de conversion"
        message={
          pendingRemoveCurrency
            ? `Le taux de conversion ${pendingRemoveCurrency} → EUR sera définitivement supprimé. Les abonnements dans cette devise seront exclus des totaux consolidés.`
            : ''
        }
        confirmLabel="Supprimer"
        cancelLabel="Annuler"
        variant="danger"
      />

      <ConfirmDialog
        isOpen={pendingCloudUrl !== null}
        onClose={() => setPendingCloudUrl(null)}
        onConfirm={handleConfirmCloudUrlChange}
        title="Changer de base Dexie Cloud"
        message={
          pendingCloudUrl
            ? `Abos va utiliser ${pendingCloudUrl} après rechargement. La base locale associée à ${activeCloudUrl} restera intacte et pourra être retrouvée en reconfigurant cette URL.`
            : ''
        }
        confirmLabel="Changer et recharger"
        cancelLabel="Conserver la base actuelle"
        variant="warning"
      />
    </div>
  )
}
