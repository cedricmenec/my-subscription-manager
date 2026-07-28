import type { ConnectedIdentity } from '../services/auth'

export type AppPage = 'dashboard' | 'subscriptions' | 'payments' | 'settings' | 'data'

interface TopBarProps {
  currentPage: AppPage
  onNavigate: (page: AppPage) => void
  onOpenDiagnostic: () => void
  identity: ConnectedIdentity
}

export default function TopBar({ currentPage, onNavigate, onOpenDiagnostic, identity }: TopBarProps) {
  const identityLabel = identity.isLoggedIn
    ? identity.email ?? identity.userId ?? identity.name ?? 'Connecté'
    : 'Non connecté'

  return (
    <header className="topbar">
      <a className="brand" href="/" aria-label="Abos, accueil">
        <span className="brand-mark" aria-hidden="true">
          A
        </span>
        <span>Abos</span>
      </a>
      <nav className="topbar-nav" aria-label="Navigation principale">
        <button
          type="button"
          className={`topbar-nav-link${currentPage === 'dashboard' ? ' topbar-nav-link-active' : ''}`}
          onClick={() => onNavigate('dashboard')}
        >
          📊 Tableau de bord
        </button>
        <button
          type="button"
          className={`topbar-nav-link${currentPage === 'subscriptions' ? ' topbar-nav-link-active' : ''}`}
          onClick={() => onNavigate('subscriptions')}
        >
          📋 Abonnements
        </button>
        <button
          type="button"
          className={`topbar-nav-link${currentPage === 'payments' ? ' topbar-nav-link-active' : ''}`}
          onClick={() => onNavigate('payments')}
        >
          💳 Paiements
        </button>
        <button
          type="button"
          className={`topbar-nav-link${currentPage === 'settings' ? ' topbar-nav-link-active' : ''}`}
          onClick={() => onNavigate('settings')}
        >
          ⚙️ Configuration
        </button>
        <button
          type="button"
          className={`topbar-nav-link${currentPage === 'data' ? ' topbar-nav-link-active' : ''}`}
          onClick={() => onNavigate('data')}
        >
          📦 Données
        </button>
      </nav>
      <div className="topbar-actions">
        <span className="usage-label">{identityLabel}</span>
        <button
          type="button"
          className="topbar-icon-button"
          onClick={onOpenDiagnostic}
          aria-label="Ouvrir le diagnostic"
          title="Diagnostic"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <circle cx="12" cy="12" r="10" />
            <line x1="12" y1="16" x2="12" y2="12" />
            <line x1="12" y1="8" x2="12.01" y2="8" />
          </svg>
        </button>
      </div>
    </header>
  )
}