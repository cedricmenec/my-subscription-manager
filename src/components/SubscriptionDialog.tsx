import { useRef, useEffect, useState, type FormEvent } from 'react'
import {
  type IntervalUnit,
  type RenewalMode,
  type Subscription,
  type SubscriptionStatus,
} from '../data/db'
import {
  type SubscriptionValidationError,
  createSubscription,
  updateSubscription,
  type UpsertSubscriptionInput,
} from '../services/subscriptions'
import { describeInterval, parseOptionalNumber } from '../services/finance'
import { addIntervalToCivilDate } from '../services/civilDate'

export interface SubscriptionFormState {
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
  nextRenewalDate: string
  subscriptionDate: string
  renewalPeriodStartDate: string
  commitmentStartDate: string
  pauseStartDate: string
  pauseUntil: string
  serviceEndDate: string
  startDate: string
  managementUrl: string
  cancellationUrl: string
  cancellationInstructions: string
  notes: string
  hasCommitment: boolean
  isPaused: boolean
}

export const EMPTY_FORM: SubscriptionFormState = {
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
  nextRenewalDate: '',
  subscriptionDate: '',
  renewalPeriodStartDate: '',
  commitmentStartDate: '',
  pauseStartDate: '',
  pauseUntil: '',
  serviceEndDate: '',
  startDate: '',
  managementUrl: '',
  cancellationUrl: '',
  cancellationInstructions: '',
  notes: '',
  hasCommitment: false,
  isPaused: false,
}

export function toFormState(subscription: Subscription): SubscriptionFormState {
  const price = typeof subscription.currentPrice === 'number'
    ? String(subscription.currentPrice)
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
    nextRenewalDate: subscription.nextRenewalDate ?? '',
    subscriptionDate: subscription.subscriptionDate ?? '',
    renewalPeriodStartDate: subscription.renewalPeriodStartDate ?? '',
    commitmentStartDate: subscription.commitmentStartDate ?? '',
    pauseStartDate: subscription.pauseStartDate ?? '',
    pauseUntil: subscription.pauseUntil ?? '',
    serviceEndDate: subscription.serviceEndDate ?? '',
    startDate: subscription.startDate ?? '',
    managementUrl: subscription.managementUrl ?? '',
    cancellationUrl: subscription.cancellationUrl ?? '',
    cancellationInstructions: subscription.cancellationInstructions ?? '',
    notes: subscription.notes ?? '',
    hasCommitment: Boolean(subscription.commitmentIntervalCount && subscription.commitmentIntervalUnit),
    isPaused: subscription.status === 'PAUSED',
  }
}

const STATUS_OPTIONS: SubscriptionStatus[] = [
  'TRIAL', 'ACTIVE', 'PAUSED', 'CANCELLED_PENDING_END', 'ENDED', 'UNKNOWN',
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

type BillingCyclePreset = 'WEEK' | 'MONTH' | 'YEAR' | 'CUSTOM'

function presetFromBilling(unit: IntervalUnit | '', count: string): BillingCyclePreset {
  const c = parseInt(count, 10)
  if (unit === 'WEEK' && c === 1) return 'WEEK'
  if (unit === 'MONTH' && c === 1) return 'MONTH'
  if (unit === 'YEAR' && c === 1) return 'YEAR'
  return 'CUSTOM'
}

function billingFromPreset(preset: BillingCyclePreset): { unit: IntervalUnit; count: string } {
  switch (preset) {
    case 'WEEK': return { unit: 'WEEK', count: '1' }
    case 'MONTH': return { unit: 'MONTH', count: '1' }
    case 'YEAR': return { unit: 'YEAR', count: '1' }
    case 'CUSTOM': return { unit: 'MONTH', count: '1' }
  }
}

const PRESET_OPTIONS: Array<{ value: BillingCyclePreset; label: string }> = [
  { value: 'WEEK', label: 'Hebdo' },
  { value: 'MONTH', label: 'Mensuel' },
  { value: 'YEAR', label: 'Annuel' },
  { value: 'CUSTOM', label: 'Personnalisé' },
]

function computeCommitmentEndDate(startDate: string, unit: IntervalUnit | '', count: string): string | undefined {
  if (!startDate || !unit || !count) return undefined
  const c = parseInt(count, 10)
  if (!c || c < 1) return undefined
  return addIntervalToCivilDate(startDate, unit as IntervalUnit, c)
}

const INTERVAL_LABELS: Record<IntervalUnit, string> = {
  DAY: 'Jour',
  WEEK: 'Semaine',
  MONTH: 'Mois',
  YEAR: 'Année',
}

interface SubscriptionDialogProps {
  isOpen: boolean
  onClose: () => void
  onSaved: () => void
  onFeedback: (message: string) => void
  editingId: string | null
  formState: SubscriptionFormState
  categories: Array<{ id: string; name: string }>
}

export default function SubscriptionDialog({
  isOpen,
  onClose,
  onSaved,
  onFeedback,
  editingId,
  formState,
  categories,
}: SubscriptionDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null)
  const closeButtonRef = useRef<HTMLButtonElement>(null)
  const initialFormRef = useRef(formState)
  const [localForm, setLocalForm] = useState<SubscriptionFormState>(formState)
  const [formErrors, setFormErrors] = useState<Record<string, string>>({})
  const [isSubmitting, setIsSubmitting] = useState(false)

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

  function updateField<K extends keyof SubscriptionFormState>(
    field: K,
    value: SubscriptionFormState[K],
  ) {
    setLocalForm(prev => ({ ...prev, [field]: value }))
  }

  function hasUnsavedChanges(): boolean {
    return JSON.stringify(initialFormRef.current) !== JSON.stringify(localForm)
  }

  function handleBackdropClick(event: React.MouseEvent) {
    if (event.target === dialogRef.current) {
      if (!hasUnsavedChanges()) {
        onClose()
      }
    }
  }

  function handleKeyDown(event: React.KeyboardEvent) {
    if (event.key === 'Escape') {
      if (hasUnsavedChanges()) {
        if (window.confirm('Voulez-vous vraiment annuler les modifications en cours ?')) {
          onClose()
        }
      } else {
        onClose()
      }
    }
  }

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setFormErrors({})
    setIsSubmitting(true)

    try {
      const payload: UpsertSubscriptionInput = {
        name: localForm.name,
        provider: localForm.provider,
        planName: localForm.planName,
        categoryId: localForm.categoryId,
        status: localForm.isPaused && localForm.status !== 'PAUSED' ? 'PAUSED' : localForm.status,
        renewalMode: localForm.renewalMode,
        currentPrice: parseOptionalNumber(localForm.currentPrice),
        currency: localForm.currency,
        billingIntervalCount: parseOptionalNumber(localForm.billingIntervalCount),
        billingIntervalUnit: localForm.billingIntervalUnit || undefined,
        commitmentIntervalCount: localForm.hasCommitment
          ? parseOptionalNumber(localForm.commitmentIntervalCount)
          : undefined,
        commitmentIntervalUnit: localForm.hasCommitment
          ? (localForm.commitmentIntervalUnit || undefined)
          : undefined,
        commitmentStartDate: localForm.hasCommitment
          ? (localForm.commitmentStartDate || undefined)
          : undefined,
        renewalIntervalCount: localForm.renewalMode === 'AUTOMATIC'
          ? parseOptionalNumber(localForm.renewalIntervalCount)
          : undefined,
        renewalIntervalUnit: localForm.renewalMode === 'AUTOMATIC'
          ? (localForm.renewalIntervalUnit || undefined)
          : undefined,
        subscriptionDate: localForm.renewalMode === 'AUTOMATIC'
          ? (localForm.subscriptionDate || undefined)
          : undefined,
        renewalPeriodStartDate: localForm.renewalMode === 'AUTOMATIC'
          ? (localForm.renewalPeriodStartDate || undefined)
          : undefined,
        startDate: localForm.startDate || undefined,
        nextChargeDate: localForm.nextChargeDate || undefined,
        pauseStartDate: localForm.isPaused ? (localForm.pauseStartDate || undefined) : undefined,
        pauseUntil: localForm.isPaused ? (localForm.pauseUntil || undefined) : undefined,
        serviceEndDate: localForm.serviceEndDate || undefined,
        managementUrl: localForm.managementUrl,
        cancellationUrl: localForm.cancellationUrl,
        cancellationInstructions: localForm.cancellationInstructions,
        notes: localForm.notes,
      }

      if (editingId) {
        await updateSubscription(editingId, payload)
        onFeedback('Abonnement modifié localement. Synchronisation asynchrone en cours.')
      } else {
        await createSubscription(payload)
        onFeedback('Abonnement créé localement. Synchronisation asynchrone en cours.')
      }

      onClose()
      onSaved()
    } catch (error) {
      if (error instanceof Error && error.name === 'SubscriptionValidationError') {
        const typedError = error as SubscriptionValidationError
        setFormErrors(typedError.errors)
      } else {
        onFeedback(
          `Enregistrement impossible: ${error instanceof Error ? error.message : 'erreur inconnue'}`,
        )
      }
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <dialog
      ref={dialogRef}
      className="subscription-dialog"
      role="dialog"
      aria-modal="true"
      aria-labelledby="subscription-dialog-title"
      onClose={onClose}
      onKeyDown={handleKeyDown}
      onClick={handleBackdropClick}
    >
      <div className="dialog-header">
        <h2 id="subscription-dialog-title">
          {editingId ? 'Modifier un abonnement' : 'Créer un abonnement'}
        </h2>
        <button
          ref={closeButtonRef}
          type="button"
          className="dialog-close-btn"
          onClick={onClose}
          aria-label="Fermer"
        >
          <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
            <line x1="18" y1="6" x2="6" y2="18" />
            <line x1="6" y1="6" x2="18" y2="18" />
          </svg>
        </button>
      </div>

      <form onSubmit={handleSubmit} noValidate className="dialog-form">
        {/* Section Général */}
        <fieldset className="dialog-section">
          <legend className="dialog-section-title">Général</legend>
          <div className="dialog-section-grid">
            <label>
              Nom *
              <input value={localForm.name} onChange={e => updateField('name', e.target.value)} />
              {formErrors.name ? <span className="field-error">{formErrors.name}</span> : null}
            </label>
            <label>
              Fournisseur
              <input value={localForm.provider} onChange={e => updateField('provider', e.target.value)} />
            </label>
            <label>
              Plan
              <input value={localForm.planName} onChange={e => updateField('planName', e.target.value)} />
            </label>
            <label>
              Catégorie
              <select value={localForm.categoryId} onChange={e => updateField('categoryId', e.target.value)}>
                <option value="">Aucune</option>
                {categories.map(cat => (
                  <option key={cat.id} value={cat.id}>{cat.name}</option>
                ))}
              </select>
            </label>
            <label>
              Statut
              <select value={localForm.status} onChange={e => updateField('status', e.target.value as SubscriptionStatus)}>
                {STATUS_OPTIONS.map(s => (
                  <option key={s} value={s}>{STATUS_LABELS[s]}</option>
                ))}
              </select>
            </label>
            <label>
              Mode de renouvellement
              <select value={localForm.renewalMode} onChange={e => {
                const newMode = e.target.value as RenewalMode
                updateField('renewalMode', newMode)
                // Pré-remplir les champs de renouvellement avec les valeurs de facturation
                if (newMode === 'AUTOMATIC' && localForm.renewalMode !== 'AUTOMATIC') {
                  updateField('renewalIntervalCount', localForm.billingIntervalCount || '1')
                  updateField('renewalIntervalUnit', (localForm.billingIntervalUnit || 'MONTH') as IntervalUnit | '')
                  if (!localForm.renewalPeriodStartDate) {
                    updateField('renewalPeriodStartDate', localForm.startDate || localForm.subscriptionDate || '')
                  }
                }
              }}>
                {RENEWAL_OPTIONS.map(m => (
                  <option key={m} value={m}>{RENEWAL_LABELS[m]}</option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        {/* Section Cycle de facturation */}
        <fieldset className="dialog-section">
          <legend className="dialog-section-title">Cycle de facturation</legend>
          <div className="dialog-section-grid">
            <label>
              Cycle
              <select
                value={presetFromBilling(localForm.billingIntervalUnit, localForm.billingIntervalCount)}
                onChange={e => {
                  const preset = e.target.value as BillingCyclePreset
                  const b = billingFromPreset(preset)
                  updateField('billingIntervalCount', b.count)
                  updateField('billingIntervalUnit', b.unit)
                }}
              >
                {PRESET_OPTIONS.map(o => (
                  <option key={o.value} value={o.value}>{o.label}</option>
                ))}
              </select>
            </label>
            <label>
              {presetFromBilling(localForm.billingIntervalUnit, localForm.billingIntervalCount) === 'CUSTOM' ? (
                <span>Quantité</span>
              ) : (
                <span>&nbsp;</span>
              )}
              {presetFromBilling(localForm.billingIntervalUnit, localForm.billingIntervalCount) === 'CUSTOM' ? (
                <input type="number" min="1" value={localForm.billingIntervalCount} onChange={e => updateField('billingIntervalCount', e.target.value)} />
              ) : (
                <div className="cycle-summary">{describeInterval(
                  parseInt(localForm.billingIntervalCount, 10) || 1,
                  localForm.billingIntervalUnit as IntervalUnit,
                )}</div>
              )}
            </label>
            <label>
              Prix
              <input type="number" step="0.01" min="0" value={localForm.currentPrice} onChange={e => updateField('currentPrice', e.target.value)} />
              {formErrors.currentPrice ? <span className="field-error">{formErrors.currentPrice}</span> : null}
            </label>
            <label>
              Devise
              <input value={localForm.currency} onChange={e => updateField('currency', e.target.value)} />
            </label>
            <label>
              Prochaine échéance
              <input type="date" value={localForm.nextChargeDate} onChange={e => updateField('nextChargeDate', e.target.value)} />
              {formErrors.nextChargeDate ? <span className="field-error">{formErrors.nextChargeDate}</span> : null}
            </label>
            <label>
              Début de service
              <input type="date" value={localForm.startDate} onChange={e => updateField('startDate', e.target.value)} />
              {formErrors.startDate ? <span className="field-error">{formErrors.startDate}</span> : null}
            </label>
          </div>
        </fieldset>

        {/* Section Renouvellement (conditionnelle) */}
        {localForm.renewalMode === 'AUTOMATIC' && (
          <fieldset className="dialog-section">
            <legend className="dialog-section-title">Renouvellement</legend>
            <div className="dialog-section-grid">
              <label>
                Cycle de renouvellement: quantité
                <input type="number" min="1" value={localForm.renewalIntervalCount || localForm.billingIntervalCount} onChange={e => updateField('renewalIntervalCount', e.target.value)} />
              </label>
              <label>
                Unité
                <select value={localForm.renewalIntervalUnit || localForm.billingIntervalUnit} onChange={e => updateField('renewalIntervalUnit', e.target.value as IntervalUnit | '')}>
                  <option value="">Identique au cycle</option>
                  {INTERVAL_UNIT_OPTIONS.map(u => (
                    <option key={u} value={u}>{INTERVAL_LABELS[u]}</option>
                  ))}
                </select>
              </label>
              <label>
                Date de souscription
                {editingId ? (
                  <>
                    <div className="field-info">{localForm.subscriptionDate || 'Non renseignée'}</div>
                    <small className="field-hint">Lecture seule après création</small>
                  </>
                ) : (
                  <>
                    <input type="date" value={localForm.subscriptionDate} onChange={e => updateField('subscriptionDate', e.target.value)} />
                    <small className="field-hint">Date de souscription initiale</small>
                  </>
                )}
              </label>
              <label>
                Début de la période en cours
                <input type="date" value={localForm.renewalPeriodStartDate} onChange={e => updateField('renewalPeriodStartDate', e.target.value)} />
                <small className="field-hint">Ajustable (ex. mois offert)</small>
              </label>
              <label className="info-field">
                Prochain renouvellement
                <div className="field-info">
                  {editingId && localForm.nextRenewalDate
                    ? localForm.nextRenewalDate
                    : 'Calculé automatiquement par le moteur'}
                </div>
                <small className="field-hint">Mise à jour automatique</small>
              </label>
            </div>
          </fieldset>
        )}

        {/* Section Engagement (conditionnelle) */}
        <fieldset className="dialog-section">
          <legend className="dialog-section-title">Engagement</legend>
          <div className="dialog-section-grid">
            <label>
              Type d'engagement
              <select
                value={localForm.hasCommitment ? 'yes' : 'no'}
                onChange={e => {
                  const hasCommitment = e.target.value === 'yes'
                  updateField('hasCommitment', hasCommitment)
                  if (!hasCommitment) {
                    updateField('commitmentIntervalCount', '')
                    updateField('commitmentIntervalUnit', '')
                    updateField('commitmentStartDate', '')
                  }
                }}
              >
                <option value="no">Sans engagement</option>
                <option value="yes">Avec engagement</option>
              </select>
            </label>
            {localForm.hasCommitment && (
              <>
                <label>
                  Durée d'engagement
                  <div className="inline-group">
                    <input type="number" min="1" value={localForm.commitmentIntervalCount} onChange={e => updateField('commitmentIntervalCount', e.target.value)} placeholder="Quantité" />
                    <select value={localForm.commitmentIntervalUnit} onChange={e => updateField('commitmentIntervalUnit', e.target.value as IntervalUnit | '')}>
                      <option value="">Unité</option>
                      {INTERVAL_UNIT_OPTIONS.map(u => (
                        <option key={u} value={u}>{INTERVAL_LABELS[u]}</option>
                      ))}
                    </select>
                  </div>
                  {formErrors.commitmentInterval ? <span className="field-error">{formErrors.commitmentInterval}</span> : null}
                </label>
                <label>
                  Début d'engagement
                  <input type="date" value={localForm.commitmentStartDate} onChange={e => updateField('commitmentStartDate', e.target.value)} />
                  <small className="field-hint">Par défaut la date de début de service</small>
                </label>
                <label className="info-field">
                  Fin d'engagement
                  <div className="field-info">
                    {localForm.commitmentStartDate && localForm.commitmentIntervalUnit && localForm.commitmentIntervalCount
                      ? computeCommitmentEndDate(
                          localForm.commitmentStartDate,
                          localForm.commitmentIntervalUnit as IntervalUnit,
                          localForm.commitmentIntervalCount,
                        )
                      : '—'}
                  </div>
                  <small className="field-hint">Calculée automatiquement (informative)</small>
                </label>
              </>
            )}
          </div>
        </fieldset>

        {/* Section Pause (conditionnelle) */}
        {localForm.status === 'PAUSED' ? (
          <fieldset className="dialog-section">
            <legend className="dialog-section-title">Pause</legend>
            <div className="dialog-section-grid">
              <label>
                Début de pause
                <input type="date" value={localForm.pauseStartDate} onChange={e => updateField('pauseStartDate', e.target.value)} />
              </label>
              <label>
                Fin de pause
                <input type="date" value={localForm.pauseUntil} onChange={e => updateField('pauseUntil', e.target.value)} />
                {formErrors.pauseUntil ? <span className="field-error">{formErrors.pauseUntil}</span> : null}
              </label>
            </div>
          </fieldset>
        ) : (
          <fieldset className="dialog-section">
            <legend className="dialog-section-title">Pause</legend>
            <div className="dialog-section-grid">
              <div className="field-info-full">L'abonnement n'est pas en pause.</div>
            </div>
          </fieldset>
        )}

        {/* Section Fin de service */}
        <fieldset className="dialog-section">
          <legend className="dialog-section-title">Fin de service</legend>
          <div className="dialog-section-grid">
            {localForm.serviceEndDate ? (
              <label>
                Date de fin de service
                <input type="date" value={localForm.serviceEndDate} onChange={e => updateField('serviceEndDate', e.target.value)} />
                {formErrors.serviceEndDate ? <span className="field-error">{formErrors.serviceEndDate}</span> : null}
              </label>
            ) : (
              <div className="field-info-full">Pas de fin de service programmée.</div>
            )}
          </div>
        </fieldset>

        {/* Section URLs */}
        <fieldset className="dialog-section">
          <legend className="dialog-section-title">URLs</legend>
          <div className="dialog-section-grid">
            <label>
              URL de gestion
              <input type="url" value={localForm.managementUrl} onChange={e => updateField('managementUrl', e.target.value)} />
              {formErrors.managementUrl ? <span className="field-error">{formErrors.managementUrl}</span> : null}
            </label>
            <label>
              URL de résiliation
              <input type="url" value={localForm.cancellationUrl} onChange={e => updateField('cancellationUrl', e.target.value)} />
              {formErrors.cancellationUrl ? <span className="field-error">{formErrors.cancellationUrl}</span> : null}
            </label>
          </div>
        </fieldset>

        {/* Section Notes */}
        <fieldset className="dialog-section">
          <legend className="dialog-section-title">Notes</legend>
          <label>
            Instructions de résiliation
            <textarea value={localForm.cancellationInstructions} onChange={e => updateField('cancellationInstructions', e.target.value)} />
          </label>
          <label>
            Notes
            <textarea value={localForm.notes} onChange={e => updateField('notes', e.target.value)} />
          </label>
        </fieldset>

        <div className="dialog-actions">
          <button type="button" className="secondary-button" onClick={() => {
            if (hasUnsavedChanges()) {
              if (window.confirm('Voulez-vous vraiment annuler les modifications en cours ?')) {
                onClose()
              }
            } else {
              onClose()
            }
          }} disabled={isSubmitting}>
            Annuler
          </button>
          <button type="submit" disabled={isSubmitting}>
            {isSubmitting ? 'Enregistrement…' : editingId ? 'Enregistrer les modifications' : 'Créer'}
          </button>
        </div>
      </form>
    </dialog>
  )
}