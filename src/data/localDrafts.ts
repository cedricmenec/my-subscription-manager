import { db, type SubscriptionDatabase } from './db'

export interface LocalDraft {
  key: string
  value: string
}

export async function saveLocalDraft(
  draft: LocalDraft,
  database: SubscriptionDatabase = db,
): Promise<void> {
  await database.localSettings.put({
    key: draft.key,
    value: draft.value,
    updatedAt: new Date(),
  })
}
