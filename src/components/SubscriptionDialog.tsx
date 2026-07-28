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
import { parseOptionalNumber } from '../services/finance'

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
  pauseUntil: string
  serviceEndDate: string
  managementUrl: string
  cancellationUrl: string
  cancellationInstructions: string
  notes: string
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
  pauseUntil: '',
  serviceEndDate: '',
  managementUrl: '',
  cancellationUrl: '',
  cancellationInstructions: '',
  notes: '',
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
    pauseUntil: subscription.pauseUntil ?? '',
    serviceEndDate: subscription.serviceEndDate ?? '',
    managementUrl: subscription.managementUrl ?? '',
    cancellationUrl: subscription.cancellationUrl ?? '',
    cancellationInstructions: subscription.cancellationInstructions ?? '',
    notes: subscription.notes ?? '',
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
        status: localForm.status,
        renewalMode: localForm.renewalMode,
        currentPrice: parseOptionalNumber(localForm.currentPrice),
        currency: localForm.currency,
        billingIntervalCount: parseOptionalNumber(localForm.billingIntervalCount),
        billingIntervalUnit: localForm.billingIntervalUnit || undefined,
        commitmentIntervalCount: parseOptionalNumber(localForm.commitmentIntervalCount),
        commitmentIntervalUnit: localForm.commitmentIntervalUnit || undefined,
        renewalIntervalCount: parseOptionalNumber(localForm.renewalIntervalCount),
        renewalIntervalUnit: localForm.renewalIntervalUnit || undefined,
        nextChargeDate: localForm.nextChargeDate,
        pauseUntil: localForm.pauseUntil,
        serviceEndDate: localForm.serviceEndDate,
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
              <select value={localForm.renewalMode} onChange={e => updateField('renewalMode', e.target.value as RenewalMode)}>
                {RENEWAL_OPTIONS.map(m => (
                  <option key={m} value={m}>{RENEWAL_LABELS[m]}</option>
                ))}
              </select>
            </label>
          </div>
        </fieldset>

        {/* Section Facturation */}
        <fieldset className="dialog-section">
          <legend className="dialog-section-title">Facturation</legend>
          <div className="dialog-section-grid">
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
              Cycle: quantité
              <input type="number" min="1" value={localForm.billingIntervalCount} onChange={e => updateField('billingIntervalCount', e.target.value)} />
            </label>
            <label>
              Cycle: unité
              <select value={localForm.billingIntervalUnit} onChange={e => updateField('billingIntervalUnit', e.target.value as IntervalUnit)}>
                {INTERVAL_UNIT_OPTIONS.map(u => (
                  <option key={u} value={u}>{INTERVAL_LABELS[u]}</option>
                ))}
              </select>
              {formErrors.billingInterval ? <span className="field-error">{formErrors.billingInterval}</span> : null}
            </label>
            <label>
              Engagement: quantité
              <input type="number" min="1" value={localForm.commitmentIntervalCount} onChange={e => updateField('commitmentIntervalCount', e.target.value)} />
            </label>
            <label>
              Engagement: unité
              <select value={localForm.commitmentIntervalUnit} onChange={e => updateField('commitmentIntervalUnit', e.target.value as IntervalUnit | '')}>
                <option value="">Aucun</option>
                {INTERVAL_UNIT_OPTIONS.map(u => (
                  <option key={u} value={u}>{INTERVAL_LABELS[u]}</option>
                ))}
              </select>
              {formErrors.commitmentInterval ? <span className="field-error">{formErrors.commitmentInterval}</span> : null}
            </label>
            <label>
              Renouvellement: quantité
              <input type="number" min="1" value={localForm.renewalIntervalCount} onChange={e => updateField('renewalIntervalCount', e.target.value)} />
            </label>
            <label>
              Renouvellement: unité
              <select value={localForm.renewalIntervalUnit} onChange={e => updateField('renewalIntervalUnit', e.target.value as IntervalUnit | '')}>
                <option value="">Aucun</option>
                {INTERVAL_UNIT_OPTIONS.map(u => (
                  <option key={u} value={u}>{INTERVAL_LABELS[u]}</option>
                ))}
              </select>
              {formErrors.renewalInterval ? <span className="field-error">{formErrors.renewalInterval}</span> : null}
            </label>
          </div>
        </fieldset>

        {/* Section Dates */}
        <fieldset className="dialog-section">
          <legend className="dialog-section-title">Dates</legend>
          <div className="dialog-section-grid dialog-section-grid-4">
            <label>
              Prochaine échéance
              <input type="date" value={localForm.nextChargeDate} onChange={e => updateField('nextChargeDate', e.target.value)} />
              {formErrors.nextChargeDate ? <span className="field-error">{formErrors.nextChargeDate}</span> : null}
            </label>
            <label>
              Début de service
              <input type="date" value={localForm.serviceEndDate} onChange={e => updateField('serviceEndDate', e.target.value)} />
              {formErrors.serviceEndDate ? <span className="field-error">{formErrors.serviceEndDate}</span> : null}
            </label>
            <label>
              Fin de pause
              <input type="date" value={localForm.pauseUntil} onChange={e => updateField('pauseUntil', e.target.value)} />
              {formErrors.pauseUntil ? <span className="field-error">{formErrors.pauseUntil}</span> : null}
            </label>
            <label>
              Fin de service
              <input type="date" value={localForm.serviceEndDate} onChange={e => updateField('serviceEndDate', e.target.value)} />
              {formErrors.serviceEndDate ? <span className="field-error">{formErrors.serviceEndDate}</span> : null}
            </label>
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
          <button type="button" className="secondary-button" onClick={onClose} disabled={isSubmitting}>
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