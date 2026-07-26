import type { SyncState } from 'dexie-cloud-addon'

export type AppSyncStatus =
  | 'initialisation'
  | 'synchronise'
  | 'en-attente'
  | 'synchronisation-en-cours'
  | 'hors-connexion'
  | 'erreur'

export function mapSyncStateToAppStatus(syncState: SyncState): AppSyncStatus {
  if (syncState.phase === 'error' || syncState.status === 'error') {
    return 'erreur'
  }

  if (syncState.phase === 'offline' || syncState.status === 'offline') {
    return 'hors-connexion'
  }

  if (
    syncState.phase === 'pushing' ||
    syncState.phase === 'pulling' ||
    syncState.status === 'connecting'
  ) {
    return 'synchronisation-en-cours'
  }

  if (syncState.phase === 'not-in-sync' || syncState.status === 'disconnected') {
    return 'en-attente'
  }

  if (syncState.phase === 'in-sync' && syncState.status === 'connected') {
    return 'synchronise'
  }

  return 'initialisation'
}

export function getSyncStatusLabel(status: AppSyncStatus): string {
  switch (status) {
    case 'synchronise':
      return 'Données synchronisées'
    case 'en-attente':
      return 'Modifications enregistrées sur cet appareil'
    case 'synchronisation-en-cours':
      return 'Synchronisation en cours'
    case 'hors-connexion':
      return 'Hors connexion'
    case 'erreur':
      return 'Synchronisation impossible'
    case 'initialisation':
    default:
      return 'Initialisation locale'
  }
}
