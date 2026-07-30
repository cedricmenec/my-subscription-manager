import { render, screen, fireEvent } from '@testing-library/react'
import { describe, expect, it, vi, beforeEach, beforeAll } from 'vitest'
import SubscriptionDialog, {
  type SubscriptionFormState,
  EMPTY_FORM,
} from '../components/SubscriptionDialog'

// Mock des services de persistence
vi.mock('../services/subscriptions', async () => {
  const actual = await vi.importActual('../services/subscriptions')
  return {
    ...actual,
    createSubscription: vi.fn().mockResolvedValue({
      id: 'sbs-test-1',
      name: 'Netflix',
      status: 'ACTIVE',
      renewalMode: 'UNKNOWN',
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 8,
    }),
    updateSubscription: vi.fn().mockResolvedValue({
      id: 'sbs-test-1',
      name: 'Netflix',
      status: 'ACTIVE',
      renewalMode: 'UNKNOWN',
      createdAt: new Date(),
      updatedAt: new Date(),
      schemaVersion: 8,
    }),
  }
})

// jsdom ne supporte pas HTMLDialogElement — on mocke les méthodes nécessaires
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function mockShowModal(this: HTMLDialogElement) {
    ;(this as HTMLDialogElement & { open: boolean }).open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function mockClose(this: HTMLDialogElement) {
    ;(this as HTMLDialogElement & { open: boolean }).open = false
  })
})

const mockCategories = [
  { id: 'ctg1', name: 'Streaming' },
  { id: 'ctg2', name: 'Stockage' },
]

function renderDialog(overrides?: {
  editingId?: string | null
  formState?: SubscriptionFormState
}) {
  const onClose = vi.fn()
  const onSaved = vi.fn()
  const onSavedAfterSave = vi.fn()
  const onFeedback = vi.fn()

  const utils = render(
    <SubscriptionDialog
      isOpen={true}
      onClose={onClose}
      onSaved={onSaved}
      onSavedAfterSave={onSavedAfterSave}
      onFeedback={onFeedback}
      editingId={overrides?.editingId ?? null}
      formState={overrides?.formState ?? EMPTY_FORM}
      categories={mockCategories}
    />,
  )

  return { onClose, onSaved, onSavedAfterSave, onFeedback, ...utils }
}

function fillFormField(label: string, value: string) {
  const field = screen.getByLabelText(new RegExp(`^${label}\\s*\\*?$`, 'i'))
  fireEvent.change(field, { target: { value } })
}

describe('SubscriptionDialog — hasUnsavedChanges', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  describe('Clic sur l\'arrière-plan', () => {
    it('ferme le dialogue quand le formulaire n\'est pas modifié', () => {
      const { onClose } = renderDialog()
      const dialog = screen.getByRole('dialog')

      fireEvent.click(dialog)

      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('ne ferme PAS le dialogue quand le formulaire est modifié', () => {
      const { onClose } = renderDialog()
      fillFormField('Nom', 'Netflix')

      const dialog = screen.getByRole('dialog')
      fireEvent.click(dialog)

      expect(onClose).not.toHaveBeenCalled()
    })

    it('ferme le dialogue après modification si l\'utilisateur restaure la valeur initiale', () => {
      const { onClose } = renderDialog()
      fillFormField('Nom', 'Modifié')
      fillFormField('Nom', '')

      const dialog = screen.getByRole('dialog')
      fireEvent.click(dialog)

      expect(onClose).toHaveBeenCalledTimes(1)
    })
  })

  describe('Touche Échap', () => {
    beforeEach(() => {
      vi.stubGlobal('confirm', vi.fn())
    })

    it('ferme le dialogue quand le formulaire n\'est pas modifié', () => {
      const { onClose } = renderDialog()

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

      expect(onClose).toHaveBeenCalledTimes(1)
      expect(window.confirm).not.toHaveBeenCalled()
    })

    it('demande confirmation et ferme si l\'utilisateur accepte', () => {
      vi.mocked(window.confirm).mockReturnValue(true)
      const { onClose } = renderDialog()
      fillFormField('Nom', 'Netflix')

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

      expect(window.confirm).toHaveBeenCalledWith(
        'Voulez-vous vraiment annuler les modifications en cours ?',
      )
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('demande confirmation et ne ferme PAS si l\'utilisateur refuse', () => {
      vi.mocked(window.confirm).mockReturnValue(false)
      const { onClose } = renderDialog()
      fillFormField('Nom', 'Netflix')

      fireEvent.keyDown(screen.getByRole('dialog'), { key: 'Escape' })

      expect(window.confirm).toHaveBeenCalledOnce()
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('Bouton Annuler', () => {
    beforeEach(() => {
      vi.stubGlobal('confirm', vi.fn())
    })

    it('ferme le dialogue quand le formulaire n\'est pas modifié', () => {
      const { onClose } = renderDialog()

      fireEvent.click(screen.getByText('Annuler'))

      expect(onClose).toHaveBeenCalledTimes(1)
      expect(window.confirm).not.toHaveBeenCalled()
    })

    it('demande confirmation et ferme si l\'utilisateur accepte', () => {
      vi.mocked(window.confirm).mockReturnValue(true)
      const { onClose } = renderDialog()
      fillFormField('Nom', 'Netflix')

      fireEvent.click(screen.getByText('Annuler'))

      expect(window.confirm).toHaveBeenCalledWith(
        'Voulez-vous vraiment annuler les modifications en cours ?',
      )
      expect(onClose).toHaveBeenCalledTimes(1)
    })

    it('demande confirmation et ne ferme PAS si l\'utilisateur refuse', () => {
      vi.mocked(window.confirm).mockReturnValue(false)
      const { onClose } = renderDialog()
      fillFormField('Nom', 'Netflix')

      fireEvent.click(screen.getByText('Annuler'))

      expect(window.confirm).toHaveBeenCalledOnce()
      expect(onClose).not.toHaveBeenCalled()
    })
  })

  describe('Bouton Sauvegarder (sans fermeture)', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    it('ne ferme PAS le dialogue après sauvegarde', async () => {
      const { onClose } = renderDialog()
      fillFormField('Nom', 'Netflix')

      fireEvent.click(screen.getByText('Sauvegarder'))

      // Attendre la résolution de la promesse asynchrone
      await vi.waitFor(() => {
        expect(screen.getByText('Sauvegarder')).toBeInTheDocument()
      })

      expect(onClose).not.toHaveBeenCalled()
    })

    it('affiche le badge de confirmation après sauvegarde', async () => {
      renderDialog()
      fillFormField('Nom', 'Netflix')

      fireEvent.click(screen.getByText('Sauvegarder'))

      await vi.waitFor(() => {
        expect(screen.getByText(/✓ Enregistré à/)).toBeInTheDocument()
      })
    })
  })

  describe('Bouton Sauvegarder et Fermer', () => {
    beforeEach(() => {
      vi.restoreAllMocks()
    })

    it('ferme le dialogue après soumission', async () => {
      const { onClose } = renderDialog()
      fillFormField('Nom', 'Netflix')

      const form = screen.getByRole('dialog').querySelector('form')
      expect(form).not.toBeNull()
      fireEvent.submit(form!)

      await vi.waitFor(() => {
        expect(onClose).toHaveBeenCalledTimes(1)
      })
    })
  })
})