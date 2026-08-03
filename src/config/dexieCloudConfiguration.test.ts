import Dexie from 'dexie'
import { beforeEach, describe, expect, it } from 'vitest'
import {
  DEXIE_CLOUD_URL_STORAGE_KEY,
  getConfiguredDexieCloudUrl,
  normalizeDexieCloudUrl,
  saveDexieCloudUrl,
} from './dexieCloudConfiguration'

describe('configuration Dexie Cloud locale', () => {
  beforeEach(() => {
    window.localStorage.clear()
  })

  it('normalise et persiste une URL Dexie Cloud HTTPS', () => {
    const normalized = saveDexieCloudUrl('  https://Ma-Base.dexie.cloud/  ')

    expect(normalized).toBe('https://ma-base.dexie.cloud')
    expect(getConfiguredDexieCloudUrl()).toBe(normalized)
    expect(window.localStorage.getItem(DEXIE_CLOUD_URL_STORAGE_KEY)).toBe(normalized)
  })

  it.each([
    '',
    'http://ma-base.dexie.cloud',
    'https://user:secret@ma-base.dexie.cloud',
    'https://ma-base.dexie.cloud/path',
    'https://ma-base.dexie.cloud?token=secret',
    'https://example.com',
  ])('refuse une valeur invalide sans remplacer la configuration existante : %s', value => {
    window.localStorage.setItem(
      DEXIE_CLOUD_URL_STORAGE_KEY,
      'https://base-existante.dexie.cloud',
    )

    expect(() => saveDexieCloudUrl(value)).toThrow()
    expect(getConfiguredDexieCloudUrl()).toBe('https://base-existante.dexie.cloud')
  })

  it('considère une configuration locale corrompue comme absente', () => {
    window.localStorage.setItem(DEXIE_CLOUD_URL_STORAGE_KEY, 'javascript:alert(1)')

    expect(getConfiguredDexieCloudUrl()).toBeNull()
  })

  it('ne supprime aucune IndexedDB lors du changement d’URL', async () => {
    const databaseName = `base-historique-${crypto.randomUUID()}`
    const historicalDb = new Dexie(databaseName)
    historicalDb.version(1).stores({ markers: '&id' })
    await historicalDb.table('markers').put({ id: 'preserved' })
    historicalDb.close()

    saveDexieCloudUrl('https://premiere.dexie.cloud')
    saveDexieCloudUrl('https://seconde.dexie.cloud')

    const reopenedDb = new Dexie(databaseName)
    reopenedDb.version(1).stores({ markers: '&id' })
    expect(await reopenedDb.table('markers').get('preserved')).toEqual({ id: 'preserved' })
    reopenedDb.close()
    await Dexie.delete(databaseName)
  })

  it('normalise la même URL vers une identité stable', () => {
    expect(normalizeDexieCloudUrl('https://stable.dexie.cloud/')).toBe(
      normalizeDexieCloudUrl(' https://STABLE.dexie.cloud '),
    )
  })
})
