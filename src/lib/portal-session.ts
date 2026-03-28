import { cookies } from 'next/headers'

export type PortalRole = 'coach' | 'athlete'

export interface PortalSession {
  code: string
  name: string
  role: PortalRole
  teamId: string
  playerId?: string  // apenas para athletes
}

/**
 * Lê e decodifica a sessão do portal a partir do cookie HttpOnly.
 * Retorna null se não existir ou for inválida.
 */
export async function getPortalSession(): Promise<PortalSession | null> {
  try {
    const cookieStore = await cookies()
    const raw = cookieStore.get('portal_session')?.value
    if (!raw) return null
    const data = JSON.parse(Buffer.from(raw, 'base64').toString('utf-8'))
    if (!data.role || !data.teamId) return null
    return data as PortalSession
  } catch {
    return null
  }
}

/** Codifica a sessão para armazenar no cookie */
export function encodeSession(session: PortalSession): string {
  return Buffer.from(JSON.stringify(session)).toString('base64')
}
