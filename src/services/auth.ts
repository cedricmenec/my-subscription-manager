import { db } from '../data/db'

export interface ConnectedIdentity {
  userId?: string
  email?: string
  name?: string
  isLoggedIn: boolean
}

export function getConnectedIdentity(): ConnectedIdentity {
  const currentUser = db.cloud.currentUser.getValue()
  return {
    userId: currentUser.userId,
    email: currentUser.email,
    name: currentUser.name,
    isLoggedIn: Boolean(currentUser.isLoggedIn),
  }
}

export async function loginWithEmailOtp(email: string): Promise<void> {
  await db.cloud.login({ email, grant_type: 'otp', intent: 'login' })
}

export async function logout(): Promise<void> {
  await db.cloud.logout()
}

export async function purgeLocalData(): Promise<void> {
  await db.delete()
  await db.open()
}
