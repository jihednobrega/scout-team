// utils/gameValidation.ts
import { GameConfig, GameSetupValidation } from '@/types/scout'

/**
 * Valida a configuração completa do jogo antes de iniciar o scout
 */
export function validateGameSetup(config: Partial<GameConfig>): GameSetupValidation {
  const errors: string[] = []
  const warnings: string[] = []

  // 1. Validar informações básicas
  if (!config.tournament) {
    errors.push('Campeonato não foi selecionado')
  }

  if (!config.date) {
    errors.push('Data do jogo não foi definida')
  }

  if (!config.time) {
    errors.push('Horário do jogo não foi definido')
  }

  if (!config.opponentName || config.opponentName.trim() === '') {
    errors.push('Nome do adversário não foi informado')
  }

  if (!config.matchType) {
    errors.push('Tipo de partida não foi selecionado')
  }

  // 2. Validar escalação
  if (!config.lineup || config.lineup.length === 0) {
    errors.push('Nenhum jogador foi adicionado ao elenco')
  } else {
    const starters = config.lineup.filter((p) => p.isStarter)

    if (starters.length !== 6) {
      errors.push(`É necessário selecionar exatamente 6 titulares (selecionados: ${starters.length})`)
    }

    // Validar rotação completa
    const rotations = starters
      .map((p) => p.rotationOrder)
      .filter((r) => r !== undefined) as number[]

    if (rotations.length !== 6) {
      errors.push('Nem todos os titulares têm ordem de rotação definida')
    } else {
      const uniqueRotations = new Set(rotations)
      if (uniqueRotations.size !== 6) {
        errors.push('Existem rotações duplicadas. Cada titular deve ter uma posição única (P1 a P6)')
      }

      // Verificar se todas as posições 1-6 estão preenchidas
      for (let i = 1; i <= 6; i++) {
        if (!rotations.includes(i)) {
          errors.push(`Posição P${i} não está preenchida`)
        }
      }
    }

    // Validar líbero
    if (!config.liberoId) {
      errors.push('Líbero não foi selecionado')
    } else {
      const libero = config.lineup.find((p) => p.playerId === config.liberoId)
      if (!libero) {
        errors.push('Líbero selecionado não está no elenco')
      } else if (!libero.isStarter) {
        warnings.push('Líbero não está marcado como titular. Ele deve estar na escalação inicial.')
      }
    }
  }

  // 3. Validar modelo de scout
  if (!config.modelId) {
    errors.push('Modelo de scout não foi selecionado')
  }

  // 4. Validar campos avançados (avisos, não erros)
  if (config.advanced) {
    if (config.advanced.useEPV) {
      warnings.push(
        'EPV habilitado: requer histórico de jogos. Resultados podem ser imprecisos para novos times.'
      )
    }

    if (config.advanced.enableXSR) {
      warnings.push(
        'xSR habilitado: requer histórico de jogos. Resultados podem ser imprecisos para novos times.'
      )
    }

    const advancedCount = Object.values(config.advanced).filter(Boolean).length
    if (advancedCount > 5) {
      warnings.push(
        `${advancedCount} métricas avançadas habilitadas. Isso pode aumentar o tempo de processamento durante o scout.`
      )
    }
  }

  // 5. Validar IDs únicos
  if (config.lineup) {
    const playerIds = config.lineup.map((p) => p.playerId)
    const uniqueIds = new Set(playerIds)
    if (uniqueIds.size !== playerIds.length) {
      errors.push('Existem jogadores duplicados na escalação')
    }

    // Verificar números de camisa duplicados
    const jerseyNumbers = config.lineup.map((p) => p.jerseyNumber)
    const uniqueJerseys = new Set(jerseyNumbers)
    if (uniqueJerseys.size !== jerseyNumbers.length) {
      errors.push('Existem números de camisa duplicados')
    }
  }

  return {
    isValid: errors.length === 0,
    errors,
    warnings,
  }
}

/**
 * Verifica se o time tem histórico suficiente para métricas avançadas
 * @param teamId ID do time
 * @returns true se tem poucos jogos (< 5)
 */
export function checkHistoryWarning(teamId: string): boolean {
  // TODO: Implementar consulta ao banco de dados
  // Por enquanto, sempre retorna true (sem histórico)
  return true
}

/**
 * Formata a configuração para salvar no banco
 */
export function formatConfigForStorage(config: GameConfig): Record<string, any> {
  return {
    gameId: config.gameId,
    teamId: config.teamId,
    date: config.date,
    time: config.time,
    opponentId: config.opponentId,
    opponentName: config.opponentName,
    tournament: config.tournament,
    location: config.location,
    matchType: config.matchType,
    lineup: JSON.stringify(config.lineup),
    liberoId: config.liberoId,
    rotationStart: JSON.stringify(config.rotationStart),
    modelId: config.modelId,
    modelName: config.modelName,
    customWeights: config.customWeights ? JSON.stringify(config.customWeights) : null,
    advanced: JSON.stringify(config.advanced),
    createdAt: config.createdAt,
  }
}

/**
 * Parseia a configuração do banco de dados
 */
export function parseConfigFromStorage(raw: any): GameConfig {
  return {
    id: raw.id,
    gameId: raw.gameId,
    date: new Date(raw.date),
    time: raw.time,
    teamId: raw.teamId,
    teamName: raw.teamName || '',
    opponentId: raw.opponentId,
    opponentName: raw.opponentName,
    tournament: raw.tournament,
    location: raw.location,
    matchType: raw.matchType,
    lineup: JSON.parse(raw.lineup),
    liberoId: raw.liberoId,
    rotationStart: JSON.parse(raw.rotationStart),
    modelId: raw.modelId,
    modelName: raw.modelName,
    customWeights: raw.customWeights ? JSON.parse(raw.customWeights) : undefined,
    advanced: JSON.parse(raw.advanced),
    createdAt: new Date(raw.createdAt),
    updatedAt: raw.updatedAt ? new Date(raw.updatedAt) : undefined,
  }
}
