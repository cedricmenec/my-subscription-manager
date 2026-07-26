import { useEffect, useMemo, useState } from 'react'
import type { SyncState } from 'dexie-cloud-addon'
import { db, DEFAULT_DB_NAME } from './data/db'
import { saveLocalDraft } from './data/localDrafts'
import {
  getConnectedIdentity,
  loginWithEmailOtp,
  logout,
  purgeLocalData,
  type ConnectedIdentity,
} from './services/auth'
import { getSyncStatusLabel, mapSyncStateToAppStatus } from './services/syncState'

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
            0 abonnement
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

        <section className="empty-state" aria-labelledby="empty-state-title">
          <span className="empty-state-icon" aria-hidden="true">
            <span />
          </span>
          <div>
            <h2 id="empty-state-title">Aucun abonnement enregistré</h2>
            <p>Vos abonnements apparaîtront ici.</p>
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
