export const DEXIE_CLOUD_URL_STORAGE_KEY = 'abos.dexieCloudUrl.v1'

export class DexieCloudUrlValidationError extends Error {
  constructor(message: string) {
    super(message)
    this.name = 'DexieCloudUrlValidationError'
  }
}

function getBrowserStorage(): Storage | undefined {
  return typeof window === 'undefined' ? undefined : window.localStorage
}

export function normalizeDexieCloudUrl(value: string): string {
  const trimmed = value.trim()
  if (!trimmed) {
    throw new DexieCloudUrlValidationError('Saisissez l’URL de votre base Dexie Cloud.')
  }

  let parsed: URL
  try {
    parsed = new URL(trimmed)
  } catch {
    throw new DexieCloudUrlValidationError('L’URL Dexie Cloud n’est pas valide.')
  }

  if (parsed.protocol !== 'https:') {
    throw new DexieCloudUrlValidationError('L’URL Dexie Cloud doit utiliser HTTPS.')
  }

  if (parsed.username || parsed.password) {
    throw new DexieCloudUrlValidationError('L’URL ne doit contenir aucun identifiant ni mot de passe.')
  }

  if (parsed.search || parsed.hash || (parsed.pathname !== '/' && parsed.pathname !== '')) {
    throw new DexieCloudUrlValidationError('Saisissez uniquement l’origine de la base, sans chemin, paramètres ni fragment.')
  }

  if (parsed.port || !parsed.hostname.endsWith('.dexie.cloud')) {
    throw new DexieCloudUrlValidationError('L’URL doit correspondre à une base hébergée sur dexie.cloud.')
  }

  return parsed.origin
}

export function getConfiguredDexieCloudUrl(
  storage: Storage | undefined = getBrowserStorage(),
): string | null {
  const storedValue = storage?.getItem(DEXIE_CLOUD_URL_STORAGE_KEY)
  if (!storedValue) return null

  try {
    return normalizeDexieCloudUrl(storedValue)
  } catch {
    return null
  }
}

export function saveDexieCloudUrl(
  value: string,
  storage: Storage | undefined = getBrowserStorage(),
): string {
  const normalized = normalizeDexieCloudUrl(value)
  if (!storage) {
    throw new Error('Le stockage local du navigateur est indisponible.')
  }

  storage.setItem(DEXIE_CLOUD_URL_STORAGE_KEY, normalized)
  return normalized
}
