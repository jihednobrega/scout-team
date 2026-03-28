// hooks/useMatchPersistence.ts
import { useState, useCallback, useRef, useEffect } from 'react'
import { ScoutAction, GameConfig } from '@/types/scout'
import { SetInfo } from '@/types/game'
import { clearCurrentMatch, clearScoutSession } from '@/utils/storage'

type SaveStatus = 'idle' | 'saving' | 'saved' | 'error'

interface UseMatchPersistenceProps {
  gameConfig: GameConfig | null
  actions: ScoutAction[]
  score: { home: number; away: number }
  currentSet: number
  setsHistory: SetInfo[]
  rotation: number
  servingTeam: 'home' | 'away'
  initialDbMatchId?: string | null
}

interface MatchStats {
  totalPoints: number
  aces: number
  attacks: number
  blocks: number
  errors: number
  receptions: number
}

function computeStats(actions: ScoutAction[]): MatchStats {
  let aces = 0, attacks = 0, blocks = 0, errors = 0, receptions = 0, totalPoints = 0

  for (const a of actions) {
    if (a.action === 'serve') {
      if (a.subAction === 'ace') { aces++; totalPoints++ }
      if (a.subAction === 'error') errors++
    }
    if (a.action === 'attack') {
      attacks++
      if (a.subAction === 'kill' || a.subAction === 'tip' || a.subAction === 'block_out') totalPoints++
      if (a.subAction === 'error' || a.subAction === 'blocked') errors++
    }
    if (a.action === 'block') {
      blocks++
      if (a.subAction === 'kill_block' || a.subAction === 'point') totalPoints++
      if (a.subAction === 'error') errors++
    }
    if (a.action === 'reception') receptions++
    if (a.action === 'dig' && a.subAction === 'error') errors++
    if (a.action === 'set' && a.subAction === 'error') errors++
    if (a.action === 'opponent_error') totalPoints++
  }

  return { totalPoints, aces, attacks, blocks, errors, receptions }
}

export function useMatchPersistence({
  gameConfig,
  actions,
  score,
  currentSet,
  setsHistory,
  rotation,
  servingTeam,
  initialDbMatchId,
}: UseMatchPersistenceProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [dbMatchId, setDbMatchId] = useState<string | null>(initialDbMatchId ?? null)
  const lastSavedCountRef = useRef(0)
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reconnect: quando initialDbMatchId mudar (ex: ao retomar sessão)
  useEffect(() => {
    if (initialDbMatchId && !dbMatchId) {
      setDbMatchId(initialDbMatchId)
    }
  }, [initialDbMatchId, dbMatchId])

  // Criar partida no banco ao iniciar o jogo
  const createMatchInDb = useCallback(async () => {
    if (!gameConfig || dbMatchId) return null

    try {
      setSaveStatus('saving')

      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId: gameConfig.teamId,
          homeTeam: gameConfig.teamName,
          awayTeam: gameConfig.opponentName,
          tournament: gameConfig.tournament || null,
          location: gameConfig.location || null,
          date: gameConfig.date,
          result: 'em_andamento',
          finalScore: '0 x 0',
          sets: [],
          actions: [],
          status: 'in_progress',
        }),
      })

      if (!res.ok) {
        const err = await res.json()
        console.error('Erro ao criar partida no banco:', err)
        setSaveStatus('error')
        return null
      }

      const match = await res.json()
      setDbMatchId(match.id)
      setSaveStatus('saved')
      return match.id as string
    } catch (error) {
      console.error('Erro ao criar partida no banco:', error)
      setSaveStatus('error')
      return null
    }
  }, [gameConfig, dbMatchId])

  // Salvar ações pendentes no banco
  const syncActions = useCallback(async () => {
    if (!dbMatchId || actions.length === 0) return
    if (actions.length <= lastSavedCountRef.current) return

    const newActions = actions.slice(lastSavedCountRef.current)

    try {
      setSaveStatus('saving')

      const res = await fetch('/api/scout-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: dbMatchId,
          actions: newActions.map((a) => ({
            id: a.id,
            player: a.player,
            time: a.time,
            action: a.action,
            subAction: a.subAction,
            zone: a.zone ?? 0,
            coordinates: a.coordinates,
            set: a.set ?? currentSet,
            timestamp: a.timestamp,
            videoTimestamp: a.videoTimestamp,
            phase: a.phase,
            rallyId: a.rallyId,
            fullData: { rotation, servingTeam, ...a }, // a.rotation/servingTeam têm prioridade (gravados na criação)
          })),
        }),
      })

      if (res.ok) {
        lastSavedCountRef.current = actions.length
        setSaveStatus('saved')
      } else {
        setSaveStatus('error')
      }
    } catch {
      setSaveStatus('error')
    }
  }, [dbMatchId, actions, currentSet])

  // Auto-save a cada 30 segundos
  useEffect(() => {
    if (!dbMatchId) return

    autoSaveTimerRef.current = setInterval(() => {
      syncActions()
    }, 30000)

    return () => {
      if (autoSaveTimerRef.current) {
        clearInterval(autoSaveTimerRef.current)
      }
    }
  }, [dbMatchId, syncActions])

  // Salvar e pausar — sync ações sem finalizar
  const saveAndPause = useCallback(async (): Promise<boolean> => {
    let matchId = dbMatchId

    if (!matchId) {
      matchId = await createMatchInDb()
      if (!matchId) return false
    }

    // Sync todas as ações pendentes
    if (actions.length > lastSavedCountRef.current) {
      const pendingActions = actions.slice(lastSavedCountRef.current)
      try {
        setSaveStatus('saving')
        const res = await fetch('/api/scout-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId,
            actions: pendingActions.map((a) => ({
              id: a.id,
              player: a.player,
              time: a.time,
              action: a.action,
              subAction: a.subAction,
              zone: a.zone ?? 0,
              coordinates: a.coordinates,
              set: a.set ?? currentSet,
              timestamp: a.timestamp,
              videoTimestamp: a.videoTimestamp,
              phase: a.phase,
              rallyId: a.rallyId,
              fullData: { rotation, servingTeam, ...a }, // a.rotation/servingTeam têm prioridade (gravados na criação)
            })),
          }),
        })
        if (res.ok) {
          lastSavedCountRef.current = actions.length
          setSaveStatus('saved')
        } else {
          setSaveStatus('error')
          return false
        }
      } catch {
        setSaveStatus('error')
        return false
      }
    }

    return true
  }, [dbMatchId, actions, currentSet, createMatchInDb])

  // Finalizar partida — salvar tudo e calcular resultado
  const finalizeMatch = useCallback(async (
    finalSetsHistory: SetInfo[],
    finalScore: { home: number; away: number },
  ): Promise<boolean> => {
    let matchId = dbMatchId

    // Se não criou a partida ainda, criar agora
    if (!matchId) {
      matchId = await createMatchInDb()
      if (!matchId) return false
    }

    try {
      setSaveStatus('saving')

      // 1. Salvar todas as ações pendentes
      if (actions.length > lastSavedCountRef.current) {
        const pendingActions = actions.slice(lastSavedCountRef.current)
        await fetch('/api/scout-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId,
            actions: pendingActions.map((a) => ({
              id: a.id,
              player: a.player,
              time: a.time,
              action: a.action,
              subAction: a.subAction,
              zone: a.zone ?? 0,
              coordinates: a.coordinates,
              set: a.set ?? currentSet,
              timestamp: a.timestamp,
              videoTimestamp: a.videoTimestamp,
              phase: a.phase,
              rallyId: a.rallyId,
              fullData: { rotation, servingTeam, ...a }, // a.rotation/servingTeam têm prioridade (gravados na criação)
            })),
          }),
        })
        lastSavedCountRef.current = actions.length
      }

      // 2. Calcular resultado
      const homeSetsWon = finalSetsHistory.filter(
        (s) => s.homeScore > s.awayScore
      ).length
      const awaySetsWon = finalSetsHistory.filter(
        (s) => s.awayScore > s.homeScore
      ).length
      const result = homeSetsWon > awaySetsWon ? 'vitoria' : 'derrota'
      const finalScoreStr = `${homeSetsWon} x ${awaySetsWon}`

      // 3. Calcular estatísticas
      const stats = computeStats(actions)

      // 4. Calcular duração (diferença entre primeira e última ação)
      let duration: number | null = null
      if (actions.length >= 2) {
        const first = new Date(actions[0].timestamp).getTime()
        const last = new Date(actions[actions.length - 1].timestamp).getTime()
        duration = Math.round((last - first) / 60000) // minutos
      }

      // 5. Atualizar partida no banco
      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result,
          finalScore: finalScoreStr,
          sets: finalSetsHistory,
          stats,
          duration,
          status: 'finalized',
        }),
      })

      if (!res.ok) {
        setSaveStatus('error')
        return false
      }

      // 6. Limpar localStorage
      clearCurrentMatch()
      clearScoutSession()
      localStorage.removeItem('current-game-config')
      localStorage.removeItem('scout-team-lineup')
      localStorage.removeItem('scout-team-score')
      localStorage.removeItem('scout-team-set')

      setSaveStatus('saved')
      return true
    } catch (error) {
      console.error('Erro ao finalizar partida:', error)
      setSaveStatus('error')
      return false
    }
  }, [dbMatchId, actions, currentSet, createMatchInDb])

  return {
    saveStatus,
    dbMatchId,
    createMatchInDb,
    syncActions,
    saveAndPause,
    finalizeMatch,
  }
}
