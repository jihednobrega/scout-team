// DELETE /api/matches/cleanup?teamId=... — Remove partidas em andamento (sessões abandonadas)
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    const where = teamId
      ? { teamId, status: 'in_progress' }
      : { status: 'in_progress' }

    const { count } = await prisma.match.deleteMany({ where })

    return NextResponse.json({ deleted: count })
  } catch (error) {
    console.error('Erro ao limpar partidas incompletas:', error)
    return NextResponse.json({ error: 'Erro ao limpar partidas incompletas' }, { status: 500 })
  }
}
