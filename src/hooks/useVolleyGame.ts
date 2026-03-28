import { useState, useEffect } from 'react'
import {
  ScoutAction,
  RallyState,
  RallyStep,
  ServingTeam,
  CourtPositions,
  MatchInfo,
  GameConfig,
  PointRecord
} from '@/types/scout'
import { getScoutActionEntry } from '@/lib/actionLabels'
import {
  saveMatchActions,
  saveMatchInfo,
  loadMatchActions,
  hasStoredMatch,
  clearCurrentMatch
} from '@/utils/storage'

interface UseVolleyGameProps {
  gameConfig: GameConfig | null
  initialState?: Partial<MatchInfo>
}

// Snapshot do estado do jogo para permitir undo
interface GameSnapshot {
  action: ScoutAction
  score: { home: number; away: number }
  rotation: number
  servingTeam: ServingTeam
  rallyState: RallyState
  history: PointRecord[]
}

const MAX_UNDO_STACK = 20

export function useVolleyGame({ gameConfig }: UseVolleyGameProps) {
  // Estados do Jogo
  const [score, setScore] = useState({ home: 0, away: 0 })
  const [currentSet, setCurrentSet] = useState(1)
  const [rotation, setRotation] = useState<number>(1)
  const [servingTeam, setServingTeam] = useState<ServingTeam>('home')
  const [actions, setActions] = useState<ScoutAction[]>([])
  const [history, setHistory] = useState<PointRecord[]>([])

  // Estado do Rally
  const [rallyState, setRallyState] = useState<RallyState>({
    servingTeam: 'home',
    currentStep: 'serve',
    rallyActions: [],
  })

  // Estado da Quadra
  const [courtPositions, setCourtPositions] = useState<CourtPositions>({
    1: null, 2: null, 3: null, 4: null, 5: null, 6: null
  })

  // ID do rally atual — agrupa ações que pertencem ao mesmo rally
  const [currentRallyId, setCurrentRallyId] = useState<string>(`rally-${Date.now()}`)

  // Undo stack - snapshots do estado ANTES de cada ação
  const [undoStack, setUndoStack] = useState<GameSnapshot[]>([])

  // Ref para última ação registrada (para o toast)
  const [lastRegisteredAction, setLastRegisteredAction] = useState<ScoutAction | null>(null)

  // Inicialização baseada na config
  useEffect(() => {
    if (gameConfig) {
      // Configurar rotação inicial
      const startRotation = gameConfig.rotationStart[0] || 1
      setRotation(startRotation)

      // Configurar posições iniciais
      const initialPositions: CourtPositions = {
        1: null, 2: null, 3: null, 4: null, 5: null, 6: null
      }
      gameConfig.lineup
        .filter((p) => p.isStarter)
        .forEach((player) => {
          if (player.rotationOrder) {
            initialPositions[player.rotationOrder as keyof CourtPositions] = player.playerId
          }
        })
      setCourtPositions(initialPositions)

      // Tentar carregar dados legados/salvos
      loadSavedData()
    }
  }, [gameConfig])

  // Persistência de MatchInfo
  useEffect(() => {
    if (gameConfig) {
      const matchInfo: MatchInfo = {
        id: gameConfig.gameId,
        homeTeam: gameConfig.teamName,
        awayTeam: gameConfig.opponentName,
        currentSet,
        score,
        rotation,
        servingPlayer: '0' // Simplificado por enquanto
      }
      saveMatchInfo(matchInfo)
    }
  }, [score, currentSet, rotation, gameConfig])

  // Persistência automática
  useEffect(() => {
    if (actions.length > 0) {
      saveMatchActions(actions)
    }
  }, [actions])

  useEffect(() => {
    localStorage.setItem('scout-team-lineup', JSON.stringify(courtPositions))
  }, [courtPositions])

  useEffect(() => {
    localStorage.setItem('scout-team-score', JSON.stringify(score))
  }, [score])

  useEffect(() => {
    localStorage.setItem('scout-team-set', currentSet.toString())
  }, [currentSet])

  // Lógica de Rotação
  const nextRotation = () => {
    const rotationOrder = [1, 6, 5, 4, 3, 2]
    const currentIndex = rotationOrder.indexOf(rotation)
    const nextIndex = (currentIndex + 1) % rotationOrder.length
    setRotation(rotationOrder[nextIndex])
  }

  const previousRotation = () => {
    const rotationOrder = [1, 6, 5, 4, 3, 2]
    const currentIndex = rotationOrder.indexOf(rotation)
    const previousIndex = (currentIndex - 1 + rotationOrder.length) % rotationOrder.length
    setRotation(rotationOrder[previousIndex])
  }

  // Lógica de Pontuação
  const incrementScore = (team: 'home' | 'away') => {
    setScore((prev) => ({ ...prev, [team]: prev[team] + 1 }))
  }

  const decrementScore = (team: 'home' | 'away') => {
    setScore((prev) => ({ ...prev, [team]: Math.max(0, prev[team] - 1) }))
  }

  // Lógica de Rally
  const getNextRallyStep = (
    currentStep: RallyStep,
    servingTeam: ServingTeam,
    actionResult: string
  ): RallyStep | null => {
    // Ações terminais (ponto)
    if (['error', 'ace', 'kill', 'tip', 'block_out', 'kill_block', 'point'].includes(actionResult)) {
      return null
    }

    // Ataques não-terminais continuam o rally
    const isAttackContinued = currentStep === 'attack' && ['continued', 'replay'].includes(actionResult)
    // Replay: bola voltou pro nosso lado (bateu no bloqueio e voltou) → defesa nossa
    const isReplay = currentStep === 'attack' && actionResult === 'replay'

    if (servingTeam === 'away') {
      if (currentStep === 'serve') return 'set'
      if (currentStep === 'reception') return 'set'
      if (currentStep === 'set') return 'attack'
      // Replay → bola volta pro nosso lado → defesa (dig)
      if (isReplay) return 'dig'
      // Ataque defendido → adversário terá defesa → set → contra-ataque
      if (isAttackContinued) return 'block'
      if (currentStep === 'attack') return null
      // Bloqueio não-terminal → defesa
      if (currentStep === 'block') {
        return actionResult === 'kill_block' ? null : 'dig'
      }
      // Defesa → levantamento
      if (currentStep === 'dig') return 'set'
    }

    if (servingTeam === 'home') {
      if (currentStep === 'serve') return 'block'
      if (currentStep === 'block') {
         return actionResult === 'kill_block' ? null : 'dig'
      }
      if (currentStep === 'dig') return 'set'
      if (currentStep === 'set') return 'attack'
      // Replay → bola volta pro nosso lado → defesa (dig)
      if (isReplay) return 'dig'
      // Ataque defendido → adversário bloqueia/defende → continuidade
      if (isAttackContinued) return 'block'
      if (currentStep === 'attack') return 'block'
    }

    return null
  }

  const processActionResult = (action: ScoutAction) => {
    const { action: actionType, subAction } = action
    let homeScored = false
    let awayScored = false

    // === LÓGICA DE PONTUAÇÃO ===

    // SAQUE
    if (actionType === 'serve') {
      if (subAction === 'ace') {
        rallyState.servingTeam === 'home' ? (homeScored = true) : (awayScored = true)
      } else if (subAction === 'error') {
        rallyState.servingTeam === 'home' ? (awayScored = true) : (homeScored = true)
      }
    }

    // RECEPÇÃO
    if (actionType === 'reception' && subAction === 'error') {
       rallyState.servingTeam === 'away' ? (awayScored = true) : (homeScored = true)
    }

    // LEVANTAMENTO
    if (actionType === 'set' && subAction === 'error') {
       awayScored = true
    }

    // ATAQUE
    if (actionType === 'attack') {
      if (subAction === 'kill' || subAction === 'tip' || subAction === 'block_out') homeScored = true
      else if (subAction === 'error' || subAction === 'blocked') awayScored = true
    }

    // DEFESA
    if (actionType === 'dig' && subAction === 'error') awayScored = true

    // BLOQUEIO
    if (actionType === 'block') {
      if (subAction === 'kill_block' || subAction === 'point') homeScored = true
      else if (subAction === 'error') awayScored = true
    }

    // ERRO DO ADVERSÁRIO (Genérico)
    if (actionType === 'opponent_error') {
      homeScored = true
    }

    // Atualizar estado
    if (homeScored) {
      const isSideOut = rallyState.servingTeam === 'away'

      setScore(prev => ({ ...prev, home: prev.home + 1 }))

      // Rotação SÓ acontece quando recuperamos o saque (Side-out)
      if (isSideOut) {
        nextRotation()
        setServingTeam('home')
      }

      // Registrar ponto no histórico
      const newPoint: PointRecord = {
        id: `point-${Date.now()}`,
        set: currentSet,
        score: { home: score.home + 1, away: score.away },
        winner: 'home',
        actions: [...rallyState.rallyActions, action],
        timestamp: new Date()
      }
      setHistory(prev => [...prev, newPoint])

      resetRally('home')
    } else if (awayScored) {
      setScore(prev => ({ ...prev, away: prev.away + 1 }))

      setServingTeam('away')

      // Registrar ponto no histórico
      const newPoint: PointRecord = {
        id: `point-${Date.now()}`,
        set: currentSet,
        score: { home: score.home, away: score.away + 1 },
        winner: 'away',
        actions: [...rallyState.rallyActions, action],
        timestamp: new Date()
      }
      setHistory(prev => [...prev, newPoint])

      resetRally('away')
    } else {
      // Se a ação registrada é diferente do step atual (ex: dig durante step block),
      // usar o actionType como base para determinar o próximo step
      const effectiveStep: RallyStep = (actionType !== rallyState.currentStep && ['serve', 'reception', 'block', 'dig', 'set', 'attack'].includes(actionType))
        ? actionType as RallyStep
        : rallyState.currentStep
      const nextStep = getNextRallyStep(effectiveStep, rallyState.servingTeam, subAction)
      if (nextStep) {
        setRallyState(prev => ({
          ...prev,
          currentStep: nextStep,
          rallyActions: [...prev.rallyActions, action]
        }))
      } else {
        resetRally(rallyState.servingTeam)
      }
    }
  }

  const resetRally = (nextServingTeam: ServingTeam) => {
    setCurrentRallyId(`rally-${Date.now()}`)
    setRallyState({
      servingTeam: nextServingTeam,
      currentStep: 'serve',
      rallyActions: []
    })
  }

  const registerAction = (action: ScoutAction) => {
    // Enriquecer ação com phase, rallyId, rotation e servingTeam no momento do registro
    const phase: 'sideout' | 'transition' =
      rallyState.servingTeam === 'away' ? 'sideout' : 'transition'
    const enrichedAction: ScoutAction = {
      ...action,
      phase,
      rallyId: currentRallyId,
      rotation,
      servingTeam: rallyState.servingTeam,
    }

    // Salvar snapshot ANTES de processar a ação
    const snapshot: GameSnapshot = {
      action: enrichedAction,
      score: { ...score },
      rotation,
      servingTeam,
      rallyState: {
        servingTeam: rallyState.servingTeam,
        currentStep: rallyState.currentStep,
        rallyActions: [...rallyState.rallyActions],
      },
      history: [...history],
    }

    setUndoStack(prev => {
      const newStack = [...prev, snapshot]
      // Limitar a MAX_UNDO_STACK
      if (newStack.length > MAX_UNDO_STACK) {
        return newStack.slice(newStack.length - MAX_UNDO_STACK)
      }
      return newStack
    })

    setActions(prev => [...prev, enrichedAction])
    setLastRegisteredAction(enrichedAction)
    processActionResult(enrichedAction)
  }

  // Desfazer última ação com restauração completa do estado
  const undoLastAction = (): ScoutAction | null => {
    if (undoStack.length === 0 || actions.length === 0) return null

    const lastSnapshot = undoStack[undoStack.length - 1]

    // Restaurar estado completo
    setScore(lastSnapshot.score)
    setRotation(lastSnapshot.rotation)
    setServingTeam(lastSnapshot.servingTeam)
    setRallyState(lastSnapshot.rallyState)
    setHistory(lastSnapshot.history)
    setActions(prev => prev.slice(0, -1))

    // Remover snapshot do stack
    setUndoStack(prev => prev.slice(0, -1))
    setLastRegisteredAction(null)

    return lastSnapshot.action
  }

  // Remover uma ação específica do rally atual (por index)
  const removeRallyAction = (actionIndex: number): ScoutAction | null => {
    const targetAction = rallyState.rallyActions[actionIndex]
    if (!targetAction) return null

    const remainingActions = rallyState.rallyActions.filter((_, i) => i !== actionIndex)

    // Recalcular currentStep re-executando a cadeia de getNextRallyStep
    let recalculatedStep: RallyStep = 'serve'
    for (const act of remainingActions) {
      const next = getNextRallyStep(recalculatedStep, rallyState.servingTeam, act.subAction)
      if (next) {
        recalculatedStep = next
      }
    }

    // Atualizar rally com ações restantes e step recalculado
    setRallyState(prev => ({
      ...prev,
      currentStep: recalculatedStep,
      rallyActions: remainingActions,
    }))

    // Remover das ações globais
    setActions(prev => prev.filter(a => a.id !== targetAction.id))

    // Remover snapshot correspondente do undo stack
    setUndoStack(prev => prev.filter(s => s.action.id !== targetAction.id))

    return targetAction
  }

  const loadSavedData = () => {
    if (hasStoredMatch()) {
      const loadedActions = loadMatchActions()
      if (loadedActions.length > 0) {
        setActions(loadedActions)
      }
    }

    const savedLineup = localStorage.getItem('scout-team-lineup')
    if (savedLineup) setCourtPositions(JSON.parse(savedLineup))

    const savedScore = localStorage.getItem('scout-team-score')
    if (savedScore) setScore(JSON.parse(savedScore))
    const savedSet = localStorage.getItem('scout-team-set')
    if (savedSet) setCurrentSet(parseInt(savedSet))
  }

  const substitutePlayer = (playerOutId: string, playerInId: string) => {
    // Atualizar posições na quadra
    setCourtPositions(prev => {
      const newPositions = { ...prev }
      const positionKey = Object.keys(newPositions).find(
        key => newPositions[key as unknown as keyof CourtPositions] === playerOutId
      ) as unknown as keyof CourtPositions

      if (positionKey) {
        newPositions[positionKey] = playerInId
      }
      return newPositions
    })

    // Registrar substituição no histórico
    const subAction: ScoutAction = {
      id: `sub-${Date.now()}`,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      player: playerInId,
      action: 'substitution',
      subAction: `out:${playerOutId}`,
      zone: 0,
      coordinates: { x: 0, y: 0 },
      timestamp: new Date(),
      matchId: gameConfig?.gameId,
      set: currentSet
    }

    setRallyState(prev => ({
      ...prev,
      rallyActions: [...prev.rallyActions, subAction]
    }))
  }

  // ============================================================================
  // EDIÇÃO E EXCLUSÃO DE PONTOS DO HISTÓRICO
  // ============================================================================

  const ROTATION_ORDER = [1, 6, 5, 4, 3, 2]

  /** Ações terminais que definem o vencedor de um ponto */
  const TERMINAL_HOME_POINT = new Set(['kill', 'tip', 'block_out', 'kill_block', 'point'])
  const TERMINAL_AWAY_POINT_ATTACK = new Set(['error', 'blocked'])
  const TERMINAL_HOME_SERVE = new Set(['ace'])

  /** Determina o vencedor de um ponto pelas ações do rally */
  const determineWinner = (rallyActions: ScoutAction[]): 'home' | 'away' => {
    // Percorre de trás pra frente para encontrar a ação terminal
    for (let i = rallyActions.length - 1; i >= 0; i--) {
      const a = rallyActions[i]
      if (a.action === 'opponent_error') return 'home'
      if (a.action === 'attack') {
        if (TERMINAL_HOME_POINT.has(a.subAction)) return 'home'
        if (TERMINAL_AWAY_POINT_ATTACK.has(a.subAction)) return 'away'
      }
      if (a.action === 'serve') {
        if (TERMINAL_HOME_SERVE.has(a.subAction)) return 'home'
        if (a.subAction === 'error') return 'away'
      }
      if (a.action === 'block') {
        if (a.subAction === 'kill_block' || a.subAction === 'point') return 'home'
        if (a.subAction === 'error') return 'away'
      }
      if (a.action === 'reception' && a.subAction === 'error') return 'away'
      if (a.action === 'set' && a.subAction === 'error') return 'away'
      if (a.action === 'dig' && a.subAction === 'error') return 'away'
    }
    return 'home' // fallback
  }

  /** Recalcula placar, rotação e servingTeam de startIndex em diante */
  const recalculateFromIndex = (
    hist: PointRecord[],
    startIndex: number,
    initialScore: { home: number; away: number },
    initialRotation: number,
    initialServingTeam: ServingTeam
  ): {
    history: PointRecord[]
    score: { home: number; away: number }
    rotation: number
    servingTeam: ServingTeam
  } => {
    const newHistory = [...hist]
    let curScore = { ...initialScore }
    let curRotation = initialRotation
    let curServingTeam = initialServingTeam

    for (let i = startIndex; i < newHistory.length; i++) {
      const point = { ...newHistory[i] }
      const winner = determineWinner(point.actions)

      if (winner === 'home') {
        curScore = { home: curScore.home + 1, away: curScore.away }
        // Side-out: rotação quando recuperamos o saque
        if (curServingTeam === 'away') {
          const rotIdx = ROTATION_ORDER.indexOf(curRotation)
          curRotation = ROTATION_ORDER[(rotIdx + 1) % ROTATION_ORDER.length]
          curServingTeam = 'home'
        }
      } else {
        curScore = { home: curScore.home, away: curScore.away + 1 }
        curServingTeam = 'away'
      }

      point.score = { ...curScore }
      point.winner = winner
      newHistory[i] = point
    }

    return { history: newHistory, score: curScore, rotation: curRotation, servingTeam: curServingTeam }
  }

  /** Calcula estado base antes de um dado índice no histórico (mesmo set) */
  const getBaseStateBeforeIndex = (hist: PointRecord[], index: number, setNumber: number) => {
    let baseScore = { home: 0, away: 0 }
    let baseRotation = gameConfig?.rotationStart?.[0] || 1
    let baseServingTeam: ServingTeam = 'home'

    // Somar pontos do mesmo set anteriores ao index
    for (let i = 0; i < index; i++) {
      if (hist[i].set !== setNumber) continue
      if (hist[i].winner === 'home') {
        baseScore.home++
        if (baseServingTeam === 'away') {
          const rotIdx = ROTATION_ORDER.indexOf(baseRotation)
          baseRotation = ROTATION_ORDER[(rotIdx + 1) % ROTATION_ORDER.length]
          baseServingTeam = 'home'
        }
      } else {
        baseScore.away++
        baseServingTeam = 'away'
      }
    }

    return { baseScore, baseRotation, baseServingTeam }
  }

  /** Exclui um ponto do histórico e recalcula tudo */
  const deleteHistoryPoint = (pointId: string) => {
    const pointIndex = history.findIndex(p => p.id === pointId)
    if (pointIndex === -1) return

    const point = history[pointIndex]
    const actionIds = new Set(point.actions.map(a => a.id))

    // Remover ações do array global
    const newActions = actions.filter(a => !actionIds.has(a.id))

    // Remover o ponto do histórico
    const newHistory = history.filter(p => p.id !== pointId)

    // Recalcular do ponto removido em diante
    const { baseScore, baseRotation, baseServingTeam } = getBaseStateBeforeIndex(newHistory, pointIndex, point.set)
    const result = recalculateFromIndex(newHistory, pointIndex, baseScore, baseRotation, baseServingTeam)

    setHistory(result.history)
    setActions(newActions)
    setScore(result.score)
    setRotation(result.rotation)
    setServingTeam(result.servingTeam)
    // Resetar rally para o estado inicial com o servingTeam recalculado
    setCurrentRallyId(`rally-${Date.now()}`)
    setRallyState({
      servingTeam: result.servingTeam,
      currentStep: 'serve',
      rallyActions: [],
    })
    setUndoStack([]) // Limpar undo stack (estado mudou significativamente)
  }

  /** Edita uma sub-ação dentro de um ponto do histórico */
  const editHistoryAction = (pointId: string, actionIndex: number, newSubAction: string) => {
    const pointIndex = history.findIndex(p => p.id === pointId)
    if (pointIndex === -1) return

    const point = history[pointIndex]
    const targetAction = point.actions[actionIndex]
    if (!targetAction) return

    // Atualizar efficiencyValue
    const entry = getScoutActionEntry(targetAction.action, newSubAction)
    const newEfficiency = entry?.efficiencyValue ?? 0

    // Criar ação atualizada
    const updatedAction: ScoutAction = {
      ...targetAction,
      subAction: newSubAction,
      efficiencyValue: newEfficiency,
    }

    // Atualizar nas ações do ponto
    const updatedPointActions = [...point.actions]
    updatedPointActions[actionIndex] = updatedAction

    // Atualizar no array global de actions
    const newActions = actions.map(a => a.id === targetAction.id ? updatedAction : a)

    // Atualizar o ponto com as novas ações
    const newHistory = [...history]
    newHistory[pointIndex] = { ...point, actions: updatedPointActions }

    // Recalcular vencedor e placares a partir deste ponto
    const { baseScore, baseRotation, baseServingTeam } = getBaseStateBeforeIndex(newHistory, pointIndex, point.set)
    const result = recalculateFromIndex(newHistory, pointIndex, baseScore, baseRotation, baseServingTeam)

    setHistory(result.history)
    setActions(newActions)
    setScore(result.score)
    setRotation(result.rotation)
    setServingTeam(result.servingTeam)
    // Resetar rally para o estado inicial com o servingTeam recalculado
    setCurrentRallyId(`rally-${Date.now()}`)
    setRallyState({
      servingTeam: result.servingTeam,
      currentStep: 'serve',
      rallyActions: [],
    })
    setUndoStack([]) // Limpar undo stack
  }

  // Restaurar estado da sessão salva (para feature de retomar scout)
  const restoreSession = (session: {
    servingTeam: ServingTeam
    rotation: number
    history: PointRecord[]
  }) => {
    setServingTeam(session.servingTeam)
    setRotation(session.rotation)
    setHistory(session.history)
    setRallyState({
      servingTeam: session.servingTeam,
      currentStep: 'serve',
      rallyActions: [],
    })
    setUndoStack([])
  }

  return {
    score,
    setScore,
    currentSet,
    setCurrentSet,
    rotation,
    setRotation,
    servingTeam,
    setServingTeam,
    rallyState,
    setRallyState,
    courtPositions,
    setCourtPositions,
    actions,
    registerAction,
    nextRotation,
    previousRotation,
    history,
    incrementScore,
    decrementScore,
    resetRally,
    substitutePlayer,
    undoLastAction,
    removeRallyAction,
    deleteHistoryPoint,
    editHistoryAction,
    lastRegisteredAction,
    canUndo: undoStack.length > 0,
    restoreSession,
  }
}
