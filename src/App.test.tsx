import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('affiche la vue initiale des abonnements en français', () => {
    render(<App />)

    expect(
      screen.getByRole('link', { name: 'Abos, accueil' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Abonnements' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', {
        level: 2,
        name: 'Aucun abonnement enregistré',
      }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Nombre d'abonnements")).toHaveTextContent(
      '0 abonnement',
    )
    expect(
      screen.getByText('Vos abonnements apparaîtront ici.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Statut global de synchronisation' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Synchroniser maintenant' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'Diagnostic' }),
    ).toBeInTheDocument()
  })
})
