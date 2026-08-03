import { beforeEach, describe, expect, it, vi } from 'vitest'
import { DEXIE_CLOUD_URL_STORAGE_KEY } from './config/dexieCloudConfiguration'
import { selectBootstrapTarget } from './bootstrap'

describe('bootstrap applicatif', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('ne charge pas l’application lorsque la configuration est absente', async () => {
    const loader = vi.fn(async () => ({ loaded: true }))

    const target = await selectBootstrapTarget(loader)

    expect(target).toEqual({ mode: 'configuration' })
    expect(loader).not.toHaveBeenCalled()
  })

  it('charge l’application uniquement après une configuration valide', async () => {
    window.localStorage.setItem(
      DEXIE_CLOUD_URL_STORAGE_KEY,
      'https://utilisateur.dexie.cloud',
    )
    const application = { loaded: true }
    const loader = vi.fn(async () => application)

    const target = await selectBootstrapTarget(loader)

    expect(target).toEqual({
      mode: 'application',
      cloudUrl: 'https://utilisateur.dexie.cloud',
      application,
    })
    expect(loader).toHaveBeenCalledTimes(1)
  })
})
