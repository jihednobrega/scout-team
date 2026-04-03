// utils/analytics.ts
import { ScoutAction } from '@/types/scout'
import { GameMatch } from '@/types/game'
import {
  PlayerStatistics,
  ZoneStatistics,
  SetStatistics,
  HeatmapData,
  StatisticsFilters,
} from '@/types/statistics'

/**
 * Filtra ações baseado nos filtros aplicados
 */
export function filterActions(
  actions: ScoutAction[],
  filters: StatisticsFilters
): ScoutAction[] {
  return actions.filter((action) => {
    if (filters.playerId && action.player !== filters.playerId) return false
    if (filters.set && action.set !== filters.set) return false
    if (filters.action && action.action !== filters.action) return false
    if (filters.zone && action.zone !== filters.zone) return false
    return true
  })
}

/**
 * Calcula estatísticas por jogador
 */
export function calculatePlayerStatistics(
  actions: ScoutAction[],
  playerId: string,
  playerName: string,
  jerseyNumber: number
): PlayerStatistics {
  const playerActions = actions.filter((a) => a.player === playerId)

  // Saques
  const serves = playerActions.filter((a) => a.action === 'serve')
  const aces = serves.filter((a) => a.subAction === 'ace').length
  const serveErrors = serves.filter((a) => a.subAction === 'error').length
  const serveEfficiency =
    serves.length > 0 ? ((aces - serveErrors) / serves.length) * 100 : 0

  // Ataques
  const attacks = playerActions.filter((a) => a.action === 'attack')
  const kills = attacks.filter((a) => a.subAction === 'kill' || a.subAction === 'tip' || a.subAction === 'block_out').length
  const attackErrors = attacks.filter((a) => a.subAction === 'error').length
  const blocked = attacks.filter((a) => a.subAction === 'blocked').length
  const attackEfficiency =
    attacks.length > 0
      ? ((kills - attackErrors - blocked) / attacks.length) * 100
      : 0

  // Bloqueios
  const blocks = playerActions.filter((a) => a.action === 'block')
  const blockKills = blocks.filter((a) => a.subAction === 'kill_block' || a.subAction === 'point').length
  const blockTouches = blocks.filter((a) => a.subAction === 'touch').length
  const blockEfficiency =
    blocks.length > 0 ? (blockKills / blocks.length) * 100 : 0

  // Recepções
  const receptions = playerActions.filter((a) => a.action === 'reception')
  const perfect = receptions.filter((a) => a.subAction === 'perfect').length
  const good = receptions.filter((a) => a.subAction === 'good').length
  const poor = receptions.filter((a) => a.subAction === 'poor').length
  const receptionErrors = receptions.filter((a) => a.subAction === 'error').length
  const receptionEfficiency =
    receptions.length > 0 ? ((perfect + good) / receptions.length) * 100 : 0

  // Levantamentos
  const sets = playerActions.filter((a) => a.action === 'set')
  const assists = sets.filter((a) => a.subAction === 'assist').length
  const setEfficiency = sets.length > 0 ? (assists / sets.length) * 100 : 0

  // Defesas
  const digs = playerActions.filter((a) => a.action === 'dig')
  const successfulDigs = digs.filter((a) => a.subAction === 'successful').length
  const digErrors = digs.filter((a) => a.subAction === 'error').length
  const digEfficiency =
    digs.length > 0 ? (successfulDigs / digs.length) * 100 : 0

  return {
    playerId,
    playerName,
    jerseyNumber,
    totalActions: playerActions.length,
    serves: {
      total: serves.length,
      aces,
      errors: serveErrors,
      efficiency: serveEfficiency,
    },
    attacks: {
      total: attacks.length,
      kills,
      errors: attackErrors,
      blocked,
      efficiency: attackEfficiency,
    },
    blocks: {
      total: blocks.length,
      kills: blockKills,
      touches: blockTouches,
      efficiency: blockEfficiency,
    },
    receptions: {
      total: receptions.length,
      perfect,
      good,
      poor,
      errors: receptionErrors,
      efficiency: receptionEfficiency,
    },
    sets: {
      total: sets.length,
      assists,
      efficiency: setEfficiency,
    },
    digs: {
      total: digs.length,
      successful: successfulDigs,
      errors: digErrors,
      efficiency: digEfficiency,
    },
  }
}

/**
 * Calcula estatísticas por zona
 */
export function calculateZoneStatistics(
  actions: ScoutAction[]
): ZoneStatistics[] {
  const zoneMap = new Map<number, ScoutAction[]>()

  // Agrupa ações por zona
  actions.forEach((action) => {
    const z = action.zone ?? 0
    if (!zoneMap.has(z)) {
      zoneMap.set(z, [])
    }
    zoneMap.get(z)!.push(action)
  })

  // Calcula estatísticas por zona
  return Array.from(zoneMap.entries()).map(([zone, zoneActions]) => {
    const actionsByType: Record<string, number> = {}
    let successCount = 0
    let errorCount = 0

    zoneActions.forEach((action) => {
      // Conta por tipo
      actionsByType[action.action] = (actionsByType[action.action] || 0) + 1

      // Conta sucessos e erros
      if (
        ['ace', 'kill', 'perfect', 'good', 'successful', 'assist'].includes(
          action.subAction
        )
      ) {
        successCount++
      }
      if (action.subAction === 'error') {
        errorCount++
      }
    })

    return {
      zone,
      totalActions: zoneActions.length,
      actionsByType,
      successRate: (successCount / zoneActions.length) * 100,
      errorRate: (errorCount / zoneActions.length) * 100,
    }
  })
}

/**
 * Calcula estatísticas por set
 */
export function calculateSetStatistics(match: GameMatch): SetStatistics[] {
  return match.sets.map((set) => {
    const setActions = match.actions.filter((a) => a.set === set.number)

    // Agrupa ações por jogador
    const playerActionsMap = new Map<string, number>()
    setActions.forEach((action) => {
      playerActionsMap.set(
        action.player,
        (playerActionsMap.get(action.player) || 0) + 1
      )
    })

    // Top 3 jogadores do set
    const topPlayers = Array.from(playerActionsMap.entries())
      .sort((a, b) => b[1] - a[1])
      .slice(0, 3)
      .map(([playerId, actions]) => ({
        playerId,
        playerName: playerId, // TODO: pegar nome real do jogador
        actions,
      }))

    return {
      setNumber: set.number,
      totalActions: setActions.length,
      score: { home: set.homeScore, away: set.awayScore },
      duration: set.duration,
      topPlayers,
    }
  })
}

/**
 * Gera dados para heatmap da quadra
 */
export function generateHeatmapData(actions: ScoutAction[]): HeatmapData[] {
  const zoneStats = calculateZoneStatistics(actions)

  // Encontra o valor máximo para normalizar a intensidade
  const maxActions = Math.max(...zoneStats.map((z) => z.totalActions), 1)

  return zoneStats.map((stat) => {
    // Mapeia zona para coordenadas da quadra (simplificado)
    const zonePositions: Record<number, { x: number; y: number }> = {
      1: { x: 75, y: 75 }, // Posição 1 (fundo direita)
      2: { x: 75, y: 50 }, // Posição 2 (meio direita)
      3: { x: 75, y: 25 }, // Posição 3 (frente direita)
      4: { x: 25, y: 25 }, // Posição 4 (frente esquerda)
      5: { x: 25, y: 50 }, // Posição 5 (meio esquerda)
      6: { x: 25, y: 75 }, // Posição 6 (fundo esquerda)
    }

    const pos = zonePositions[stat.zone] || { x: 50, y: 50 }

    return {
      zone: stat.zone,
      x: pos.x,
      y: pos.y,
      intensity: (stat.totalActions / maxActions) * 100,
      actions: stat.totalActions,
      successRate: stat.successRate,
    }
  })
}

/**
 * Calcula eficiência geral de uma equipe
 */
export function calculateTeamEfficiency(actions: ScoutAction[]): number {
  let successCount = 0
  let errorCount = 0

  actions.forEach((action) => {
    if (
      ['ace', 'kill', 'perfect', 'good', 'successful', 'assist'].includes(
        action.subAction
      )
    ) {
      successCount++
    }
    if (action.subAction === 'error') {
      errorCount++
    }
  })

  const total = actions.length
  return total > 0 ? ((successCount - errorCount) / total) * 100 : 0
}

/**
 * Agrupa ações por fundamento
 */
export function groupActionsByType(
  actions: ScoutAction[]
): Record<string, number> {
  const grouped: Record<string, number> = {}

  actions.forEach((action) => {
    grouped[action.action] = (grouped[action.action] || 0) + 1
  })

  return grouped
}
