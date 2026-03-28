// utils/storage.ts
import { ScoutAction, MatchInfo } from '@/types/scout'
import { GameMatch, GameSummary, SetInfo } from '@/types/game'

const STORAGE_KEYS = {
  ACTIONS: 'scout_current_match_actions',
  MATCH_INFO: 'scout_current_match_info',
  BACKUP_PREFIX: 'scout_backup_',
  MATCHES_HISTORY: 'scout_matches_history', // Lista de partidas finalizadas
  SCOUT_SESSION: 'scout_session_state',
}

interface MatchData {
  actions: ScoutAction[]
  matchInfo: MatchInfo
  lastUpdate: string
}

/**
 * Salva as ações da partida atual no localStorage
 */
export const saveMatchActions = (actions: ScoutAction[]): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.ACTIONS, JSON.stringify(actions))
    console.log(`✅ ${actions.length} ações salvas no localStorage`)
  } catch (error) {
    console.error('❌ Erro ao salvar ações:', error)
  }
}

/**
 * Carrega as ações da partida atual do localStorage
 */
export const loadMatchActions = (): ScoutAction[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.ACTIONS)
    if (!data) return []

    const actions = JSON.parse(data) as ScoutAction[]
    // Reconstrói objetos Date
    return actions.map((action) => ({
      ...action,
      timestamp: new Date(action.timestamp),
    }))
  } catch (error) {
    console.error('❌ Erro ao carregar ações:', error)
    return []
  }
}

/**
 * Salva informações da partida no localStorage
 */
export const saveMatchInfo = (matchInfo: MatchInfo): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.MATCH_INFO, JSON.stringify(matchInfo))
    console.log('✅ Informações da partida salvas')
  } catch (error) {
    console.error('❌ Erro ao salvar informações da partida:', error)
  }
}

/**
 * Carrega informações da partida do localStorage
 */
export const loadMatchInfo = (): MatchInfo | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MATCH_INFO)
    return data ? JSON.parse(data) : null
  } catch (error) {
    console.error('❌ Erro ao carregar informações da partida:', error)
    return null
  }
}

/**
 * Cria um backup completo da partida atual
 */
export const createBackup = (
  actions: ScoutAction[],
  matchInfo: MatchInfo
): void => {
  try {
    const timestamp = new Date().toISOString()
    const backupKey = `${STORAGE_KEYS.BACKUP_PREFIX}${matchInfo.id}_${timestamp}`

    const backup: MatchData = {
      actions,
      matchInfo,
      lastUpdate: timestamp,
    }

    localStorage.setItem(backupKey, JSON.stringify(backup))
    console.log(`✅ Backup criado: ${backupKey}`)
  } catch (error) {
    console.error('❌ Erro ao criar backup:', error)
  }
}

/**
 * Lista todos os backups disponíveis
 */
export const listBackups = (): string[] => {
  try {
    const keys = Object.keys(localStorage)
    return keys.filter((key) => key.startsWith(STORAGE_KEYS.BACKUP_PREFIX))
  } catch (error) {
    console.error('❌ Erro ao listar backups:', error)
    return []
  }
}

/**
 * Carrega um backup específico
 */
export const loadBackup = (backupKey: string): MatchData | null => {
  try {
    const data = localStorage.getItem(backupKey)
    if (!data) return null

    const backup = JSON.parse(data) as MatchData
    // Reconstrói objetos Date
    backup.actions = backup.actions.map((action) => ({
      ...action,
      timestamp: new Date(action.timestamp),
    }))

    return backup
  } catch (error) {
    console.error('❌ Erro ao carregar backup:', error)
    return null
  }
}

/**
 * Limpa todos os dados da partida atual
 */
export const clearCurrentMatch = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.ACTIONS)
    localStorage.removeItem(STORAGE_KEYS.MATCH_INFO)
    console.log('✅ Dados da partida atual limpos')
  } catch (error) {
    console.error('❌ Erro ao limpar dados:', error)
  }
}

/**
 * Verifica se há dados salvos da partida atual
 */
export const hasStoredMatch = (): boolean => {
  try {
    return (
      localStorage.getItem(STORAGE_KEYS.ACTIONS) !== null ||
      localStorage.getItem(STORAGE_KEYS.MATCH_INFO) !== null
    )
  } catch {
    return false
  }
}

/**
 * Obtém o tamanho aproximado dos dados armazenados (em KB)
 */
export const getStorageSize = (): number => {
  try {
    let total = 0
    for (const key in localStorage) {
      if (localStorage.hasOwnProperty(key)) {
        total += localStorage[key].length + key.length
      }
    }
    return Math.round((total * 2) / 1024) // Aproximação em KB
  } catch {
    return 0
  }
}

// ============================================
// SCOUT SESSION — Salvar/Retomar scout em andamento
// ============================================

export interface ScoutSessionState {
  dbMatchId: string
  setsHistory: SetInfo[]
  servingTeam: 'home' | 'away'
  rotation: number
  history: Array<{
    id: string
    set: number
    score: { home: number; away: number }
    winner: 'home' | 'away'
    actions: ScoutAction[]
    timestamp: Date | string
  }>
  gameStarted: boolean
  hasStarted: boolean
  savedAt: string
  teamId: string
}

export const saveScoutSession = (state: ScoutSessionState): void => {
  try {
    localStorage.setItem(STORAGE_KEYS.SCOUT_SESSION, JSON.stringify(state))
  } catch (error) {
    console.error('Erro ao salvar sessão do scout:', error)
  }
}

export const loadScoutSession = (): ScoutSessionState | null => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.SCOUT_SESSION)
    if (!data) return null
    return JSON.parse(data) as ScoutSessionState
  } catch (error) {
    console.error('Erro ao carregar sessão do scout:', error)
    return null
  }
}

export const clearScoutSession = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.SCOUT_SESSION)
  } catch (error) {
    console.error('Erro ao limpar sessão do scout:', error)
  }
}

// ============================================
// FUNÇÕES PARA HISTÓRICO DE PARTIDAS
// @deprecated — Usar useMatchesAPI hooks (src/hooks/useMatchesAPI.ts) em vez disso.
// Mantidas temporariamente para compatibilidade.
// ============================================

/**
 * @deprecated Usar useMatchesAPI. Partidas finalizadas agora são persistidas via Prisma/SQLite.
 */
export const saveCompletedMatch = (match: GameMatch): void => {
  try {
    const matches = loadMatchesHistory()

    // Verifica se já existe uma partida com o mesmo ID
    const existingIndex = matches.findIndex(m => m.id === match.id)

    if (existingIndex >= 0) {
      // Atualiza partida existente
      matches[existingIndex] = match
      console.log(`✅ Partida ${match.id} atualizada no histórico`)
    } else {
      // Adiciona nova partida
      matches.unshift(match) // Adiciona no início (mais recente primeiro)
      console.log(`✅ Partida ${match.id} adicionada ao histórico`)
    }

    localStorage.setItem(STORAGE_KEYS.MATCHES_HISTORY, JSON.stringify(matches))
  } catch (error) {
    console.error('❌ Erro ao salvar partida no histórico:', error)
  }
}

/**
 * @deprecated Usar useMatchesList() de useMatchesAPI.ts
 */
export const loadMatchesHistory = (): GameMatch[] => {
  try {
    const data = localStorage.getItem(STORAGE_KEYS.MATCHES_HISTORY)
    if (!data) return []

    const matches = JSON.parse(data) as GameMatch[]

    // Reconstrói objetos Date
    return matches.map((match) => ({
      ...match,
      date: new Date(match.date),
      createdAt: new Date(match.createdAt),
      updatedAt: new Date(match.updatedAt),
      sets: match.sets.map(set => ({
        ...set,
        startTime: set.startTime ? new Date(set.startTime) : undefined,
        endTime: set.endTime ? new Date(set.endTime) : undefined,
      })),
      actions: match.actions.map((action) => ({
        ...action,
        timestamp: new Date(action.timestamp),
      })),
    }))
  } catch (error) {
    console.error('❌ Erro ao carregar histórico de partidas:', error)
    return []
  }
}

/**
 * @deprecated Usar useMatchesList() de useMatchesAPI.ts
 */
export const loadMatchesSummaries = (): GameSummary[] => {
  try {
    const matches = loadMatchesHistory()

    return matches.map((match) => ({
      id: match.id,
      date: match.date,
      opponent: match.awayTeam,
      result: match.result,
      score: match.finalScore,
      tournament: match.tournament,
      location: match.location,
      createdAt: match.createdAt,
    }))
  } catch (error) {
    console.error('❌ Erro ao carregar resumos de partidas:', error)
    return []
  }
}

/**
 * @deprecated Usar useMatchDetail() de useMatchesAPI.ts
 */
export const loadMatchById = (matchId: string): GameMatch | null => {
  try {
    const matches = loadMatchesHistory()
    const match = matches.find(m => m.id === matchId)
    return match || null
  } catch (error) {
    console.error('❌ Erro ao carregar partida:', error)
    return null
  }
}

/**
 * @deprecated Usar deleteMatch() de useMatchesList() hook
 */
export const deleteMatch = (matchId: string): boolean => {
  try {
    const matches = loadMatchesHistory()
    const filteredMatches = matches.filter(m => m.id !== matchId)

    if (filteredMatches.length === matches.length) {
      console.warn(`⚠️ Partida ${matchId} não encontrada`)
      return false
    }

    localStorage.setItem(STORAGE_KEYS.MATCHES_HISTORY, JSON.stringify(filteredMatches))
    console.log(`✅ Partida ${matchId} deletada do histórico`)
    return true
  } catch (error) {
    console.error('❌ Erro ao deletar partida:', error)
    return false
  }
}

/**
 * @deprecated Histórico agora vive no banco Prisma/SQLite
 */
export const clearMatchesHistory = (): void => {
  try {
    localStorage.removeItem(STORAGE_KEYS.MATCHES_HISTORY)
    console.log('✅ Histórico de partidas limpo')
  } catch (error) {
    console.error('❌ Erro ao limpar histórico:', error)
  }
}
