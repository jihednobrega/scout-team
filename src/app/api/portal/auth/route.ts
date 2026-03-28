import { NextRequest, NextResponse } from 'next/server'
import { readFileSync } from 'fs'
import { join } from 'path'
import { encodeSession, PortalSession } from '@/lib/portal-session'

interface UserEntry {
  code: string
  name: string
  role: 'coach' | 'athlete'
  teamId: string
  playerId?: string
}

function loadUsers(): UserEntry[] {
  // Em produção: lê do env var PORTAL_USERS (JSON string)
  // Em dev local: lê do arquivo users.private.json
  const fromEnv = process.env.PORTAL_USERS
  if (fromEnv) {
    try {
      return JSON.parse(fromEnv) as UserEntry[]
    } catch {
      return []
    }
  }
  try {
    const filePath = join(process.cwd(), 'users.private.json')
    const content = readFileSync(filePath, 'utf-8')
    return JSON.parse(content) as UserEntry[]
  } catch {
    return []
  }
}

export async function POST(request: NextRequest) {
  const { code } = await request.json() as { code: string }

  if (!code?.trim()) {
    return NextResponse.json({ error: 'Código inválido' }, { status: 400 })
  }

  const users = loadUsers()
  const user = users.find((u) => u.code.toLowerCase() === code.trim().toLowerCase())

  if (!user) {
    return NextResponse.json({ error: 'Código não encontrado' }, { status: 401 })
  }

  const session: PortalSession = {
    code: user.code,
    name: user.name,
    role: user.role,
    teamId: user.teamId,
    playerId: user.playerId,
  }

  const response = NextResponse.json({
    success: true,
    role: user.role,
    name: user.name,
  })

  response.cookies.set('portal_session', encodeSession(session), {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 60 * 60 * 24 * 30, // 30 dias
    path: '/',
  })

  return response
}
