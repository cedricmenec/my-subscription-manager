import { type Payment, type PaymentStatus } from '../data/db'

interface PaymentsPageProps {
  payments: Payment[]
  onPaymentAction: (payment: Payment, status: PaymentStatus) => void
}

const PAYMENT_STATUS_LABELS: Record<PaymentStatus, string> = {
  PROJECTED: 'Prévu',
  ASSUMED_PAID: 'Supposé payé',
  CONFIRMED_PAID: 'Confirmé',
  SKIPPED: 'Ignoré',
  REFUNDED: 'Remboursé',
}

function formatMoney(amount: number, currency: string): string {
  try {
    return new Intl.NumberFormat('fr-FR', { style: 'currency', currency }).format(amount)
  } catch {
    return `${amount.toFixed(2)} ${currency}`
  }
}

export default function PaymentsPage({ payments, onPaymentAction }: PaymentsPageProps) {
  const sortedPayments = [...payments].sort((a, b) => {
    if (a.scheduledDate !== b.scheduledDate) {
      return a.scheduledDate.localeCompare(b.scheduledDate)
    }
    return b.updatedAt.getTime() - a.updatedAt.getTime()
  })

  return (
    <div className="payments-page">
      <header className="page-header">
        <div>
          <p className="section-label">Suivi des paiements</p>
          <h1>Paiements</h1>
        </div>
        <p className="item-count" aria-label="Nombre de paiements">
          {sortedPayments.length} paiement{sortedPayments.length > 1 ? 's' : ''}
        </p>
      </header>

      {sortedPayments.length === 0 ? (
        <div className="empty-state">
          <span className="empty-state-icon" aria-hidden="true"><span /></span>
          <div>
            <h2>Aucun paiement pour le moment</h2>
            <p>Les paiements projetés apparaîtront ici une fois les abonnements créés.</p>
          </div>
        </div>
      ) : (
        <section className="list-section" aria-labelledby="payments-list-title">
          <h2 id="payments-list-title" className="sr-only">Liste des paiements</h2>
          <ul className="payment-list">
            {sortedPayments.map(payment => (
              <li key={payment.id} className="payment-item">
                <div>
                  <p className={`payment-status payment-status-${payment.status.toLowerCase()}`}>
                    {PAYMENT_STATUS_LABELS[payment.status]}
                  </p>
                  <h3>{payment.scheduledDate}</h3>
                  <p>{formatMoney(payment.amount.amount, payment.amount.currency)}</p>
                  <p>Abonnement: {payment.subscriptionId}</p>
                </div>
                <div className="button-row">
                  {payment.status === 'PROJECTED' || payment.status === 'ASSUMED_PAID' ? (
                    <button
                      type="button"
                      className="secondary-button"
                      onClick={() => { void onPaymentAction(payment, 'CONFIRMED_PAID') }}
                    >
                      Confirmer
                    </button>
                  ) : null}
                  {payment.status !== 'SKIPPED' ? (
                    <button
                      type="button"
                      onClick={() => { void onPaymentAction(payment, 'SKIPPED') }}
                    >
                      Ignorer
                    </button>
                  ) : null}
                  {payment.status === 'ASSUMED_PAID' || payment.status === 'CONFIRMED_PAID' ? (
                    <button
                      type="button"
                      className="danger-button"
                      onClick={() => { void onPaymentAction(payment, 'REFUNDED') }}
                    >
                      Rembourser
                    </button>
                  ) : null}
                </div>
              </li>
            ))}
          </ul>
        </section>
      )}
    </div>
  )
}