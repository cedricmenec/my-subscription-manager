import { fireEvent, render, screen, within } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import type { Payment, Subscription } from '../data/db'
import SubscriptionDetailPage from './SubscriptionDetailPage'

vi.mock('../components/SubscriptionDialog', () => ({
  default: ({ isOpen }: { isOpen: boolean }) =>
    isOpen ? <div role="dialog" aria-label="Modifier l’abonnement" /> : null,
  toFormState: () => ({}),
}))

const subscription: Subscription = {
  id: 'sbs-netflix',
  name: 'Netflix',
  provider: 'Netflix',
  planName: 'Premium',
  categoryId: 'ctg-streaming',
  status: 'ACTIVE',
  renewalMode: 'AUTOMATIC',
  currentPrice: 17.99,
  currency: 'EUR',
  billingIntervalCount: 1,
  billingIntervalUnit: 'MONTH',
  renewalIntervalCount: 1,
  renewalIntervalUnit: 'YEAR',
  nextChargeDate: '2026-08-15',
  nextRenewalDate: '2026-09-15',
  subscriptionDate: '2024-09-15',
  managementUrl: 'https://example.com/manage',
  cancellationUrl: 'https://example.com/cancel',
  notes: 'Compte familial',
  createdAt: new Date('2024-01-01T10:00:00Z'),
  updatedAt: new Date('2026-07-29T10:00:00Z'),
  schemaVersion: 8,
}

function payment(
  id: string,
  scheduledDate: string,
  status: Payment['status'],
): Payment {
  return {
    id,
    subscriptionId: subscription.id,
    scheduledDate,
    status,
    amount: { amount: 17.99, currency: 'EUR' },
    source: 'GENERATED',
    createdAt: new Date('2026-07-01T10:00:00Z'),
    updatedAt: new Date('2026-07-01T10:00:00Z'),
    schemaVersion: 5,
  }
}

function renderPage(overrides: {
  subscription?: Subscription
  isLoading?: boolean
  payments?: Payment[]
} = {}) {
  const onBack = vi.fn()
  render(
    <SubscriptionDetailPage
      subscription={'subscription' in overrides ? overrides.subscription : subscription}
      isLoading={overrides.isLoading ?? false}
      payments={overrides.payments ?? []}
      categories={[{ id: 'ctg-streaming', name: 'Streaming' }]}
      onBack={onBack}
      onRefreshSubscriptions={vi.fn()}
      onRefreshFinance={vi.fn()}
      onFeedback={vi.fn()}
      onSetOperationStatus={vi.fn()}
    />,
  )
  return { onBack }
}

describe('SubscriptionDetailPage', () => {
  beforeEach(() => {
    vi.useFakeTimers()
    vi.setSystemTime(new Date('2026-07-30T10:00:00Z'))
  })

  afterEach(() => {
    vi.useRealTimers()
  })

  it('met en relief le prochain paiement et le renouvellement automatique', () => {
    renderPage({
      payments: [
        payment('pym-second', '2026-09-15', 'PROJECTED'),
        payment('pym-first', '2026-08-15', 'PROJECTED'),
      ],
    })

    const highlights = screen.getByRole('region', {
      name: 'Prochaines échéances importantes',
    })
    expect(within(highlights).getByText('Prochain paiement')).toBeInTheDocument()
    expect(within(highlights).getByText('17,99 €')).toBeInTheDocument()
    expect(within(highlights).getByText('dans 16 jours')).toBeInTheDocument()
    expect(within(highlights).getByText('Prochain renouvellement')).toBeInTheDocument()
    expect(within(highlights).getByText('dans 47 jours')).toBeInTheDocument()

    const upcoming = screen.getByRole('heading', { name: 'Prochaines échéances' }).closest('section')
    expect(upcoming).not.toBeNull()
    expect(within(upcoming!).getAllByText('Prévu')).toHaveLength(2)
  })

  it('affiche jusqu’à douze échéances futures', () => {
    const futurePayments = Array.from({ length: 13 }, (_, index) =>
      payment(
        `pym-future-${index}`,
        `2026-${String(index + 8).padStart(2, '0')}-15`,
        'PROJECTED',
      ),
    )
    const normalizedPayments = futurePayments.map((item, index) => ({
      ...item,
      scheduledDate: index < 5
        ? `2026-${String(index + 8).padStart(2, '0')}-15`
        : `2027-${String(index - 4).padStart(2, '0')}-15`,
    }))

    renderPage({ payments: normalizedPayments })

    const upcoming = screen.getByRole('heading', { name: 'Prochaines échéances' }).closest('section')
    expect(upcoming).not.toBeNull()
    expect(within(upcoming as HTMLElement).getAllByRole('listitem')).toHaveLength(12)
  })

  it('sépare les échéances à vérifier de l’historique replié', () => {
    const { container } = render(
      <SubscriptionDetailPage
        subscription={subscription}
        isLoading={false}
        payments={[
          payment('pym-late', '2026-07-20', 'ASSUMED_PAID'),
          payment('pym-confirmed', '2026-06-15', 'CONFIRMED_PAID'),
          payment('pym-refunded', '2026-05-15', 'REFUNDED'),
        ]}
        categories={[]}
        onBack={vi.fn()}
        onRefreshSubscriptions={vi.fn()}
        onRefreshFinance={vi.fn()}
        onFeedback={vi.fn()}
        onSetOperationStatus={vi.fn()}
      />,
    )

    expect(screen.getByRole('heading', { name: 'À vérifier' })).toBeInTheDocument()
    expect(screen.getByText('Supposé payé')).toBeInTheDocument()
    const history = container.querySelector('details.subscription-history')
    expect(history).not.toHaveAttribute('open')
    expect(within(history as HTMLElement).getByText('2')).toBeInTheDocument()
    expect(within(history as HTMLElement).getByText('Confirmé')).toBeInTheDocument()
    expect(within(history as HTMLElement).getByText('Remboursé')).toBeInTheDocument()
  })

  it('n’affiche pas de carte de renouvellement pour un mode manuel', () => {
    renderPage({
      subscription: { ...subscription, renewalMode: 'MANUAL' },
    })

    const highlights = screen.getByRole('region', {
      name: 'Prochaines échéances importantes',
    })
    expect(within(highlights).queryByText('Prochain renouvellement')).not.toBeInTheDocument()
    expect(screen.getByText('Manuel')).toBeInTheDocument()
  })

  it('affiche les états de chargement et introuvable', () => {
    const { unmount } = render(
      <SubscriptionDetailPage
        isLoading
        payments={[]}
        categories={[]}
        onBack={vi.fn()}
        onRefreshSubscriptions={vi.fn()}
        onRefreshFinance={vi.fn()}
        onFeedback={vi.fn()}
        onSetOperationStatus={vi.fn()}
      />,
    )
    expect(screen.getByRole('heading', { name: 'Chargement de l’abonnement…' })).toBeInTheDocument()
    unmount()

    const { onBack } = renderPage({ subscription: undefined })
    fireEvent.click(screen.getByRole('button', { name: 'Retour aux abonnements' }))
    expect(onBack).toHaveBeenCalledOnce()
  })

  it('ouvre le dialogue d’édition existant', () => {
    renderPage()
    fireEvent.click(screen.getByRole('button', { name: 'Modifier' }))
    expect(screen.getByRole('dialog', { name: 'Modifier l’abonnement' })).toBeInTheDocument()
  })
})
