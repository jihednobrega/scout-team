// hooks/useMatchesAPI.ts
// Hooks para buscar partidas da API (Prisma/SQLite) em vez do localStorage
import { useState, useEffect, useCallback } from 'react'
import { GameSummary, GameMatch } from '@/types/game'
import { ScoutAction } from '@/types/scout'

/**
 * Hook para listar partidas de um time via API
 */
export function useMatchesList(teamId: string | null) {
  const [matches, setMatches] = useState<GameSummary[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  const fetchMatches = useCallback(async () => {
    if (!teamId) {
      setLoading(false)
      return
    }
    setLoading(true)
    setError(null)
    try {
      const res = await fetch(`/api/matches?teamId=${teamId}`)
      if (!res.ok) throw new Error('Erro ao buscar partidas')
      const data = await res.json()

      const summaries: GameSummary[] = data.map((m: any) => ({
        id: m.id,
        date: new Date(m.date),
        opponent: m.opponent || m.awayTeam,
        result: m.result,
        score: m.finalScore,
        tournament: m.tournament || undefined,
        location: m.location || undefined,
        createdAt: new Date(m.createdAt),
      }))

      setMatches(summaries)
    } catch (err) {
      setError((err as Error).message)
    } finally {
      setLoading(false)
    }
  }, [teamId])

  useEffect(() => {
    fetchMatches()
  }, [fetchMatches])

  const deleteMatch = async (matchId: string): Promise<boolean> => {
    try {
      const res = await fetch(`/api/matches/${matchId}`, { method: 'DELETE' })
      if (res.ok) {
        setMatches((prev) => prev.filter((m) => m.id !== matchId))
        return true
      }
      return false
    } catch {
      return false
    }
  }

  return { matches, loading, error, refetch: fetchMatches, deleteMatch }
}

/**
 * Hook para buscar detalhes de uma partida via API (incluindo ações)
 */
export function useMatchDetail(matchId: string | null) {
  const [match, setMatch] = useState<GameMatch | null>(null)
  const [actions, setActions] = useState<ScoutAction[]>([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!matchId) {
      setLoading(false)
      return
    }

    setLoading(true)
    setError(null)

    fetch(`/api/matches/${matchId}`)
      .then((res) => {
        if (!res.ok) throw new Error('Partida não encontrada')
        return res.json()
      })
      .then((data) => {
        // Mapear ações do Prisma → ScoutAction do frontend
        const mappedActions: ScoutAction[] = (data.actions || []).map(
          (a: any) => {
            // Extrair campos extras do fullData (destX, destY, serveType)
            let extra: any = {}
            if (a.fullData) {
              try {
                const fd = typeof a.fullData === 'string' ? JSON.parse(a.fullData) : a.fullData
                if (fd.destX !== undefined) extra.destX = fd.destX
                if (fd.destY !== undefined) extra.destY = fd.destY
                if (fd.serveType) extra.serveType = fd.serveType
              } catch { /* fullData inválido, ignorar */ }
            }
            return {
              id: a.id,
              time: a.time,
              player: a.playerId,
              action: a.action,
              subAction: a.subAction,
              zone: a.zone,
              coordinates: { x: a.coordinateX, y: a.coordinateY },
              matchId: a.matchId,
              set: a.setNumber,
              timestamp: new Date(a.timestamp),
              videoTimestamp: a.videoTimestamp || undefined,
              efficiencyValue: a.efficiencyValue ?? undefined,
              phase: a.phase || undefined,
              rallyId: a.rallyId || undefined,
              ...extra,
            }
          }
        )

        const gameMatch: GameMatch = {
          id: data.id,
          homeTeam: data.homeTeam,
          awayTeam: data.awayTeam,
          tournament: data.tournament || undefined,
          location: data.location || undefined,
          date: new Date(data.date),
          result: data.result,
          sets: JSON.parse(data.sets || '[]'),
          finalScore: data.finalScore,
          actions: mappedActions,
          stats: data.stats ? JSON.parse(data.stats) : undefined,
          createdAt: new Date(data.createdAt),
          updatedAt: new Date(data.updatedAt),
          duration: data.duration || undefined,
        }

        setMatch(gameMatch)
        setActions(mappedActions)
      })
      .catch((err) => {
        setError((err as Error).message)
        setMatch(null)
      })
      .finally(() => setLoading(false))
  }, [matchId])

  return { match, actions, loading, error }
}
