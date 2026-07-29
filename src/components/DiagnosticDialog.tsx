import { useEffect, useRef, useState } from 'react'
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
  onRecalculate: () => Promise<void>
}

export default function DiagnosticDialog({ isOpen, onClose, info, debugGraph, onRecalculate }: DiagnosticDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const [isRecalculating, setIsRecalculating] = useState(false)
  const diagnosticLogs = useLiveQuery(() => db.diagnosticLogs.orderBy('timestamp').reverse().limit(20).toArray(), [])
  const calcLogs = useLiveQuery(
    () => db.diagnosticLogs.where('category').equals('calc-engine').reverse().limit(20).toArray(),
    [],
  )

  const graphLines = debugGraph.length > 0 ? debugGraph : ['(aucune dépendance)']
  const logLines = diagnosticLogs?.map(entry => `${entry.timestamp.toLocaleString()} [${entry.category}] ${entry.message}`) ?? []

  async function handleRecalculate() {
    setIsRecalculating(true)
    try {
      await onRecalculate()
    } finally {
      setIsRecalculating(false)
    }
  }

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
          <h3>Historique des calculs</h3>
          {calcLogs && calcLogs.length > 0 ? (
            <ul className="diagnostic-log-list">
              {calcLogs.map((entry, index) => {
                let summary: string
                try {
                  const parsed = JSON.parse(entry.message)
                  const duration = parsed.finishedAt && parsed.startedAt
                    ? `${new Date(parsed.finishedAt).getTime() - new Date(parsed.startedAt).getTime()}ms`
                    : '?'
                  const calculatorStatus = parsed.entries?.length
                    ? ` (${parsed.entries.map((e: { calculatorId: string; status: string }) => `${e.calculatorId}:${e.status}`).join(', ')})`
                    : ''
                  summary = `${parsed.status ?? 'unknown'} — ${parsed.trigger ?? '?'} — ${duration}${calculatorStatus}`
                } catch {
                  summary = entry.message
                }
                return (
                  <li key={entry.id ?? index} className="diagnostic-log-item">
                    <span className="diagnostic-log-date">{new Date(entry.timestamp).toLocaleString()}</span>
                    <span className="diagnostic-log-detail">{summary}</span>
                  </li>
                )
              })}
            </ul>
          ) : (
            <pre>(aucune exécution enregistrée)</pre>
          )}
        </section>
        <section className="diagnostic-dialog-section">
          <h3>Actions</h3>
          <button
            type="button"
            className="secondary-button"
            onClick={handleRecalculate}
            disabled={isRecalculating}
          >
            {isRecalculating ? 'Recalcul en cours…' : 'Recalculer'}
          </button>
        </section>
        <section className="diagnostic-dialog-section">
          <h3>Historique d'exécution (tous)</h3>
          <pre>{logLines.length > 0 ? logLines.join('\n') : '(aucune entrée)'}</pre>
        </section>
        <button type="button" onClick={onClose}>
          Fermer
        </button>
      </div>
    </dialog>
  )
}