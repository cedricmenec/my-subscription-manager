import { getConfiguredDexieCloudUrl } from './config/dexieCloudConfiguration'

export type BootstrapTarget<T> =
  | { mode: 'configuration' }
  | { mode: 'application'; cloudUrl: string; application: T }

export async function selectBootstrapTarget<T>(
  loadApplication: () => Promise<T>,
  storage?: Storage,
): Promise<BootstrapTarget<T>> {
  const cloudUrl = getConfiguredDexieCloudUrl(storage)
  if (!cloudUrl) {
    return { mode: 'configuration' }
  }

  return {
    mode: 'application',
    cloudUrl,
    application: await loadApplication(),
  }
}
