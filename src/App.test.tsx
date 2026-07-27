import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('affiche la vue initiale des abonnements en français', () => {
    // Réinitialiser le hash pour que la page d'accueil soit affichée
    window.location.hash = ''

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
        name: 'Liste des abonnements',
      }),
    ).toBeInTheDocument()
    expect(screen.getByLabelText("Nombre d'abonnements")).toHaveTextContent(
      '0 abonnement',
    )
    expect(
      screen.getByText('Aucun abonnement ne correspond aux filtres.'),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Statut global de synchronisation' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Synchroniser maintenant' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: 'À compléter' }),
    ).toBeInTheDocument()
  })

  it('affiche les boutons de navigation dans la barre supérieure', () => {
    window.location.hash = ''

    render(<App />)

    expect(
      screen.getByRole('button', { name: 'Abonnements' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Configuration' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Ouvrir le diagnostic' }),
    ).toBeInTheDocument()
  })
})
