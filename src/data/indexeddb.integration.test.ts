import { afterEach, describe, expect, it, vi } from 'vitest'
import { SubscriptionDatabase } from './db'
import { saveLocalDraft } from './localDrafts'

const createdDbNames: string[] = []

afterEach(async () => {
  vi.restoreAllMocks()

  while (createdDbNames.length > 0) {
    const name = createdDbNames.pop()
    if (name) {
      await indexedDB.deleteDatabase(name)
    }
  }
})

describe('IndexedDB integration', () => {
  it('ouvre la base, écrit localement et conserve les données après réouverture', async () => {
    const dbName = `integration-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    const db1 = new SubscriptionDatabase({
      name: dbName,
      skipCloud: true,
    })

    await db1.open()
    await saveLocalDraft({ key: 'draft-a', value: 'contenu local' }, db1)
    db1.close()

    const db2 = new SubscriptionDatabase({
      name: dbName,
      skipCloud: true,
    })

    await db2.open()
    const draft = await db2.localSettings.get('draft-a')

    expect(draft?.value).toBe('contenu local')
    db2.close()
  })

  it("enregistre une écriture locale même quand l'appareil est hors ligne", async () => {
    const dbName = `offline-db-${crypto.randomUUID()}`
    createdDbNames.push(dbName)

    vi.spyOn(navigator, 'onLine', 'get').mockReturnValue(false)

    const db = new SubscriptionDatabase({
      name: dbName,
      skipCloud: true,
    })

    await db.open()
    await saveLocalDraft({ key: 'offline-draft', value: 'ok-hors-ligne' }, db)

    const draft = await db.localSettings.get('offline-draft')
    expect(draft?.value).toBe('ok-hors-ligne')

    db.close()
  })
})
