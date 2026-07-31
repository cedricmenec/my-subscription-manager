import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import type { Subscription } from '../data/db'
import SubscriptionCardList from './SubscriptionCardList'
import SubscriptionCompactList from './SubscriptionCompactList'

const subscription: Subscription = {
  id: 'sbs-test',
  name: 'Service test',
  status: 'ACTIVE',
  renewalMode: 'AUTOMATIC',
  currentPrice: 9.99,
  currency: 'EUR',
  billingIntervalCount: 1,
  billingIntervalUnit: 'MONTH',
  nextChargeDate: '2026-08-01',
  createdAt: new Date('2026-01-01T00:00:00Z'),
  updatedAt: new Date('2026-01-01T00:00:00Z'),
  schemaVersion: 8,
}

describe('accès à la fiche depuis les listes', () => {
  it('consulte un abonnement depuis la liste compacte sans lancer l’édition', () => {
    const onView = vi.fn()
    const onEdit = vi.fn()
    render(
      <SubscriptionCompactList
        subscriptions={[subscription]}
        sortBy="nextChargeDate"
        sortDirection="asc"
        onSort={vi.fn()}
        onView={onView}
        onEdit={onEdit}
        onArchive={vi.fn()}
        categories={[]}
        excludedIds={[]}
        excludedReasons={new Map()}
        convertedIds={[]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Service test' }))
    expect(onView).toHaveBeenCalledWith(subscription.id)
    expect(onEdit).not.toHaveBeenCalled()
  })

  it('conserve des actions distinctes dans le mode cartes', () => {
    const onView = vi.fn()
    const onEdit = vi.fn()
    render(
      <SubscriptionCardList
        subscriptions={[subscription]}
        onView={onView}
        onEdit={onEdit}
        onArchive={vi.fn()}
        categories={[]}
        excludedIds={[]}
        excludedReasons={new Map()}
        convertedIds={[]}
      />,
    )

    fireEvent.click(screen.getByRole('button', { name: 'Voir' }))
    expect(onView).toHaveBeenCalledWith(subscription.id)
    expect(onEdit).not.toHaveBeenCalled()

    fireEvent.click(screen.getByRole('button', { name: '✎ Modifier' }))
    expect(onEdit).toHaveBeenCalledWith(subscription)
  })

  it('distingue les quatre modes de continuation dans la liste compacte', () => {
    render(
      <SubscriptionCompactList
        subscriptions={[
          { ...subscription, id: 'rolling', name: 'Rolling', renewalMode: 'ROLLING' },
          { ...subscription, id: 'automatic', name: 'Automatic', renewalMode: 'AUTOMATIC' },
          { ...subscription, id: 'manual', name: 'Manual', renewalMode: 'MANUAL' },
          { ...subscription, id: 'unknown', name: 'Unknown', renewalMode: 'UNKNOWN' },
        ]}
        sortBy="nextChargeDate"
        sortDirection="asc"
        onSort={vi.fn()}
        onView={vi.fn()}
        onEdit={vi.fn()}
        onArchive={vi.fn()}
        categories={[]}
        excludedIds={[]}
        excludedReasons={new Map()}
        convertedIds={[]}
      />,
    )

    expect(screen.getByText('Reconduction continue')).toBeInTheDocument()
    expect(screen.getByText('Calcul automatique')).toBeInTheDocument()
    expect(screen.getByText('Renouvellement manuel')).toBeInTheDocument()
    expect(screen.getByText('Inconnu')).toBeInTheDocument()
  })
})
