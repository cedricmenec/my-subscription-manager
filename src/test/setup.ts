import '@testing-library/jest-dom/vitest'
import 'fake-indexeddb/auto'
import { DEXIE_CLOUD_URL_STORAGE_KEY } from '../config/dexieCloudConfiguration'

window.localStorage.setItem(
  DEXIE_CLOUD_URL_STORAGE_KEY,
  'https://tests.dexie.cloud',
)
