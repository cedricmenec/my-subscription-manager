import { render, screen } from '@testing-library/react'
import { describe, expect, it } from 'vitest'
import App from './App'

describe('App', () => {
  it('affiche le tableau de bord comme page d\'accueil', () => {
    // Réinitialiser le hash pour que la page d'accueil soit affichée
    window.location.hash = ''

    render(<App />)

    expect(
      screen.getByRole('link', { name: 'Abos, accueil' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 1, name: 'Pilotage' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('region', { name: 'Statut global de synchronisation' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Synchroniser maintenant' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: '⏰ Prochaines échéances' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('heading', { level: 2, name: '⚠️ Abonnements à compléter' }),
    ).toBeInTheDocument()
  })

  it('affiche les boutons de navigation dans la barre supérieure', () => {
    window.location.hash = ''

    render(<App />)

    expect(
      screen.getByRole('button', { name: '📊 Tableau de bord' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '📋 Abonnements' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '💳 Paiements' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '⚙️ Configuration' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: '📦 Données' }),
    ).toBeInTheDocument()
    expect(
      screen.getByRole('button', { name: 'Ouvrir le diagnostic' }),
    ).toBeInTheDocument()
  })

  it('reconnaît une URL directe de fiche abonnement', () => {
    window.location.hash = '#/subscriptions/sbs-introuvable'

    render(<App />)

    expect(
      screen.getByRole('heading', { level: 1, name: 'Chargement de l’abonnement…' }),
    ).toBeInTheDocument()
    expect(window.location.hash).toBe('#/subscriptions/sbs-introuvable')
  })
})
