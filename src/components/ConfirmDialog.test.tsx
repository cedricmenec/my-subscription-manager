import { describe, it, expect, vi, beforeEach, beforeAll } from 'vitest'
import { render, screen, fireEvent } from '@testing-library/react'
import ConfirmDialog from './ConfirmDialog'

// jsdom ne supporte pas HTMLDialogElement — on mocke les méthodes nécessaires
beforeAll(() => {
  HTMLDialogElement.prototype.showModal = vi.fn(function mockShowModal(this: HTMLDialogElement) {
    ;(this as HTMLDialogElement & { open: boolean }).open = true
  })
  HTMLDialogElement.prototype.close = vi.fn(function mockClose(this: HTMLDialogElement) {
    ;(this as HTMLDialogElement & { open: boolean }).open = false
  })
})

describe('ConfirmDialog', () => {
  const defaultProps = {
    isOpen: true,
    onClose: vi.fn(),
    onConfirm: vi.fn(),
    title: 'Supprimer la catégorie',
    message: 'Êtes-vous sûr de vouloir supprimer cette catégorie ?',
  }

  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('renders when open', () => {
    render(<ConfirmDialog {...defaultProps} />)
    expect(screen.getByText('Supprimer la catégorie')).toBeInTheDocument()
    expect(
      screen.getByText('Êtes-vous sûr de vouloir supprimer cette catégorie ?'),
    ).toBeInTheDocument()
    expect(screen.getByText('Accepter')).toBeInTheDocument()
    expect(screen.getByText('Refuser')).toBeInTheDocument()
  })

  it('does not render content when closed', () => {
    render(<ConfirmDialog {...defaultProps} isOpen={false} />)
    const dialog = screen.queryByRole('alertdialog')
    expect(dialog).not.toBeInTheDocument()
  })

  it('calls onConfirm when "Accepter" is clicked', () => {
    const onConfirm = vi.fn()
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />)
    fireEvent.click(screen.getByText('Accepter'))
    expect(onConfirm).toHaveBeenCalledTimes(1)
  })

  it('calls onClose when "Refuser" is clicked', () => {
    const onClose = vi.fn()
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />)
    fireEvent.click(screen.getByText('Refuser'))
    expect(onClose).toHaveBeenCalledTimes(1)
  })

it('calls onClose when backdrop is clicked', () => {
    const onClose = vi.fn()
    render(<ConfirmDialog {...defaultProps} onClose={onClose} />)

    const dialog = screen.getByRole('alertdialog')
    fireEvent.click(dialog)

    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('uses custom button labels', () => {
    render(
      <ConfirmDialog
        {...defaultProps}
        confirmLabel="Confirmer"
        cancelLabel="Annuler"
      />,
    )
    expect(screen.getByText('Confirmer')).toBeInTheDocument()
    expect(screen.getByText('Annuler')).toBeInTheDocument()
  })

  it('applies danger variant by default', () => {
    render(<ConfirmDialog {...defaultProps} />)
    const confirmButton = screen.getByText('Accepter')
    expect(confirmButton.className).toContain('danger-button')
  })

  it('applies warning variant when specified', () => {
    render(<ConfirmDialog {...defaultProps} variant="warning" />)
    const confirmButton = screen.getByText('Accepter')
    expect(confirmButton.className).toContain('warning-button')
  })

  it('disables buttons while loading', () => {
    const onConfirm = vi.fn(() => new Promise<void>(() => {}))
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByText('Accepter'))

    expect(screen.getByText('Refuser')).toBeDisabled()
    expect(screen.getByText('...')).toBeDisabled()
  })

  it('shows loading indicator during async confirm', () => {
    const onConfirm = vi.fn(() => new Promise<void>(() => {}))
    render(<ConfirmDialog {...defaultProps} onConfirm={onConfirm} />)

    fireEvent.click(screen.getByText('Accepter'))

    expect(screen.getByText('...')).toBeInTheDocument()
  })

  it('has correct accessibility attributes', () => {
    render(<ConfirmDialog {...defaultProps} />)
    const dialog = screen.getByRole('alertdialog')
    expect(dialog).toHaveAttribute('aria-modal', 'true')
    expect(dialog).toHaveAttribute('aria-labelledby', 'confirm-dialog-title')
    expect(dialog).toHaveAttribute('aria-describedby', 'confirm-dialog-message')
  })
})