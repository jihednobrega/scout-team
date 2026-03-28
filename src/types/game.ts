// types/game.ts
import { ScoutAction } from './scout'

export type GameResult = 'vitoria' | 'derrota'

// Tipo para mapear posições da quadra (1-6) para IDs de jogadores
export type CourtPositions = {
  1: string | null
  2: string | null
  3: string | null
  4: string | null
  5: string | null
  6: string | null
}

// Informações de um set
export interface SetInfo {
  number: number // 1, 2, 3, 4, 5
  homeScore: number
  awayScore: number
  duration?: number // em minutos
  startTime?: Date
  endTime?: Date
}

// Estatísticas resumidas de uma partida
export interface MatchStats {
  totalPoints: number
  aces: number
  attacks: number
  blocks: number
  errors: number
  receptions: number
}

// Partida completa com todos os dados
export interface GameMatch {
  id: string
  homeTeam: string
  awayTeam: string
  tournament?: string
  location?: string
  date: Date

  // Resultado
  result: GameResult
  sets: SetInfo[]
  finalScore: string // "3 x 1"

  // Dados do scout
  actions: ScoutAction[]

  // Estatísticas
  stats?: MatchStats

  // Metadados
  createdAt: Date
  updatedAt: Date
  duration?: number // duração total em minutos
}

// Resumo para listagem (versão simplificada)
export interface GameSummary {
  id: string
  date: Date
  opponent: string
  result: GameResult
  score: string // Formato: "3 x 1"
  tournament?: string
  location?: string
  createdAt: Date
}

export const GAME_RESULT_LABELS: Record<GameResult, string> = {
  vitoria: 'Vitória',
  derrota: 'Derrota',
}
