import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl

  // Deixa passar: login e APIs do portal
  if (
    pathname === '/portal/login' ||
    pathname.startsWith('/api/portal/')
  ) {
    return NextResponse.next()
  }

  // Verifica cookie de sessão para qualquer outra rota /portal/*
  const session = request.cookies.get('portal_session')?.value

  if (!session) {
    const loginUrl = new URL('/portal/login', request.url)
    return NextResponse.redirect(loginUrl)
  }

  try {
    const data = JSON.parse(Buffer.from(session, 'base64').toString('utf-8'))
    if (!data.role || !data.teamId) throw new Error('invalid')
  } catch {
    const loginUrl = new URL('/portal/login', request.url)
    const response = NextResponse.redirect(loginUrl)
    response.cookies.delete('portal_session')
    return response
  }

  return NextResponse.next()
}

export const config = {
  matcher: ['/portal/:path*'],
}
