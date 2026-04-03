// app/api/statistics/route.ts
// Retorna estatísticas agregadas da equipe baseadas em dados REAIS do banco
import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const teamId = searchParams.get('teamId')

    if (!teamId) {
      return NextResponse.json({ error: 'teamId é obrigatório' }, { status: 400 })
    }

    // Buscar todas as partidas finalizadas da equipe
    const matches = await prisma.match.findMany({
      where: { teamId, status: 'finalized' },
      include: {
        actions: {
          select: {
            id: true,
            playerId: true,
            action: true,
            subAction: true,
            zone: true,
            setNumber: true,
            efficiencyValue: true,
            phase: true,
            fullData: true,
          },
        },
      },
      orderBy: { date: 'desc' },
    })

    // Buscar jogadores da equipe
    const players = await prisma.player.findMany({
      where: { teamId },
      select: { id: true, name: true, jerseyNumber: true, position: true },
    })

    // Agregar estatísticas por jogador
    const playerStatsMap = new Map<string, {
      playerId: string
      playerName: string
      jerseyNumber: number
      position: string
      totalActions: number
      serves: { total: number; aces: number; errors: number }
      attacks: { total: number; kills: number; errors: number; blocked: number }
      blocks: { total: number; kills: number; touches: number }
      receptions: { total: number; perfect: number; good: number; poor: number; errors: number }
      sets: { total: number; assists: number }
      digs: { total: number; successful: number; errors: number }
    }>()

    // Inicializar todos os jogadores
    for (const p of players) {
      playerStatsMap.set(p.id, {
        playerId: p.id,
        playerName: p.name,
        jerseyNumber: p.jerseyNumber,
        position: p.position,
        totalActions: 0,
        serves: { total: 0, aces: 0, errors: 0 },
        attacks: { total: 0, kills: 0, errors: 0, blocked: 0 },
        blocks: { total: 0, kills: 0, touches: 0 },
        receptions: { total: 0, perfect: 0, good: 0, poor: 0, errors: 0 },
        sets: { total: 0, assists: 0 },
        digs: { total: 0, successful: 0, errors: 0 },
      })
    }

    // Contadores globais
    let totalActions = 0
    let sideOutOpp = 0
    let sideOutWon = 0
    let breakOpp = 0
    let breakWon = 0

    // Processar cada partida e suas ações
    for (const match of matches) {
      for (const action of match.actions) {
        if (!action.playerId) continue // ações adversárias

        const stat = playerStatsMap.get(action.playerId)
        if (!stat) continue

        stat.totalActions++
        totalActions++

        switch (action.action) {
          case 'serve':
            stat.serves.total++
            if (action.subAction === 'ace') stat.serves.aces++
            if (action.subAction === 'error') stat.serves.errors++
            break
          case 'attack':
            stat.attacks.total++
            if (['kill', 'tip', 'block_out'].includes(action.subAction)) stat.attacks.kills++
            if (action.subAction === 'error') stat.attacks.errors++
            if (action.subAction === 'blocked') stat.attacks.blocked++
            break
          case 'block':
            stat.blocks.total++
            if (['kill_block', 'point'].includes(action.subAction)) stat.blocks.kills++
            if (action.subAction === 'touch') stat.blocks.touches++
            break
          case 'reception':
            stat.receptions.total++
            if (['perfect', 'excellent'].includes(action.subAction)) stat.receptions.perfect++
            if (['positive', 'good'].includes(action.subAction)) stat.receptions.good++
            if (['negative', 'poor'].includes(action.subAction)) stat.receptions.poor++
            if (action.subAction === 'error') stat.receptions.errors++
            break
          case 'set':
            stat.sets.total++
            if (['perfect', 'positive'].includes(action.subAction)) stat.sets.assists++
            break
          case 'dig':
            stat.digs.total++
            if (['perfect', 'excellent', 'positive', 'good'].includes(action.subAction)) stat.digs.successful++
            if (action.subAction === 'error') stat.digs.errors++
            break
        }

        // Dados de fase (side-out vs transition)
        if (action.phase === 'sideout') {
          sideOutOpp++
          if (action.efficiencyValue !== null && action.efficiencyValue > 0) sideOutWon++
        } else if (action.phase === 'transition') {
          breakOpp++
          if (action.efficiencyValue !== null && action.efficiencyValue > 0) breakWon++
        }
      }
    }

    // Calcular eficiências
    const playerStats = Array.from(playerStatsMap.values()).map(p => ({
      ...p,
      serves: {
        ...p.serves,
        efficiency: p.serves.total > 0 ? ((p.serves.aces - p.serves.errors) / p.serves.total) * 100 : 0,
      },
      attacks: {
        ...p.attacks,
        efficiency: p.attacks.total > 0 ? ((p.attacks.kills - p.attacks.errors - p.attacks.blocked) / p.attacks.total) * 100 : 0,
      },
      blocks: {
        ...p.blocks,
        efficiency: p.blocks.total > 0 ? (p.blocks.kills / p.blocks.total) * 100 : 0,
      },
      receptions: {
        ...p.receptions,
        efficiency: p.receptions.total > 0 ? ((p.receptions.perfect + p.receptions.good) / p.receptions.total) * 100 : 0,
      },
      sets: {
        ...p.sets,
        efficiency: p.sets.total > 0 ? (p.sets.assists / p.sets.total) * 100 : 0,
      },
      digs: {
        ...p.digs,
        efficiency: p.digs.total > 0 ? (p.digs.successful / p.digs.total) * 100 : 0,
      },
    })).filter(p => p.totalActions > 0).sort((a, b) => b.totalActions - a.totalActions)

    // Estatísticas de ataque por posição (sem Levantador e Líbero)
    const attackByPosition: Record<string, { kills: number; errors: number; blocked: number; total: number }> = {}
    for (const stat of playerStats) {
      const pos = stat.position.toLowerCase()
      let group = 'Outros'
      if (pos.includes('ponteiro')) group = 'Ponteiros'
      else if (pos.includes('oposto')) group = 'Oposto'
      else if (pos.includes('central')) group = 'Centrais'
      else if (pos.includes('levantador') || pos.includes('libero')) continue

      if (!attackByPosition[group]) attackByPosition[group] = { kills: 0, errors: 0, blocked: 0, total: 0 }
      attackByPosition[group].kills += stat.attacks.kills
      attackByPosition[group].errors += stat.attacks.errors
      attackByPosition[group].blocked += stat.attacks.blocked
      attackByPosition[group].total += stat.attacks.total
    }

    // Estatísticas de recepção por posição (apenas Ponteiros e Líbero — linha de passe)
    const receptionByPosition: Record<string, { perfect: number; good: number; poor: number; errors: number; total: number }> = {}
    for (const stat of playerStats) {
      const pos = stat.position.toLowerCase()
      let group: string | null = null
      if (pos.includes('ponteiro')) group = 'Ponteiros'
      else if (pos.includes('libero')) group = 'Líbero'
      if (!group) continue

      if (!receptionByPosition[group]) receptionByPosition[group] = { perfect: 0, good: 0, poor: 0, errors: 0, total: 0 }
      receptionByPosition[group].perfect += stat.receptions.perfect
      receptionByPosition[group].good += stat.receptions.good
      receptionByPosition[group].poor += stat.receptions.poor
      receptionByPosition[group].errors += stat.receptions.errors
      receptionByPosition[group].total += stat.receptions.total
    }

    // Distribuição de ataques por zona (alinhado com setterDistribution.ts)
    // Zona 4 = Ponteiros, Zona 2 = Oposto, Zona 3 = Centrais, Zonas 1/5/6 = Pipe (excluído do pie)
    const setterDistribution: Record<string, number> = {}
    for (const match of matches) {
      const hasSetZones = match.actions.some(a => a.action === 'set' && a.zone != null)
      for (const action of match.actions) {
        // Usar zona do SET como fonte primária; fallback para zona do ataque
        if (hasSetZones ? action.action !== 'set' : action.action !== 'attack') continue
        if (action.zone == null) continue
        const z = action.zone > 10 ? action.zone - 10 : action.zone // normalizar zonas adversárias
        let group: string | null = null
        if (z === 4) group = 'Ponteiros'
        else if (z === 2) group = 'Oposto'
        else if (z === 3) group = 'Centrais'
        if (!group) continue // zonas 1/5/6 = pipe, excluído do pie
        setterDistribution[group] = (setterDistribution[group] || 0) + 1
      }
    }

    // Pipe: ataques de back-row (zonas 1, 5, 6)
    // Prioridade: zona do SET (destino registrado pelo operador), fallback: zona do ataque
    // Mesma lógica de setterDistribution.ts (zoneToDestination + prioridade SET > ATTACK)
    const BACK_ROW_ZONES = new Set([1, 5, 6])
    let pipeAttacks = 0
    for (const match of matches) {
      const hasSetActions = match.actions.some(a => a.action === 'set' && a.zone != null)
      for (const action of match.actions) {
        if (action.zone == null || !BACK_ROW_ZONES.has(action.zone)) continue
        if (hasSetActions ? action.action === 'set' : action.action === 'attack') {
          pipeAttacks++
        }
      }
    }

    // Estatísticas por rotação (extraindo do fullData de cada ação)
    const rotMap = new Map<number, {
      total: number; won: number; soOpp: number; soWon: number; bpOpp: number; bpWon: number
      atkTotal: number; atkKills: number; atkErrors: number; atkBlocked: number
      recTotal: number; recGood: number; recErrors: number
    }>()
    for (let i = 1; i <= 6; i++) {
      rotMap.set(i, { total: 0, won: 0, soOpp: 0, soWon: 0, bpOpp: 0, bpWon: 0, atkTotal: 0, atkKills: 0, atkErrors: 0, atkBlocked: 0, recTotal: 0, recGood: 0, recErrors: 0 })
    }

    // Agrupar ações por rally para determinar resultado por rotação
    // Cada ação com fullData pode ter: rotation, phase, servingTeam, rallyResult
    for (const match of matches) {
      // Agrupar ações por rallyId para evitar contar múltiplas vezes o mesmo rally
      const ralliesSeen = new Set<string>()

      for (const action of match.actions) {
        if (!action.fullData) continue
        try {
          const full = JSON.parse(action.fullData as string)
          const rotation = full.rotation as number
          if (!rotation || rotation < 1 || rotation > 6) continue

          // Usar rallyId para não contar o mesmo rally mais de uma vez
          const rallyKey = full.rallyId || action.id
          if (ralliesSeen.has(rallyKey)) continue

          // Só processar ações que marcam fim de rally (ponto)
          // Identificar pelos subActions que geram ponto
          const isPointAction = ['ace', 'kill', 'kill_block', 'point'].includes(action.subAction)
            || action.subAction === 'error'
            || action.action === 'opponent_error'

          if (!isPointAction) continue
          ralliesSeen.add(rallyKey)

          const stat = rotMap.get(rotation)!
          stat.total++

          // Determinar se nosso time ganhou o ponto
          const weScored = (action.action === 'opponent_error')
            || (['ace', 'kill', 'kill_block', 'point'].includes(action.subAction) && action.playerId !== null)

          if (weScored) stat.won++

          // Side-out vs Break-point
          const servingTeam = full.servingTeam as string | undefined
          if (servingTeam === 'away') {
            // Nós recebendo = oportunidade de side-out
            stat.soOpp++
            if (weScored) stat.soWon++
          } else if (servingTeam === 'home') {
            // Nós sacando = oportunidade de break-point
            stat.bpOpp++
            if (weScored) stat.bpWon++
          }
        } catch { /* fullData inválido, ignorar */ }
      }
    }

    // Segunda passagem: ataque e recepção por rotação (todas as ações, não só fim de rally)
    for (const match of matches) {
      for (const action of match.actions) {
        if (!action.fullData || !action.playerId) continue
        try {
          const full = JSON.parse(action.fullData as string)
          const rotation = full.rotation as number
          if (!rotation || rotation < 1 || rotation > 6) continue
          const stat = rotMap.get(rotation)!

          if (action.action === 'attack') {
            stat.atkTotal++
            if (action.subAction === 'kill' || action.subAction === 'tip' || action.subAction === 'block_out') stat.atkKills++
            if (action.subAction === 'error') stat.atkErrors++
            if (action.subAction === 'blocked') stat.atkBlocked++
          } else if (action.action === 'reception') {
            stat.recTotal++
            if (['perfect', 'positive'].includes(action.subAction)) stat.recGood++
            if (action.subAction === 'error') stat.recErrors++
          }
        } catch { /* ignorar */ }
      }
    }

    const rotationStats = Array.from(rotMap.entries()).map(([rot, d]) => ({
      rotation: rot,
      totalPoints: d.total,
      pointsWon: d.won,
      pointsLost: d.total - d.won,
      winRate: d.total > 0 ? (d.won / d.total) * 100 : 0,
      sideOutEfficiency: d.soOpp > 0 ? (d.soWon / d.soOpp) * 100 : 0,
      breakPointEfficiency: d.bpOpp > 0 ? (d.bpWon / d.bpOpp) * 100 : 0,
      attackEfficiency: d.atkTotal > 0 ? ((d.atkKills - d.atkErrors - d.atkBlocked) / d.atkTotal * 100) : 0,
      receptionEfficiency: d.recTotal > 0 ? (d.recGood / d.recTotal * 100) : 0,
      atkTotal: d.atkTotal,
      recTotal: d.recTotal,
    }))

    // Resumo das partidas
    const matchSummaries = matches.map(m => ({
      id: m.id,
      opponent: m.opponent,
      date: m.date,
      result: m.result,
      finalScore: m.finalScore,
      actionsCount: m.actions.length,
    }))

    // KPIs totais
    const totalKills = playerStats.reduce((acc, p) => acc + p.attacks.kills, 0)
    const totalAttacks = playerStats.reduce((acc, p) => acc + p.attacks.total, 0)
    const totalAces = playerStats.reduce((acc, p) => acc + p.serves.aces, 0)
    const totalServes = playerStats.reduce((acc, p) => acc + p.serves.total, 0)
    const totalBlockKills = playerStats.reduce((acc, p) => acc + p.blocks.kills, 0)
    // Recepção: apenas ponteiros e líberos (linha de passe)
    const passLineStats = playerStats.filter(p => {
      const pos = p.position.toLowerCase()
      return pos.includes('ponteiro') || pos.includes('libero')
    })
    const totalReceptions = passLineStats.reduce((acc, p) => acc + p.receptions.total, 0)
    const totalGoodReceptions = passLineStats.reduce((acc, p) => acc + p.receptions.perfect + p.receptions.good, 0)

    return NextResponse.json({
      kpis: {
        matchesPlayed: matches.length,
        wins: matches.filter(m => m.result === 'vitoria').length,
        losses: matches.filter(m => m.result === 'derrota').length,
        totalActions,
        attackEfficiency: totalAttacks > 0 ? ((totalKills - playerStats.reduce((a, p) => a + p.attacks.errors + p.attacks.blocked, 0)) / totalAttacks * 100) : 0,
        killPercentage: totalAttacks > 0 ? (totalKills / totalAttacks * 100) : 0,
        acePercentage: totalServes > 0 ? (totalAces / totalServes * 100) : 0,
        receptionEfficiency: totalReceptions > 0 ? (totalGoodReceptions / totalReceptions * 100) : 0,
        blockKillsPerMatch: matches.length > 0 ? totalBlockKills / matches.length : 0,
        totalPoints: totalKills + totalBlockKills + totalAces,
      },
      playerStats,
      attackByPosition: Object.entries(attackByPosition).map(([label, data]) => ({
        label,
        value: data.total > 0 ? parseFloat(((data.kills - data.errors - data.blocked) / data.total * 100).toFixed(1)) : 0,
        kills: data.kills,
        errors: data.errors,
        blocked: data.blocked,
        total: data.total,
      })),
      receptionByPosition: Object.entries(receptionByPosition).map(([label, data]) => ({
        label,
        efficiency: data.total > 0 ? parseFloat(((data.perfect + data.good) / data.total * 100).toFixed(1)) : 0,
        perfect: data.perfect,
        good: data.good,
        poor: data.poor,
        errors: data.errors,
        total: data.total,
      })),
      setterDistribution: Object.entries(setterDistribution).map(([label, value]) => ({ label, value })),
      pipeAttacks,
      rotationStats,
      matches: matchSummaries,
    })
  } catch (error) {
    console.error('Erro ao calcular estatísticas:', error)
    return NextResponse.json({ error: 'Erro ao calcular estatísticas' }, { status: 500 })
  }
}
