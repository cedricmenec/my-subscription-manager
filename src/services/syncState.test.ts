import { describe, expect, it } from 'vitest'
import type { SyncState } from 'dexie-cloud-addon'
import { getSyncStatusLabel, mapSyncStateToAppStatus } from './syncState'

function makeSyncState(partial: Partial<SyncState>): SyncState {
  return {
    status: 'not-started',
    phase: 'initial',
    ...partial,
  }
}

describe('mapSyncStateToAppStatus', () => {
  it('mappe une synchronisation connectée et en phase in-sync', () => {
    const state = makeSyncState({ status: 'connected', phase: 'in-sync' })
    expect(mapSyncStateToAppStatus(state)).toBe('synchronise')
  })

  it('mappe un état non synchronisé en attente', () => {
    const state = makeSyncState({ status: 'disconnected', phase: 'not-in-sync' })
    expect(mapSyncStateToAppStatus(state)).toBe('en-attente')
  })

  it('mappe les erreurs et hors-ligne', () => {
    expect(
      mapSyncStateToAppStatus(makeSyncState({ status: 'error', phase: 'error' })),
    ).toBe('erreur')
    expect(
      mapSyncStateToAppStatus(makeSyncState({ status: 'offline', phase: 'offline' })),
    ).toBe('hors-connexion')
  })
})

describe('getSyncStatusLabel', () => {
  it('retourne un libellé français lisible', () => {
    expect(getSyncStatusLabel('synchronise')).toBe('Données synchronisées')
  })
})
