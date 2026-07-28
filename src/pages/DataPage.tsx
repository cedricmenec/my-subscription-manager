import { useState, useRef } from 'react'
import type { ImportReport } from '../data/db'
import { exportSnapshot, restoreSnapshot, validateSnapshot, downloadJson, downloadCsv, readFileAsJson } from '../services/snapshot'
import { previewCsvImport, confirmCsvImport, exportSubscriptionsCsv, exportPaymentsCsv } from '../services/importExport'

interface DataPageProps {
  onFeedback: (message: string) => void
  onRefresh: () => void
}

type ReportType = 'snapshot-export' | 'snapshot-restore' | 'csv-import' | 'csv-export' | null

export default function DataPage({ onFeedback, onRefresh }: DataPageProps) {
  const [report, setReport] = useState<ImportReport | null>(null)
  const [reportType, setReportType] = useState<ReportType>(null)
  const [csvPreview, setCsvPreview] = useState<Awaited<ReturnType<typeof previewCsvImport>> | null>(null)
  const [isImporting, setIsImporting] = useState(false)
  const [isRestoring, setIsRestoring] = useState(false)
  const csvFileRef = useRef<HTMLInputElement>(null)
  const snapshotFileRef = useRef<HTMLInputElement>(null)

  async function handleExportSnapshot() {
    try {
      const snapshot = await exportSnapshot()
      const date = new Date().toISOString().slice(0, 10)
      downloadJson(snapshot, `abos-snapshot-${date}.json`)
      setReport({
        totalRows: 0,
        created: 0,
        updated: 0,
        warnings: [],
        errors: [],
      })
      setReportType('snapshot-export')
      onFeedback('Snapshot exporté avec succès.')
    } catch (error) {
      onFeedback(`Erreur d'export: ${error instanceof Error ? error.message : 'erreur inconnue'}`)
    }
  }

  async function handleRestoreSnapshot(file: File) {
    if (isRestoring) return

    try {
      setIsRestoring(true)
      const raw = await readFileAsJson<unknown>(file)
      const snapshot = validateSnapshot(raw)

      const count = {
        subscriptions: snapshot.data.subscriptions.length,
        categories: snapshot.data.categories.length,
        payments: snapshot.data.payments.length,
        settings: snapshot.data.settings.length,
      }

      const confirmMessage =
        `Restaurer le snapshot ?\n\n` +
        `Cette action remplace TOUTES les données existantes :\n` +
        `- ${count.subscriptions} abonnement(s)\n` +
        `- ${count.categories} catégorie(s)\n` +
        `- ${count.payments} paiement(s)\n` +
        `- ${count.settings} configuration(s)\n\n` +
        `Les données existantes seront conservées (soft delete). Confirmer ?`

      if (!window.confirm(confirmMessage)) {
        setIsRestoring(false)
        return
      }

      const result = await restoreSnapshot(snapshot)
      setReport({
        totalRows: result.subscriptions + result.categories + result.payments + result.settings,
        created: result.subscriptions + result.categories + result.payments + result.settings,
        updated: 0,
        warnings: [],
        errors: [],
      })
      setReportType('snapshot-restore')
      onFeedback('Snapshot restauré avec succès.')
      onRefresh()
    } catch (error) {
      const message = error instanceof Error ? error.message : 'erreur inconnue'
      onFeedback(`Restauration impossible: ${message}`)
    } finally {
      setIsRestoring(false)
      if (snapshotFileRef.current) {
        snapshotFileRef.current.value = ''
      }
    }
  }

  async function handleSelectCsvFile(file: File) {
    try {
      const preview = await previewCsvImport(file)
      setCsvPreview(preview)
    } catch (error) {
      onFeedback(`Impossible de lire le fichier: ${error instanceof Error ? error.message : 'erreur inconnue'}`)
    }
  }

  async function handleConfirmCsvImport() {
    if (!csvPreview || isImporting) return

    try {
      setIsImporting(true)
      const result = await confirmCsvImport(csvPreview)
      setReport(result)
      setReportType('csv-import')
      setCsvPreview(null)
      onFeedback(`Import terminé: ${result.created} abonnement(s) créé(s).`)
      onRefresh()
    } catch (error) {
      onFeedback(`Erreur d'import: ${error instanceof Error ? error.message : 'erreur inconnue'}`)
    } finally {
      setIsImporting(false)
      if (csvFileRef.current) {
        csvFileRef.current.value = ''
      }
    }
  }

  function handleCancelCsvImport() {
    setCsvPreview(null)
    if (csvFileRef.current) {
      csvFileRef.current.value = ''
    }
  }

  async function handleExportSubscriptionsCsv() {
    try {
      const csv = await exportSubscriptionsCsv()
      const date = new Date().toISOString().slice(0, 10)
      downloadCsv(csv, `abos-abonnements-${date}.csv`)
      setReportType('csv-export')
      onFeedback('Abonnements exportés au format CSV.')
    } catch (error) {
      onFeedback(`Erreur d'export: ${error instanceof Error ? error.message : 'erreur inconnue'}`)
    }
  }

  async function handleExportPaymentsCsv() {
    try {
      const csv = await exportPaymentsCsv()
      const date = new Date().toISOString().slice(0, 10)
      downloadCsv(csv, `abos-paiements-${date}.csv`)
      setReportType('csv-export')
      onFeedback('Paiements exportés au format CSV.')
    } catch (error) {
      onFeedback(`Erreur d'export: ${error instanceof Error ? error.message : 'erreur inconnue'}`)
    }
  }

  // Snapshot file selection handler
  function handleSnapshotFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      void handleRestoreSnapshot(file)
    }
  }

  // CSV file selection handler
  function handleCsvFileChange(event: React.ChangeEvent<HTMLInputElement>) {
    const file = event.target.files?.[0]
    if (file) {
      void handleSelectCsvFile(file)
    }
  }

  return (
    <div className="data-page">
      <header className="page-header">
        <div>
          <p className="section-label">Gestion des données</p>
          <h1>Import / Export</h1>
        </div>
      </header>

      {/* Snapshot section */}
      <section className="control-card" aria-labelledby="snapshot-title">
        <h2 id="snapshot-title">Snapshot (JSON)</h2>
        <p className="section-description">
          Export ou restauration complète de toutes les données (abonnements, catégories, paiements, configuration).
        </p>
        <div className="button-row">
          <button type="button" className="primary-button" onClick={handleExportSnapshot}>
            Exporter (JSON)
          </button>
          <label className="file-input-label">
            <input
              ref={snapshotFileRef}
              type="file"
              accept=".json"
              className="file-input-hidden"
              onChange={handleSnapshotFileChange}
              disabled={isRestoring}
            />
            <span className="secondary-button" role="button" tabIndex={0}>
              {isRestoring ? 'Restauration en cours...' : 'Restaurer (JSON)'}
            </span>
          </label>
        </div>
      </section>

      {/* CSV Import section */}
      <section className="control-card" aria-labelledby="csv-import-title">
        <h2 id="csv-import-title">Import CSV</h2>
        <p className="section-description">
          Importer des abonnements depuis un fichier CSV. Les nouveaux abonnements sont ajoutés sans modifier les existants.
        </p>

        {!csvPreview ? (
          <label className="file-input-label">
            <input
              ref={csvFileRef}
              type="file"
              accept=".csv"
              className="file-input-hidden"
              onChange={handleCsvFileChange}
            />
            <span className="primary-button" role="button" tabIndex={0}>
              Choisir un fichier CSV
            </span>
          </label>
        ) : (
          <div className="csv-preview">
            <h3>Aperçu de l'import</h3>
            <div className="preview-stats">
              <p>✅ {csvPreview.validRows} ligne(s) valide(s)</p>
              {csvPreview.warningRows > 0 && (
                <p>⚠️ {csvPreview.warningRows} avertissement(s)</p>
              )}
              {csvPreview.errorRows > 0 && (
                <p>❌ {csvPreview.errorRows} erreur(s)</p>
              )}
            </div>

            {csvPreview.warnings.length > 0 && (
              <details className="report-details">
                <summary>Avertissements ({csvPreview.warnings.length})</summary>
                <ul className="report-list">
                  {csvPreview.warnings.map((w, i) => (
                    <li key={i} className="warning-item">Ligne {w.row}: {w.message}</li>
                  ))}
                </ul>
              </details>
            )}

            {csvPreview.errors.length > 0 && (
              <details className="report-details">
                <summary>Erreurs ({csvPreview.errors.length})</summary>
                <ul className="report-list">
                  {csvPreview.errors.map((e, i) => (
                    <li key={i} className="error-item">Ligne {e.row}: {e.message}</li>
                  ))}
                </ul>
              </details>
            )}

            <div className="button-row">
              <button
                type="button"
                className="primary-button"
                onClick={handleConfirmCsvImport}
                disabled={isImporting || csvPreview.validRows === 0}
              >
                {isImporting ? 'Import en cours...' : `Importer ${csvPreview.validRows} abonnement(s)`}
              </button>
              <button
                type="button"
                className="secondary-button"
                onClick={handleCancelCsvImport}
                disabled={isImporting}
              >
                Annuler
              </button>
            </div>
          </div>
        )}
      </section>

      {/* CSV Export section */}
      <section className="control-card" aria-labelledby="csv-export-title">
        <h2 id="csv-export-title">Export CSV</h2>
        <p className="section-description">
          Exporter les données au format CSV pour analyse ou transformation externe.
        </p>
        <div className="button-row">
          <button type="button" className="primary-button" onClick={handleExportSubscriptionsCsv}>
            Exporter les abonnements (CSV)
          </button>
          <button type="button" className="secondary-button" onClick={handleExportPaymentsCsv}>
            Exporter les paiements (CSV)
          </button>
        </div>
      </section>

      {/* Report section */}
      {report && reportType && (
        <section className="control-card" aria-labelledby="report-title">
          <h2 id="report-title">Rapport</h2>
          {reportType === 'snapshot-export' && (
            <p>Snapshot exporté avec succès.</p>
          )}
          {reportType === 'snapshot-restore' && (
            <div>
              <p>Snapshot restauré :</p>
              <ul className="report-list">
                <li>{report.created} entité(s) restaurée(s)</li>
              </ul>
            </div>
          )}
          {reportType === 'csv-import' && (
            <div>
              <p>Import terminé :</p>
              <ul className="report-list">
                <li>✅ {report.created} abonnement(s) créé(s)</li>
                {report.warnings.length > 0 && (
                  <li>⚠️ {report.warnings.length} avertissement(s)</li>
                )}
                {report.errors.length > 0 && (
                  <li>❌ {report.errors.length} erreur(s)</li>
                )}
              </ul>
              {report.warnings.length > 0 && (
                <details className="report-details">
                  <summary>Détail des avertissements</summary>
                  <ul className="report-list">
                    {report.warnings.map((w, i) => (
                      <li key={i} className="warning-item">{w.message}</li>
                    ))}
                  </ul>
                </details>
              )}
              {report.errors.length > 0 && (
                <details className="report-details">
                  <summary>Détail des erreurs</summary>
                  <ul className="report-list">
                    {report.errors.map((e, i) => (
                      <li key={i} className="error-item">{e.message}</li>
                    ))}
                  </ul>
                </details>
              )}
            </div>
          )}
          {reportType === 'csv-export' && (
            <p>Fichier CSV téléchargé.</p>
          )}
          <button
            type="button"
            className="secondary-button"
            onClick={() => { setReport(null); setReportType(null) }}
          >
            Fermer le rapport
          </button>
        </section>
      )}
    </div>
  )
}