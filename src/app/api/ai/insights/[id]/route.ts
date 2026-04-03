/**
 * DELETE /api/ai/insights/[id]
 *
 * Remove um insight específico do cache.
 */

import { NextRequest, NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _request: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params

    if (!id) {
      return NextResponse.json({ error: 'ID obrigatório' }, { status: 400 })
    }

    await prisma.aIInsight.delete({ where: { id } })

    return NextResponse.json({ deleted: true })
  } catch (err: any) {
    if (err.code === 'P2025') {
      return NextResponse.json({ error: 'Insight não encontrado' }, { status: 404 })
    }
    console.error('[AI Insights DELETE Error]', err)
    return NextResponse.json({ error: err.message || 'Erro ao deletar insight' }, { status: 500 })
  }
}
