import { fireEvent, render, screen } from '@testing-library/react'
import { describe, expect, it, vi } from 'vitest'
import DexieCloudSetupPage from './DexieCloudSetupPage'

describe('DexieCloudSetupPage', () => {
  it('explique la reprise de la base existante sans demander de secret', () => {
    render(<DexieCloudSetupPage onConfigured={vi.fn()} />)

    expect(screen.getByRole('heading', { name: 'Connecter votre base Dexie Cloud' })).toBeInTheDocument()
    expect(screen.getByText(/saisissez exactement la même URL/)).toBeInTheDocument()
    expect(screen.getByText(/Aucun fichier/)).toHaveTextContent('dexie-cloud.key')
    expect(screen.queryByLabelText(/secret/i)).not.toBeInTheDocument()
  })

  it('refuse une URL invalide et associe le message au champ', () => {
    const onConfigured = vi.fn()
    render(<DexieCloudSetupPage onConfigured={onConfigured} />)

    fireEvent.change(screen.getByLabelText('URL de la base Dexie Cloud'), {
      target: { value: 'http://invalide.dexie.cloud' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer et ouvrir Abos' }))

    expect(screen.getByRole('alert')).toHaveTextContent('doit utiliser HTTPS')
    expect(screen.getByLabelText('URL de la base Dexie Cloud')).toHaveAttribute('aria-invalid', 'true')
    expect(onConfigured).not.toHaveBeenCalled()
  })

  it('transmet une URL valide normalisée', () => {
    const onConfigured = vi.fn()
    render(<DexieCloudSetupPage onConfigured={onConfigured} />)

    fireEvent.change(screen.getByLabelText('URL de la base Dexie Cloud'), {
      target: { value: 'https://Ma-Base.dexie.cloud/' },
    })
    fireEvent.click(screen.getByRole('button', { name: 'Enregistrer et ouvrir Abos' }))

    expect(onConfigured).toHaveBeenCalledWith('https://ma-base.dexie.cloud')
  })
})
