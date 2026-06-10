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
  initialDbSetId?: string | null
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

/** Serializa ações para o payload da API, incluindo setId quando disponível */
function serializeActions(
  actions: ScoutAction[],
  currentSet: number,
  rotation: number,
  servingTeam: 'home' | 'away',
  setId: string | null,
) {
  return actions.map((a) => ({
    id: a.id,
    player: a.player,
    time: a.time,
    action: a.action,
    subAction: a.subAction,
    zone: a.zone ?? 0,
    coordinates: a.coordinates,
    set: a.set ?? currentSet,
    setId: setId ?? null,
    timestamp: a.timestamp,
    videoTimestamp: a.videoTimestamp,
    phase: a.phase,
    rallyId: a.rallyId,
    fullData: { rotation, servingTeam, ...a },
  }))
}

export function useMatchPersistence({
  gameConfig,
  actions,
  currentSet,
  rotation,
  servingTeam,
  initialDbMatchId,
  initialDbSetId,
}: UseMatchPersistenceProps) {
  const [saveStatus, setSaveStatus] = useState<SaveStatus>('idle')
  const [dbMatchId, setDbMatchId] = useState<string | null>(initialDbMatchId ?? null)
  const [dbSetId, setDbSetId] = useState<string | null>(initialDbSetId ?? null)
  const lastSavedCountRef = useRef(0)
  const autoSaveTimerRef = useRef<ReturnType<typeof setInterval> | null>(null)

  // Reconnect ao retomar sessão
  useEffect(() => {
    if (initialDbMatchId && !dbMatchId) setDbMatchId(initialDbMatchId)
  }, [initialDbMatchId, dbMatchId])

  useEffect(() => {
    if (initialDbSetId !== undefined && !dbSetId) setDbSetId(initialDbSetId ?? null)
  }, [initialDbSetId, dbSetId])

  // Resetar contador de sync quando o set mudar (array de ações é limpo)
  useEffect(() => {
    lastSavedCountRef.current = 0
  }, [dbSetId])

  // ─── Criar partida no banco ───────────────────────────────────────────────
  const createMatchInDb = useCallback(async (overrideId?: string | null) => {
    // Se já temos um ID (passado externamente ou de sessão anterior), apenas registra
    if (overrideId) { setDbMatchId(overrideId); return overrideId }
    if (dbMatchId) return dbMatchId
    if (!gameConfig) return null

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
          lineup: JSON.stringify(gameConfig.lineup ?? []),
          liberoId: gameConfig.liberoId ?? null,
          enabledFundamentos: JSON.stringify(gameConfig.enabledFundamentos ?? []),
          matchFormat: String(gameConfig.sets ?? 5),
        }),
      })
      if (!res.ok) { setSaveStatus('error'); return null }
      const match = await res.json()
      setDbMatchId(match.id)
      setSaveStatus('saved')
      return match.id as string
    } catch {
      setSaveStatus('error')
      return null
    }
  }, [gameConfig, dbMatchId])

  // ─── Criar set no banco ───────────────────────────────────────────────────
  const createSetInDb = useCallback(async (matchId: string, setNumber: number): Promise<string | null> => {
    try {
      setSaveStatus('saving')
      const res = await fetch('/api/match-sets', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ matchId, number: setNumber }),
      })
      if (!res.ok) { setSaveStatus('error'); return null }
      const matchSet = await res.json()
      setDbSetId(matchSet.id)
      lastSavedCountRef.current = 0
      setSaveStatus('saved')
      return matchSet.id as string
    } catch {
      setSaveStatus('error')
      return null
    }
  }, [])

  // ─── Sincronizar ações pendentes ──────────────────────────────────────────
  const syncActions = useCallback(async (overrideSetId?: string | null) => {
    if (!dbMatchId || actions.length === 0) return
    if (actions.length <= lastSavedCountRef.current) return

    const newActions = actions.slice(lastSavedCountRef.current)
    const resolvedSetId = overrideSetId !== undefined ? overrideSetId : dbSetId

    try {
      setSaveStatus('saving')
      const res = await fetch('/api/scout-actions', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          matchId: dbMatchId,
          actions: serializeActions(newActions, currentSet, rotation, servingTeam, resolvedSetId),
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
  }, [dbMatchId, dbSetId, actions, currentSet, rotation, servingTeam])

  // Auto-save a cada 30 segundos
  useEffect(() => {
    if (!dbMatchId) return
    autoSaveTimerRef.current = setInterval(() => { syncActions() }, 30000)
    return () => { if (autoSaveTimerRef.current) clearInterval(autoSaveTimerRef.current) }
  }, [dbMatchId, syncActions])

  // ─── Salvar e pausar (sem finalizar) ─────────────────────────────────────
  const saveAndPause = useCallback(async (): Promise<boolean> => {
    let matchId = dbMatchId
    if (!matchId) { matchId = await createMatchInDb(); if (!matchId) return false }

    if (actions.length > lastSavedCountRef.current) {
      const pending = actions.slice(lastSavedCountRef.current)
      try {
        setSaveStatus('saving')
        const res = await fetch('/api/scout-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId,
            actions: serializeActions(pending, currentSet, rotation, servingTeam, dbSetId),
          }),
        })
        if (res.ok) { lastSavedCountRef.current = actions.length; setSaveStatus('saved') }
        else { setSaveStatus('error'); return false }
      } catch { setSaveStatus('error'); return false }
    }
    return true
  }, [dbMatchId, dbSetId, actions, currentSet, rotation, servingTeam, createMatchInDb])

  // ─── Finalizar set ────────────────────────────────────────────────────────
  const finalizeSet = useCallback(async (
    homeScore: number,
    awayScore: number,
    duration?: number,
  ): Promise<boolean> => {
    if (!dbMatchId) return false
    const setId = dbSetId

    // 1. Flush ações pendentes com setId
    if (actions.length > lastSavedCountRef.current) {
      const pending = actions.slice(lastSavedCountRef.current)
      try {
        const res = await fetch('/api/scout-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId: dbMatchId,
            actions: serializeActions(pending, currentSet, rotation, servingTeam, setId),
          }),
        })
        if (res.ok) lastSavedCountRef.current = actions.length
      } catch { /* continua mesmo com erro de sync */ }
    }

    // 2. Finalizar o set no banco
    if (setId) {
      try {
        setSaveStatus('saving')
        const res = await fetch(`/api/match-sets/${setId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ homeScore, awayScore, status: 'finalized', ...(duration != null && { duration }) }),
        })
        if (!res.ok) { setSaveStatus('error'); return false }
        setSaveStatus('saved')
      } catch { setSaveStatus('error'); return false }
    }

    // 3. Resetar estado do set — pronto para o próximo
    setDbSetId(null)
    lastSavedCountRef.current = 0
    return true
  }, [dbMatchId, dbSetId, actions, currentSet, rotation, servingTeam])

  // ─── Finalizar partida ────────────────────────────────────────────────────
  const finalizeMatch = useCallback(async (
    finalSetsHistory: SetInfo[],
    finalScore: { home: number; away: number },
  ): Promise<boolean> => {
    let matchId = dbMatchId
    if (!matchId) { matchId = await createMatchInDb(); if (!matchId) return false }

    try {
      setSaveStatus('saving')

      // Salvar ações pendentes do set atual (se houver)
      if (actions.length > lastSavedCountRef.current) {
        const pending = actions.slice(lastSavedCountRef.current)
        await fetch('/api/scout-actions', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            matchId,
            actions: serializeActions(pending, currentSet, rotation, servingTeam, dbSetId),
          }),
        })
        lastSavedCountRef.current = actions.length
      }

      // Finalizar set em andamento (se existir)
      if (dbSetId) {
        await fetch(`/api/match-sets/${dbSetId}`, {
          method: 'PUT',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ homeScore: finalScore.home, awayScore: finalScore.away, status: 'finalized' }),
        })
      }

      // Calcular resultado a partir dos sets
      const allSets = [...finalSetsHistory]
      if ((finalScore.home > 0 || finalScore.away > 0) && !allSets.find(s => s.number === currentSet)) {
        allSets.push({ number: currentSet, homeScore: finalScore.home, awayScore: finalScore.away })
      }
      const homeSetsWon = allSets.filter(s => s.homeScore > s.awayScore).length
      const awaySetsWon = allSets.filter(s => s.awayScore > s.homeScore).length
      const result = homeSetsWon > awaySetsWon ? 'vitoria' : 'derrota'
      const finalScoreStr = `${homeSetsWon} x ${awaySetsWon}`
      const stats = computeStats(actions)

      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ result, finalScore: finalScoreStr, sets: allSets, stats, duration: null, status: 'finalized' }),
      })

      if (!res.ok) { setSaveStatus('error'); return false }

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
  }, [dbMatchId, dbSetId, actions, currentSet, rotation, servingTeam, createMatchInDb])

  return {
    saveStatus,
    dbMatchId,
    dbSetId,
    setDbSetId,
    createMatchInDb,
    createSetInDb,
    syncActions,
    saveAndPause,
    finalizeSet,
    finalizeMatch,
  }
}
