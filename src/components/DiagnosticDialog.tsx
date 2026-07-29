import { useEffect, useRef } from 'react'
import { useLiveQuery } from 'dexie-react-hooks'
import { db } from '../data/db'

export interface DiagnosticInfo {
  appVersion: string
  dbName: string
  identityLabel: string
  networkOnline: boolean
  syncStatusLabel: string
  lastSyncDate: string
  environment: string
}

interface DiagnosticDialogProps {
  isOpen: boolean
  onClose: () => void
  info: DiagnosticInfo
  debugGraph: string[]
}

export default function DiagnosticDialog({ isOpen, onClose, info, debugGraph }: DiagnosticDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const diagnosticLogs = useLiveQuery(() => db.diagnosticLogs.orderBy('timestamp').reverse().limit(20).toArray(), [])

  const graphLines = debugGraph.length > 0 ? debugGraph : ['(aucune dépendance)']
  const logLines = diagnosticLogs?.map(entry => `${entry.timestamp.toLocaleString()} [${entry.category}] ${entry.message}`) ?? []

  useEffect(() => {
    const dialog = dialogRef.current
    if (!dialog) return

    if (isOpen && !dialog.open) {
      dialog.showModal()
    } else if (!isOpen && dialog.open) {
      dialog.close()
    }
  }, [isOpen])

  useEffect(() => {
    if (isOpen) {
      closeButtonRef.current?.focus()
    }
  }, [isOpen])

  function handleBackdropClick(event: React.MouseEvent) {
    if (event.target === dialogRef.current) {
      onClose()
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      onClose()
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="diagnostic-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="diagnostic-dialog-title"
      onClose={onClose}
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
    >
      <div className="diagnostic-dialog-header">
        <h2 id="diagnostic-dialog-title">Diagnostic</h2>
        <button
          ref={closeButtonRef}
          type="button"
          className="diagnostic-dialog-close"
          onClick={onClose}
          aria-label="Fermer le diagnostic"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>
      <dl className="diagnostic-dialog-grid">
        <div>
          <dt>Version applicative</dt>
          <dd>{info.appVersion}</dd>
        </div>
        <div>
          <dt>Base locale</dt>
          <dd>{info.dbName}</dd>
        </div>
        <div>
          <dt>Identité connectée</dt>
          <dd>{info.identityLabel}</dd>
        </div>
        <div>
          <dt>Statut réseau</dt>
          <dd>{info.networkOnline ? 'En ligne' : 'Hors ligne'}</dd>
        </div>
        <div>
          <dt>Statut Dexie Cloud</dt>
          <dd>{info.syncStatusLabel}</dd>
        </div>
        <div>
          <dt>Dernière synchronisation</dt>
          <dd>{info.lastSyncDate}</dd>
        </div>
        <div>
          <dt>Environnement</dt>
          <dd>{info.environment}</dd>
        </div>
      </dl>
      <div className="diagnostic-dialog-footer">
        <section className="diagnostic-dialog-section">
          <h3>Graphe de dépendances</h3>
          <pre>{graphLines.join('\n')}</pre>
        </section>
        <section className="diagnostic-dialog-section">
          <h3>Historique d'exécution</h3>
          <pre>{logLines.length > 0 ? logLines.join('\n') : '(aucune entrée)'}</pre>
        </section>
        <button type="button" onClick={onClose}>
          Fermer
        </button>
      </div>
    </dialog>
  )
}