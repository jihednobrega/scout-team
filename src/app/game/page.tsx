// app/game/page.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Image from 'next/image'
import {
  Box,
  Flex,
  Heading,
  Text,
  Badge,
  Button,
  Checkbox,
  Input,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useToast,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
} from '@chakra-ui/react'
import VolleyballCourt from '@/components/court/VolleyballCourt'
import ActionPanel from '@/components/court/ActionPanel'
import GameStepper from '@/components/game/GameStepper'
import RallyFlow from '@/components/court/RallyFlow'
import LineupModal from '@/components/court/LineupModal'
import Scoreboard from '@/components/game/Scoreboard'
import RotationControls from '@/components/game/RotationControls'
import ActionLog from '@/components/game/ActionLog'
import PointHistoryList from '@/components/game/PointHistoryList'
import RallyDetailsModal from '@/components/game/RallyDetailsModal'
import { useVolleyGame } from '@/hooks/useVolleyGame'
import { useMatchPersistence } from '@/hooks/useMatchPersistence'
import {
  loadScoutSession,
  saveScoutSession,
  clearScoutSession,
  clearCurrentMatch,
  type ScoutSessionState,
} from '@/utils/storage'
import {
  GameConfig,
  CourtPositions,
  PointRecord,
  ScoutAction,
  ServeType,
} from '@/types/scout'
import { SetInfo } from '@/types/game'
import { useTeamContext } from '@/contexts/TeamContext'
import { usePlayersAPI } from '@/hooks/usePlayersAPI'
import { useTeams } from '@/hooks/useTeams'
import { useScoutTips } from '@/hooks/useScoutTips'
import { usePlayerPresetsAPI, type PlayerPreset } from '@/hooks/usePlayerPresetsAPI'
import { getActionLabel as getActionLabelCentral, getActionName } from '@/lib/actionLabels'

export default function ScoutPage() {
  const router = useRouter()
  const { showTips, toggleTips } = useScoutTips()

  // Step: 1 = form, 2 = atletas, 3 = scout
  const [step, setStep] = useState(1)
  const [customSets, setCustomSets] = useState('')
  const [enabledFundamentos, setEnabledFundamentos] = useState<string[]>([
    'serve', 'reception', 'attack', 'block', 'dig', 'set',
  ])
  
  const [form, setForm] = useState({
    opponent: '',
    event: '',
    location: '',
    sets: '5',
    date: new Date().toISOString().split('T')[0],
    time: '20:00',
  })
  const [formError, setFormError] = useState('')

  // Contexto de equipe selecionada
  const { selectedTeamId } = useTeamContext()
  const { teams } = useTeams()
  const selectedTeam = teams.find((team) => team.id === selectedTeamId)
  
  const {
    players,
    loading: loadingPlayers,
  } = usePlayersAPI(selectedTeamId)
  
  // Atletas selecionados para o jogo
  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [playerSelectError, setPlayerSelectError] = useState('')
  const [positionFilter, setPositionFilter] = useState('todos')

  // Líbero selecionado para o jogo
  const [liberoId, setLiberoId] = useState('')

  // Presets de seleção de atletas (persistidos no banco)
  const { presets, createPreset, deletePreset: deletePresetAPI } = usePlayerPresetsAPI(selectedTeamId)
  const [presetName, setPresetName] = useState('')
  const [showSavePreset, setShowSavePreset] = useState(false)

  const handleSelectAll = () => {
    const allIds = players.map(p => p.id)
    const allSelected = allIds.length > 0 && allIds.every(id => selectedPlayers.includes(id))
    setSelectedPlayers(allSelected ? [] : allIds)
  }

  const handleApplyPreset = (preset: PlayerPreset) => {
    const validIds = preset.playerIds.filter(id => players.some(p => p.id === id))
    setSelectedPlayers(validIds)
  }

  const handleSavePreset = async () => {
    const name = presetName.trim()
    if (!name || selectedPlayers.length === 0) return
    await createPreset(name, [...selectedPlayers])
    setPresetName('')
    setShowSavePreset(false)
  }

  const handleDeletePreset = async (id: string) => {
    await deletePresetAPI(id)
  }

  // Configuração do jogo
  const [gameConfig, setGameConfig] = useState<GameConfig | null>(null)
  
  // Hook de Lógica do Jogo
  const {
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
    substitutePlayer,
    undoLastAction,
    removeRallyAction,
    deleteHistoryPoint,
    editHistoryAction,
    lastRegisteredAction,
    canUndo,
    restoreSession,
  } = useVolleyGame({ gameConfig })

  // Histórico de sets finalizados
  const [setsHistory, setSetsHistory] = useState<SetInfo[]>([])
  const [isEndSetDialogOpen, setIsEndSetDialogOpen] = useState(false)
  const [isEndMatchDialogOpen, setIsEndMatchDialogOpen] = useState(false)
  const [endMatchConfirmed, setEndMatchConfirmed] = useState(false)

  // Retomada de scout
  const [restoredDbMatchId, setRestoredDbMatchId] = useState<string | null>(null)
  const [resumeData, setResumeData] = useState<ScoutSessionState | null>(null)

  // Persistência no banco de dados
  const {
    saveStatus,
    dbMatchId,
    createMatchInDb,
    syncActions,
    saveAndPause,
    finalizeMatch,
  } = useMatchPersistence({
    gameConfig,
    actions,
    score,
    currentSet,
    setsHistory,
    rotation,
    servingTeam,
    initialDbMatchId: restoredDbMatchId,
  })

  const toast = useToast()

  // Helper para gerar label amigável de uma ação (centralizado)
  const getActionLabelForToast = (action: ScoutAction): string => {
    const fundamento = getActionName(action.action)
    const resultado = getActionLabelCentral(action.action, action.subAction)
    return `${fundamento} — ${resultado}`
  }

  // Toast de confirmação após cada ação registrada
  const lastToastedActionRef = useRef<string | null>(null)
  useEffect(() => {
    if (!lastRegisteredAction) return
    if (lastToastedActionRef.current === lastRegisteredAction.id) return
    lastToastedActionRef.current = lastRegisteredAction.id

    const actionLabel = getActionLabelForToast(lastRegisteredAction)
    const playerObj = players.find(
      (p) => p.jerseyNumber.toString() === lastRegisteredAction.player
    )
    const playerLabel = playerObj
      ? `#${playerObj.jerseyNumber} ${playerObj.name}`
      : lastRegisteredAction.player === '0'
      ? 'Adversário'
      : `#${lastRegisteredAction.player}`

    toast({
      position: 'bottom-left',
      duration: 3000,
      isClosable: true,
      render: ({ onClose }) => (
        <Box
          bg="gray.700"
          color="white"
          px={4}
          py={3}
          borderRadius="lg"
          shadow="xl"
          borderLeftWidth="4px"
          borderLeftColor="green.400"
          display="flex"
          alignItems="center"
          gap={3}
          minW="280px"
        >
          <Text flex="1" fontSize="sm">
            {playerLabel} — {actionLabel}
          </Text>
          <Button
            size="xs"
            variant="ghost"
            color="yellow.300"
            _hover={{ bg: 'gray.600' }}
            onClick={() => {
              handleUndoWithToast()
              onClose()
            }}
          >
            Desfazer
          </Button>
        </Box>
      ),
    })
  }, [lastRegisteredAction])

  const handleUndoWithToast = useCallback(() => {
    const undoneAction = undoLastAction()
    if (undoneAction) {
      const actionLabel = getActionLabelForToast(undoneAction)
      const playerObj = players.find(
        (p) => p.jerseyNumber.toString() === undoneAction.player
      )
      const playerLabel = playerObj
        ? `#${playerObj.jerseyNumber} ${playerObj.name}`
        : `#${undoneAction.player}`

      toast({
        position: 'bottom-left',
        duration: 2000,
        render: () => (
          <Box
            bg="gray.700"
            color="white"
            px={4}
            py={3}
            borderRadius="lg"
            shadow="xl"
            borderLeftWidth="4px"
            borderLeftColor="yellow.400"
            fontSize="sm"
          >
            Desfeito: {playerLabel} — {actionLabel}
          </Box>
        ),
      })
    }
  }, [undoLastAction, players, toast])

  // Finalizar set: salvar placar, avançar set, resetar placar
  const handleEndSet = useCallback(() => {
    const setInfo: SetInfo = {
      number: currentSet,
      homeScore: score.home,
      awayScore: score.away,
    }
    setSetsHistory((prev) => [...prev, setInfo])

    // Sync ações no banco
    syncActions()

    const finishedSet = currentSet
    const finishedScore = { ...score }

    // Avançar set e resetar placar
    setCurrentSet(currentSet + 1)
    setScore({ home: 0, away: 0 })

    // Limpar posições em quadra — overlay da quadra guia para o próximo set
    setCourtPositions({ 1: null, 2: null, 3: null, 4: null, 5: null, 6: null })
    setGameStarted(false)
    setIsLineupPhase(false)

    setIsEndSetDialogOpen(false)

    toast({
      position: 'top',
      duration: 3000,
      render: () => (
        <Box
          bg="blue.700"
          color="white"
          px={5}
          py={3}
          borderRadius="lg"
          shadow="xl"
          fontSize="md"
          fontWeight="bold"
          textAlign="center"
        >
          Set {finishedSet} finalizado: {finishedScore.home} x {finishedScore.away}
        </Box>
      ),
    })
  }, [currentSet, score, syncActions, toast, setCurrentSet, setScore])

  // Finalizar partida: salvar tudo no banco
  const handleEndMatch = useCallback(async () => {
    // Incluir set atual se tem pontos
    let finalSets = [...setsHistory]
    if (score.home > 0 || score.away > 0) {
      finalSets.push({
        number: currentSet,
        homeScore: score.home,
        awayScore: score.away,
      })
    }

    const success = await finalizeMatch(finalSets, score)

    setIsEndMatchDialogOpen(false)

    if (success) {
      toast({
        title: 'Partida salva!',
        description: 'Todos os dados foram salvos no banco de dados.',
        status: 'success',
        duration: 4000,
        isClosable: true,
        position: 'top',
      })
      // Redirecionar para histórico
      setTimeout(() => router.push('/history'), 1500)
    } else {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a partida. Tente novamente.',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      })
    }
  }, [setsHistory, score, currentSet, finalizeMatch, toast, router])

  // Estados de UI do jogo
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [initialServer, setInitialServer] = useState<'home' | 'away'>('home')
  const [initialRotation, setInitialRotation] = useState('1')
  const [hasStarted, setHasStarted] = useState(false)
  const [showLineupModal, setShowLineupModal] = useState(false)
  const [isLineupPhase, setIsLineupPhase] = useState(false)
  
  // Estado para modal de detalhes do rally (armazena ID para manter sincronia com history)
  const [selectedPointId, setSelectedPointId] = useState<string | null>(null)
  const selectedPoint = selectedPointId ? history.find(p => p.id === selectedPointId) ?? null : null
  const isRallyModalOpen = !!selectedPoint

  const isStartConfirmDisabled = initialServer === 'home' && !initialRotation

  const handleInitialServerChange = (value: 'home' | 'away') => {
    setInitialServer(value)
    if (value === 'home') {
      setInitialRotation('1')
    } else {
      setInitialRotation('2')
    }
  }

  // Etapa 1: Confirmar configuração inicial → entra na fase de escalação
  const handleConfirmConfig = () => {
    const nextRot = Number(initialRotation) || (initialServer === 'home' ? 1 : 2)
    setServingTeam(initialServer)
    setRotation(nextRot)
    setRallyState((prev) => ({
      ...prev,
      servingTeam: initialServer,
      currentStep: 'serve',
      rallyActions: [],
    }))
    setIsStartDialogOpen(false)
    setIsLineupPhase(true)
  }

  // Etapa 2: Escalação completa → iniciar scout
  const handleStartScout = async () => {
    setIsLineupPhase(false)
    setHasStarted(true)
    setGameStarted(true)

    // Criar partida no banco de dados
    const matchId = await createMatchInDb()
    if (matchId) {
      toast({
        title: 'Partida criada',
        description: 'Salvamento automático ativado.',
        status: 'info',
        duration: 2000,
        position: 'bottom-right',
      })
    }
  }

  // Legacy: manter para reiniciar (pula config, vai direto pro scout)
  const handleConfirmStart = async () => {
    const nextRot = Number(initialRotation) || (initialServer === 'home' ? 1 : 2)
    setServingTeam(initialServer)
    setRotation(nextRot)
    setRallyState((prev) => ({
      ...prev,
      servingTeam: initialServer,
      currentStep: 'serve',
      rallyActions: [],
    }))
    setHasStarted(true)
    setGameStarted(true)
    setIsStartDialogOpen(false)
    setIsLineupPhase(false)

    const matchId = await createMatchInDb()
    if (matchId) {
      toast({
        title: 'Partida criada',
        description: 'Salvamento automático ativado.',
        status: 'info',
        duration: 2000,
        position: 'bottom-right',
      })
    }
  }

  // Verifica a composição da equipe
  useEffect(() => {
    if (selectedPlayers.length >= 6) {
      const missingPositions = validateTeamComposition()
      if (missingPositions.length > 0) {
        const message = missingPositions
          .map(({ position, required, current }) => {
            const positionLabel =
              position.charAt(0).toUpperCase() + position.slice(1)
            return `${positionLabel}: ${current}/${required}`
          })
          .join('\n')

        setPlayerSelectError(`Composição incompleta da equipe:\n${message}`)
      } else {
        setPlayerSelectError('')
      }
    } else if (selectedPlayers.length > 0) {
      setPlayerSelectError('Selecione pelo menos 6 atletas para o jogo.')
    } else {
      setPlayerSelectError('')
    }
  }, [selectedPlayers])

  const handleFormChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>
  ) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
  }

  const handleSetsChange = (value: string) => {
    setForm((prev) => ({ ...prev, sets: value }))
    if (value !== 'custom') setCustomSets('')
  }

  const handleCustomSetsChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const value = e.target.value.replace(/\D/g, '')
    setCustomSets(value)
    setForm((prev) => ({ ...prev, sets: value }))
  }

  const handleAdvance = () => {
    if (!form.opponent || !form.sets || !form.date || !form.time) {
      setFormError('Preencha todos os campos obrigatórios.')
      return
    }
    if (form.sets === 'custom' && (!customSets || Number(customSets) < 1)) {
      setFormError('Informe a quantidade de sets personalizada.')
      return
    }
    setFormError('')
    setStep(2)
  }

  const validateTeamComposition = () => {
    const selectedPlayersList = selectedPlayers
      .map((id) => players.find((p) => p.id === id))
      .filter(Boolean)

    const positions = selectedPlayersList.reduce((acc, player) => {
      if (player) {
        acc[player.position] = (acc[player.position] || 0) + 1
      }
      return acc
    }, {} as Record<string, number>)

    const requirements = {
      ponteiro: 2,
      central: 2,
      levantador: 1,
      oposto: 1,
    }

    const missingPositions = []
    for (const [position, required] of Object.entries(requirements)) {
      const count = positions[position] || 0
      if (count < required) {
        missingPositions.push({
          position,
          required,
          current: count,
        })
      }
    }

    return missingPositions
  }

  const handleAdvanceToScout = () => {
    if (selectedPlayers.length < 6) {
      setPlayerSelectError('Selecione pelo menos 6 atletas para o jogo.')
      return
    }

    const missingPositions = validateTeamComposition()
    if (missingPositions.length > 0) {
      const message = missingPositions
        .map(({ position, required, current }) => {
          const positionLabel =
            position.charAt(0).toUpperCase() + position.slice(1)
          return `${positionLabel}: ${current}/${required}`
        })
        .join('\n')

      setPlayerSelectError(`Composição incompleta da equipe:\n${message}`)
      return
    } else {
      setPlayerSelectError('')
    }
    
    const setsValue =
      form.sets === 'custom' ? Number(customSets) : Number(form.sets)
    
    const lineup = selectedPlayers.map((playerId) => ({
      playerId,
      jerseyNumber: 0, // Placeholder
      playerName: '', // Placeholder
      position: '', // Placeholder
      isStarter: false,
      rotationOrder: undefined,
    }))
    
    const config: GameConfig = {
      gameId: `game-${Date.now()}`,
      teamId: selectedTeamId || '',
      teamName: selectedTeam?.name || 'Seu Time',
      opponentName: form.opponent,
      tournament: form.event,
      location: form.location,
      matchType: 'friendly', // Default
      sets: setsValue,
      date: new Date(form.date),
      time: form.time,
      modelId: 'default',
      modelName:
        form.sets === '3'
          ? 'Melhor de 3'
          : form.sets === '5'
          ? 'Melhor de 5'
          : 'Personalizado',
      rotationStart: [1],
      lineup,
      liberoId,
      enabledFundamentos,
      advanced: {
          useEPV: false,
          trackReceptionGradeAgainst: false,
          enableContextHashing: false,
          collectBlockersCount: false,
          collectChainId: false,
          enableXSR: false,
          enableEntropy: false
      },
      createdAt: new Date()
    }
    
    localStorage.setItem('current-game-config', JSON.stringify(config))
    setGameConfig(config)
    setStep(3)
  }

  // Carregar configuração do jogo ao montar
  useEffect(() => {
    // Verificar se há sessão salva para retomada
    const session = loadScoutSession()
    if (session) {
      const savedConfig = localStorage.getItem('current-game-config')
      if (savedConfig && session.teamId === selectedTeamId) {
        // Há sessão para retomar — mostrar card de retomada no step 1
        setResumeData(session)
        try {
          const config = JSON.parse(savedConfig)
          const normalizedConfig = {
            ...config,
            date: config.date ? new Date(config.date) : new Date(),
            createdAt: config.createdAt ? new Date(config.createdAt) : new Date(),
          }
          setGameConfig(normalizedConfig)
        } catch { /* config inválida */ }
        return // Ficar no step 1 para mostrar card de retomada
      } else {
        // Sessão de outra equipe ou config ausente — limpar
        clearScoutSession()
        clearCurrentMatch()
        localStorage.removeItem('current-game-config')
        localStorage.removeItem('scout-team-lineup')
        localStorage.removeItem('scout-team-score')
        localStorage.removeItem('scout-team-set')
      }
    }

    const savedConfig = localStorage.getItem('current-game-config')
    if (savedConfig) {
      try {
        const config = JSON.parse(savedConfig)
        // Normalização de datas
        const normalizedConfig = {
          ...config,
          date: config.date ? new Date(config.date) : new Date(),
          createdAt: config.createdAt ? new Date(config.createdAt) : new Date(),
        }
        setGameConfig(normalizedConfig)

        // Restaurar estados do form
        setForm((prev) => ({
          ...prev,
          opponent: normalizedConfig.opponentName || prev.opponent,
          event: normalizedConfig.tournament || prev.event,
          location: normalizedConfig.location || prev.location,
          date: normalizedConfig.date
            ? normalizedConfig.date.toISOString().slice(0, 10)
            : prev.date,
          time: normalizedConfig.time || prev.time,
        }))

        setSelectedPlayers(
          normalizedConfig.lineup.map((player: any) => player.playerId)
        )

        if (normalizedConfig.enabledFundamentos) {
          setEnabledFundamentos(normalizedConfig.enabledFundamentos)
        }

        if (normalizedConfig.liberoId) {
          setLiberoId(normalizedConfig.liberoId)
        }

        setStep(3)
      } catch (error) {
        console.error('Erro ao carregar config:', error)
      }
    }
  }, []) // eslint-disable-line react-hooks/exhaustive-deps

  // ── Retomar sessão salva ──
  const handleResume = () => {
    const session = loadScoutSession()
    if (!session || !gameConfig) return

    // Restaurar flags de UI
    setGameStarted(session.gameStarted)
    setHasStarted(session.hasStarted)
    setSetsHistory(session.setsHistory as SetInfo[])

    // Restaurar lineup de atletas
    setSelectedPlayers(
      gameConfig.lineup.map((p: any) => p.playerId)
    )
    if (gameConfig.liberoId) setLiberoId(gameConfig.liberoId)
    if (gameConfig.enabledFundamentos) setEnabledFundamentos(gameConfig.enabledFundamentos)

    // Reconnect com a partida no banco
    setRestoredDbMatchId(session.dbMatchId)

    // Restaurar estado do jogo (servingTeam, rotation, history)
    restoreSession({
      servingTeam: session.servingTeam,
      rotation: session.rotation,
      history: session.history.map(h => ({
        ...h,
        timestamp: new Date(h.timestamp),
        actions: h.actions.map(a => ({ ...a, timestamp: new Date(a.timestamp) })),
      })),
    })

    setStep(3)
    setResumeData(null)
  }

  const handleDiscardSession = () => {
    clearScoutSession()
    clearCurrentMatch()
    localStorage.removeItem('current-game-config')
    localStorage.removeItem('scout-team-lineup')
    localStorage.removeItem('scout-team-score')
    localStorage.removeItem('scout-team-set')
    setResumeData(null)
    setGameConfig(null)
  }

  const handleSaveAndExit = async () => {
    const success = await saveAndPause()

    if (success) {
      saveScoutSession({
        dbMatchId: dbMatchId!,
        setsHistory,
        servingTeam,
        rotation,
        history: history.map(h => ({
          ...h,
          timestamp: h.timestamp instanceof Date ? h.timestamp.toISOString() : h.timestamp,
          actions: h.actions.map(a => ({
            ...a,
            timestamp: a.timestamp instanceof Date ? a.timestamp : new Date(a.timestamp),
          })),
        })) as ScoutSessionState['history'],
        gameStarted,
        hasStarted,
        savedAt: new Date().toISOString(),
        teamId: selectedTeamId || '',
      })

      toast({
        title: 'Partida salva!',
        description: 'Volte quando quiser para continuar o scout.',
        status: 'success',
        duration: 3000,
        position: 'top',
      })

      router.push('/dashboard')
    } else {
      toast({
        title: 'Erro ao salvar',
        description: 'Não foi possível salvar a partida. Tente novamente.',
        status: 'error',
        duration: 4000,
        position: 'top',
      })
    }
  }

  // ── Painel direito persistente (ActionPanel inline) ──
  const [sidebarSelectedPlayer, setSidebarSelectedPlayer] = useState<string | null>(null)
  const [sidebarFundamento, setSidebarFundamento] = useState<string>('serve')
  const [sidebarFilteredFundamentos, setSidebarFilteredFundamentos] = useState<string[] | undefined>(undefined)
  const [sidebarServeType, setSidebarServeType] = useState<ServeType>('float')
  const [sidebarPendingZone, setSidebarPendingZone] = useState<{ action: string } | null>(null)
  const courtActionRef = useRef<((action: string, subAction: string, zone?: number, serveType?: ServeType) => void) | null>(null)

  const handleSidebarPlayerSelected = useCallback((
    jersey: string | null, fundamentos: string[] | undefined, fundamento: string
  ) => {
    setSidebarSelectedPlayer(jersey)
    setSidebarPendingZone(null)
    if (jersey !== null) {
      setSidebarFilteredFundamentos(fundamentos)
      setSidebarFundamento(fundamento)
    }
  }, [])

  const handleSidebarFundamentoChange = useCallback((f: string) => {
    setSidebarFundamento(f)
  }, [])

  const handleSidebarPendingZoneChange = useCallback((isPending: boolean, actionName?: string) => {
    setSidebarPendingZone(isPending && actionName ? { action: actionName } : null)
  }, [])

  const handleSidebarActionComplete = useCallback((
    action: string, subAction: string, zone?: number, serveType?: ServeType
  ) => {
    courtActionRef.current?.(action, subAction, zone, serveType)
  }, [])

  const handlePageOpponentError = useCallback(() => {
    registerAction({
      id: `action-${Date.now()}`,
      time: new Date().toLocaleTimeString('pt-BR', { hour: '2-digit', minute: '2-digit' }),
      player: '0',
      action: 'opponent_error',
      subAction: 'error',
      zone: 0,
      coordinates: { x: 0, y: 0 },
      timestamp: new Date(),
    })
  }, [registerAction])

  const homeTeamName = gameConfig?.teamName || selectedTeam?.name || 'Seu Time'
  const opponentName = gameConfig?.opponentName || form.opponent || 'Adversário'
  const tournamentName = gameConfig?.tournament || form.event || 'Campeonato'
  const locationName = gameConfig?.location || form.location || 'Local a definir'
  const matchDateValue = gameConfig?.date ? new Date(gameConfig.date) : new Date(form.date)
  const formattedMatchDate = matchDateValue.toLocaleDateString('pt-BR')
  const matchTimeValue = gameConfig?.time || form.time || ''
  const formattedMatchTime = matchTimeValue || 'Horário a definir'
  const parsedSetCount = form.sets === 'custom' ? Number(customSets) : Number(form.sets)
  const totalSets = Number.isFinite(parsedSetCount) && parsedSetCount > 0 ? parsedSetCount : null

  // Handler para mudança de posição na quadra
  const handlePositionChange = (position: number, playerId: string | null) => {
    setCourtPositions((prev) => ({
      ...prev,
      [position]: playerId,
    }))
  }

  const positionBorderColor: Record<string, string> = {
    ponteiro: 'purple.500',
    central: 'teal.500',
    levantador: 'blue.500',
    oposto: 'orange.500',
    libero: 'yellow.500',
  }

  const positionDisplayLabel: Record<string, string> = {
    ponteiro: 'Ponteiro',
    central: 'Central',
    levantador: 'Levantador',
    oposto: 'Oposto',
    libero: 'Líbero',
  }

  const positionTextColor: Record<string, string> = {
    ponteiro: 'purple.300',
    central: 'teal.300',
    levantador: 'blue.300',
    oposto: 'orange.300',
    libero: 'yellow.300',
  }

  const togglePlayer = (id: string) => {
    setSelectedPlayers((prev) =>
      prev.includes(id) ? prev.filter((pid) => pid !== id) : [...prev, id]
    )
  }

  const positionCounts = selectedPlayers.reduce((acc, id) => {
    const p = players.find((pl) => pl.id === id)
    if (p) acc[p.position] = (acc[p.position] || 0) + 1
    return acc
  }, {} as Record<string, number>)

  const hasLiberoInSquad = players.some((p) => p.position === 'libero')
  const liberoCount = positionCounts['libero'] || 0

  const filteredPlayers = positionFilter === 'todos'
    ? players
    : players.filter((p) => p.position === positionFilter)

  const courtPlayerIds = new Set(
    Object.values(courtPositions).filter((id): id is string => Boolean(id))
  )

  return (
    <Box
      position="relative"
    >
      {step === 1 && (
        <>
          {/* Topbar de navegação */}
          <Flex
            px={6} py={3}
            align="center"
            borderBottomWidth="1px"
            borderBottomColor="gray.800"
            mb={8}
          >
            <Button
              variant="ghost"
              size="sm"
              color="gray.500"
              _hover={{ color: 'gray.200', bg: 'gray.800' }}
              onClick={() => router.push('/dashboard')}
              fontWeight="normal"
            >
              ← Dashboard
            </Button>
            <Box flex="1" display="flex" justifyContent="center">
              <GameStepper currentStep={1} />
            </Box>
          </Flex>

          <Box maxW="860px" mx="auto" px={6} pb={12}>
            {/* Banner de retomada — proeminente quando há sessão */}
            {resumeData && (
              <Box
                mb={6}
                borderRadius="xl"
                borderWidth="1px"
                borderColor="green.700"
                bg="green.950"
                overflow="hidden"
              >
                <Flex px={5} py={3} align="center" gap={3} borderBottomWidth="1px" borderBottomColor="green.800/50">
                  <Box w="8px" h="8px" borderRadius="full" bg="green.400" flexShrink={0} className="pulse-live" />
                  <Text color="green.300" fontWeight="bold" fontSize="sm">Partida em andamento</Text>
                </Flex>
                <Flex px={5} py={4} align="center" gap={6}>
                  <Box flex="1">
                    <Text color="gray.400" fontSize="xs" mb={0.5}>Adversário</Text>
                    <Text color="white" fontWeight="bold" fontSize="lg">
                      {(() => {
                        try {
                          const cfg = JSON.parse(localStorage.getItem('current-game-config') || '{}')
                          return cfg.opponentName || 'Adversário'
                        } catch { return 'Adversário' }
                      })()}
                    </Text>
                  </Box>
                  <Flex gap={6}>
                    <Box textAlign="center">
                      <Text color="gray.500" fontSize="xs">Set atual</Text>
                      <Text color="white" fontWeight="bold" fontSize="xl">{(resumeData.setsHistory?.length || 0) + 1}</Text>
                    </Box>
                    <Box textAlign="center">
                      <Text color="gray.500" fontSize="xs">Placar</Text>
                      <Text color="white" fontWeight="bold" fontSize="xl">
                        {resumeData.setsHistory?.filter(s => s.homeScore > s.awayScore).length || 0}
                        {' × '}
                        {resumeData.setsHistory?.filter(s => s.awayScore > s.homeScore).length || 0}
                      </Text>
                    </Box>
                    <Box textAlign="center">
                      <Text color="gray.500" fontSize="xs">Salvo</Text>
                      <Text color="white" fontWeight="bold" fontSize="sm">
                        {new Date(resumeData.savedAt).toLocaleString('pt-BR', {
                          day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                        })}
                      </Text>
                    </Box>
                  </Flex>
                  <Flex gap={2} flexShrink={0}>
                    <Button colorScheme="green" size="sm" onClick={handleResume} fontWeight="bold">
                      Continuar partida
                    </Button>
                    <Button
                      variant="ghost" size="sm" color="gray.500"
                      _hover={{ color: 'red.300', bg: 'red.950' }}
                      onClick={handleDiscardSession}
                    >
                      Descartar
                    </Button>
                  </Flex>
                </Flex>
              </Box>
            )}

            {/* Título da seção */}
            <Box mb={6}>
              <Heading size="lg" color="white" fontWeight="bold">Nova Partida</Heading>
              <Text color="gray.500" fontSize="sm" mt={1}>Configure os dados da partida antes de montar a escalação.</Text>
            </Box>

            {/* Formulário em 2 colunas */}
            <Flex gap={6} align="flex-start">
              {/* Coluna esquerda: dados da partida */}
              <Box flex="1">
                <Text fontSize="xs" color="blue.400" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" mb={4}>
                  Dados da Partida
                </Text>

                <Box mb={4}>
                  <Text fontSize="sm" color="gray.300" mb={1.5} fontWeight="medium">
                    Equipe adversária <Text as="span" color="red.400">*</Text>
                  </Text>
                  <Input
                    name="opponent"
                    value={form.opponent}
                    onChange={handleFormChange}
                    placeholder="Ex: Vôlei Clube"
                    bg="gray.900"
                    color="white"
                    borderColor="gray.700"
                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3182ce' }}
                    _placeholder={{ color: 'gray.600' }}
                    size="md"
                  />
                </Box>

                <Box mb={4}>
                  <Text fontSize="sm" color="gray.300" mb={1.5} fontWeight="medium">
                    Evento / Campeonato <Text as="span" color="gray.600" fontSize="xs" fontWeight="normal">(opcional)</Text>
                  </Text>
                  <Input
                    name="event"
                    value={form.event}
                    onChange={handleFormChange}
                    placeholder="Ex: Copa Regional 2025"
                    bg="gray.900"
                    color="white"
                    borderColor="gray.700"
                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3182ce' }}
                    _placeholder={{ color: 'gray.600' }}
                  />
                </Box>

                <Box mb={4}>
                  <Text fontSize="sm" color="gray.300" mb={1.5} fontWeight="medium">
                    Local <Text as="span" color="gray.600" fontSize="xs" fontWeight="normal">(opcional)</Text>
                  </Text>
                  <Input
                    name="location"
                    value={form.location}
                    onChange={handleFormChange}
                    placeholder="Ex: Ginásio Municipal"
                    bg="gray.900"
                    color="white"
                    borderColor="gray.700"
                    _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3182ce' }}
                    _placeholder={{ color: 'gray.600' }}
                  />
                </Box>

                <Flex gap={3}>
                  <Box flex="1">
                    <Text fontSize="sm" color="gray.300" mb={1.5} fontWeight="medium">
                      Data <Text as="span" color="red.400">*</Text>
                    </Text>
                    <Input
                      name="date"
                      type="date"
                      value={form.date}
                      onChange={handleFormChange}
                      bg="gray.900"
                      color="white"
                      borderColor="gray.700"
                      _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3182ce' }}
                    />
                  </Box>
                  <Box flex="1">
                    <Text fontSize="sm" color="gray.300" mb={1.5} fontWeight="medium">
                      Hora <Text as="span" color="red.400">*</Text>
                    </Text>
                    <Input
                      name="time"
                      type="time"
                      value={form.time}
                      onChange={handleFormChange}
                      bg="gray.900"
                      color="white"
                      borderColor="gray.700"
                      _focus={{ borderColor: 'blue.500', boxShadow: '0 0 0 1px #3182ce' }}
                    />
                  </Box>
                </Flex>
              </Box>

              {/* Separador vertical */}
              <Box w="1px" bg="gray.800" alignSelf="stretch" flexShrink={0} />

              {/* Coluna direita: formato + fundamentos */}
              <Box w="340px" flexShrink={0}>
                <Text fontSize="xs" color="blue.400" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" mb={4}>
                  Configurações do Scout
                </Text>

                <Box mb={6}>
                  <Text fontSize="sm" color="gray.300" mb={3} fontWeight="medium">
                    Formato <Text as="span" color="red.400">*</Text>
                  </Text>
                  <Flex gap={2} mb={2}>
                    {(['3', '5', 'custom'] as const).map((val) => {
                      const label = val === '3' ? 'MD3' : val === '5' ? 'MD5' : 'Custom'
                      const sublabel = val === '3' ? 'Melhor de 3' : val === '5' ? 'Melhor de 5' : 'Personalizado'
                      const isSelected = form.sets === val
                      return (
                        <Box
                          key={val}
                          as="button"
                          flex="1"
                          py={3}
                          borderRadius="lg"
                          bg={isSelected ? 'blue.900' : 'gray.900'}
                          borderWidth="1px"
                          borderColor={isSelected ? 'blue.500' : 'gray.700'}
                          textAlign="center"
                          cursor="pointer"
                          transition="all 0.15s"
                          _hover={{ borderColor: 'blue.600', bg: 'blue.950' }}
                          onClick={() => handleSetsChange(val)}
                        >
                          <Text fontSize="md" fontWeight="bold" color={isSelected ? 'blue.200' : 'gray.400'}>
                            {label}
                          </Text>
                          <Text fontSize="2xs" color={isSelected ? 'blue.400' : 'gray.600'}>
                            {sublabel}
                          </Text>
                        </Box>
                      )
                    })}
                  </Flex>
                  {form.sets === 'custom' && (
                    <Flex align="center" gap={2} mt={2}>
                      <Text fontSize="sm" color="gray.400">Número de sets:</Text>
                      <Input
                        name="customSets"
                        type="number"
                        min={1}
                        max={10}
                        value={customSets}
                        onChange={handleCustomSetsChange}
                        placeholder="Ex: 4"
                        w="80px"
                        bg="gray.900"
                        color="white"
                        borderColor="gray.700"
                        size="sm"
                        textAlign="center"
                      />
                    </Flex>
                  )}
                </Box>

                <Box>
                  <Text fontSize="sm" color="gray.300" mb={1} fontWeight="medium">Fundamentos a registrar</Text>
                  <Text fontSize="xs" color="gray.600" mb={3}>
                    Saque, Recepção e Ataque são obrigatórios.
                  </Text>
                  <Flex gap={2} flexWrap="wrap">
                    {([
                      { key: 'serve', label: 'Saque', required: true },
                      { key: 'reception', label: 'Recepção', required: true },
                      { key: 'attack', label: 'Ataque', required: true },
                      { key: 'block', label: 'Bloqueio', required: false },
                      { key: 'dig', label: 'Defesa', required: false },
                      { key: 'set', label: 'Levantamento', required: false },
                    ] as const).map((fund) => {
                      const isActive = enabledFundamentos.includes(fund.key)
                      const pill = (
                        <Box
                          key={fund.key}
                          as="button"
                          px={3}
                          py={1.5}
                          borderRadius="full"
                          fontSize="xs"
                          fontWeight="medium"
                          bg={isActive ? 'green.900' : 'gray.800'}
                          color={isActive ? 'green.300' : 'gray.500'}
                          borderWidth="1px"
                          borderColor={isActive ? 'green.600' : 'gray.700'}
                          cursor={fund.required ? 'not-allowed' : 'pointer'}
                          opacity={fund.required ? 0.6 : 1}
                          onClick={() => {
                            if (fund.required) return
                            setEnabledFundamentos((prev) =>
                              prev.includes(fund.key)
                                ? prev.filter((f) => f !== fund.key)
                                : [...prev, fund.key]
                            )
                          }}
                          transition="all 0.15s"
                          _hover={!fund.required ? { borderColor: 'green.500' } : {}}
                        >
                          {fund.label}
                        </Box>
                      )
                      return fund.required ? (
                        <Tooltip key={fund.key} label="Obrigatório" fontSize="xs" placement="top" hasArrow>
                          {pill}
                        </Tooltip>
                      ) : pill
                    })}
                  </Flex>
                </Box>
              </Box>
            </Flex>

            {formError && (
              <Box mt={4} px={4} py={3} bg="red.950" borderWidth="1px" borderColor="red.700" borderRadius="lg">
                <Text color="red.300" fontSize="sm">{formError}</Text>
              </Box>
            )}

            {/* CTA */}
            <Flex mt={8} justify="flex-end">
              <Button
                colorScheme="blue"
                size="lg"
                fontWeight="bold"
                px={10}
                data-testid="btn-advance-step1"
                onClick={handleAdvance}
                isDisabled={!form.opponent || !form.sets || !form.date || !form.time}
                _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
              >
                Próximo — Escalação ›
              </Button>
            </Flex>
          </Box>
        </>
      )}

      {step === 2 && (
        <>
          {/* Topbar de navegação */}
          <Flex
            px={6} py={3}
            align="center"
            borderBottomWidth="1px"
            borderBottomColor="gray.800"
            mb={8}
          >
            <Button
              variant="ghost"
              size="sm"
              color="gray.500"
              _hover={{ color: 'gray.200', bg: 'gray.800' }}
              onClick={() => setStep(1)}
              fontWeight="normal"
            >
              ← Partida
            </Button>
            <Box flex="1" display="flex" justifyContent="center">
              <GameStepper currentStep={2} />
            </Box>
          </Flex>

          <Box maxW="900px" mx="auto" px={6} pb={12}>
            {/* Cabeçalho + info da partida */}
            <Flex align="flex-start" justify="space-between" mb={6}>
              <Box>
                <Heading size="lg" color="white" fontWeight="bold">Escalação</Heading>
                <Text color="gray.500" fontSize="sm" mt={1}>
                  Selecione os atletas que participarão desta partida.
                </Text>
              </Box>
              {/* Requisitos de composição */}
              <Flex gap={2} flexWrap="wrap" justify="flex-end">
                {([
                  { key: 'ponteiro', label: 'Pontas', need: 2, color: 'purple' },
                  { key: 'central', label: 'Centrais', need: 2, color: 'teal' },
                  { key: 'levantador', label: 'Levantador', need: 1, color: 'blue' },
                  { key: 'oposto', label: 'Oposto', need: 1, color: 'orange' },
                ] as const).map(({ key, label, need, color }) => {
                  const current = positionCounts[key] || 0
                  const done = current >= need
                  return (
                    <Flex
                      key={key}
                      align="center"
                      gap={1.5}
                      px={3}
                      py={1.5}
                      borderRadius="full"
                      bg={done ? `${color}.950` : 'gray.900'}
                      borderWidth="1px"
                      borderColor={done ? `${color}.600` : 'gray.700'}
                      transition="all 0.2s"
                    >
                      <Box
                        w="6px" h="6px" borderRadius="full"
                        bg={done ? `${color}.400` : 'gray.600'}
                        flexShrink={0}
                      />
                      <Text fontSize="xs" color={done ? `${color}.300` : 'gray.500'} fontWeight={done ? 'bold' : 'normal'}>
                        {label} {current}/{need}
                      </Text>
                    </Flex>
                  )
                })}
                {hasLiberoInSquad && (
                  <Flex
                    align="center" gap={1.5} px={3} py={1.5} borderRadius="full"
                    bg={liberoCount > 0 ? 'yellow.950' : 'gray.900'}
                    borderWidth="1px"
                    borderColor={liberoCount > 0 ? 'yellow.600' : 'gray.700'}
                    transition="all 0.2s"
                  >
                    <Box w="6px" h="6px" borderRadius="full" bg={liberoCount > 0 ? 'yellow.400' : 'gray.600'} flexShrink={0} />
                    <Text fontSize="xs" color={liberoCount > 0 ? 'yellow.300' : 'gray.500'} fontWeight={liberoCount > 0 ? 'bold' : 'normal'}>
                      Líbero {liberoCount}
                    </Text>
                  </Flex>
                )}
              </Flex>
            </Flex>

            {/* Toolbar: presets + filtro + seleção rápida */}
            <Flex align="center" justify="space-between" mb={5} gap={4}>
              {/* Filtro por posição */}
              <Flex gap={1.5} flexWrap="wrap">
                {(([
                  { key: 'todos', label: 'Todos' },
                  { key: 'ponteiro', label: 'Pontas' },
                  { key: 'central', label: 'Centrais' },
                  { key: 'levantador', label: 'Levantador' },
                  { key: 'oposto', label: 'Oposto' },
                  ...(hasLiberoInSquad ? [{ key: 'libero', label: 'Líbero' }] : []),
                ]) as { key: string; label: string }[]).map(({ key, label }) => {
                  const isActive = positionFilter === key
                  return (
                    <Box
                      key={key}
                      as="button"
                      px={3}
                      py={1}
                      borderRadius="full"
                      fontSize="xs"
                      fontWeight={isActive ? 'bold' : 'normal'}
                      bg={isActive ? 'blue.800' : 'gray.900'}
                      color={isActive ? 'blue.200' : 'gray.500'}
                      borderWidth="1px"
                      borderColor={isActive ? 'blue.500' : 'gray.700'}
                      cursor="pointer"
                      transition="all 0.15s"
                      _hover={{ borderColor: 'blue.500', color: 'blue.200' }}
                      onClick={() => setPositionFilter(key)}
                    >
                      {label}
                    </Box>
                  )
                })}
              </Flex>

              {/* Presets + selecionar todos */}
              <Flex gap={2} align="center" flexShrink={0}>
                <Box
                  as="button"
                  px={3} py={1} borderRadius="full" fontSize="xs"
                  bg={players.length > 0 && players.every(p => selectedPlayers.includes(p.id)) ? 'blue.800' : 'gray.900'}
                  color={players.length > 0 && players.every(p => selectedPlayers.includes(p.id)) ? 'blue.200' : 'gray.500'}
                  borderWidth="1px"
                  borderColor={players.length > 0 && players.every(p => selectedPlayers.includes(p.id)) ? 'blue.500' : 'gray.700'}
                  cursor="pointer"
                  transition="all 0.15s"
                  _hover={{ borderColor: 'blue.500', color: 'blue.200' }}
                  onClick={handleSelectAll}
                >
                  Selecionar todos
                </Box>

                {presets.map(preset => (
                  <Flex key={preset.id} align="center" gap={0}>
                    <Box
                      as="button"
                      px={3} py={1}
                      borderRadius="full"
                      borderRightRadius={0}
                      fontSize="xs"
                      bg="gray.900"
                      color="gray.400"
                      borderWidth="1px"
                      borderColor="gray.700"
                      cursor="pointer"
                      _hover={{ bg: 'blue.800', color: 'blue.200', borderColor: 'blue.500' }}
                      transition="all 0.15s"
                      onClick={() => handleApplyPreset(preset)}
                    >
                      {preset.name}
                    </Box>
                    <Box
                      as="button"
                      px={2} py={1}
                      borderRadius="full"
                      borderLeftRadius={0}
                      fontSize="xs"
                      bg="gray.900"
                      color="red.500"
                      borderWidth="1px"
                      borderLeftWidth={0}
                      borderColor="gray.700"
                      cursor="pointer"
                      _hover={{ bg: 'red.950', color: 'red.300', borderColor: 'red.700' }}
                      transition="all 0.15s"
                      onClick={() => handleDeletePreset(preset.id)}
                    >
                      ×
                    </Box>
                  </Flex>
                ))}

                {selectedPlayers.length > 0 && !showSavePreset && (
                  <Box
                    as="button"
                    px={3} py={1} borderRadius="full" fontSize="xs"
                    bg="gray.900" color="green.400"
                    borderWidth="1px" borderColor="gray.700"
                    cursor="pointer"
                    _hover={{ bg: 'green.950', borderColor: 'green.600', color: 'green.300' }}
                    transition="all 0.15s"
                    onClick={() => setShowSavePreset(true)}
                  >
                    + Salvar seleção
                  </Box>
                )}

                {showSavePreset && (
                  <Flex align="center" gap={1}>
                    <Input
                      size="xs"
                      placeholder="Nome do preset"
                      value={presetName}
                      onChange={e => setPresetName(e.target.value)}
                      onKeyDown={e => e.key === 'Enter' && handleSavePreset()}
                      bg="gray.900"
                      borderColor="gray.700"
                      color="white"
                      w="140px"
                      _focus={{ borderColor: 'blue.500' }}
                      autoFocus
                    />
                    <Button size="xs" onClick={handleSavePreset} colorScheme="green" isDisabled={!presetName.trim()}>
                      Salvar
                    </Button>
                    <Button size="xs" onClick={() => { setShowSavePreset(false); setPresetName('') }} variant="ghost" color="gray.500">
                      ×
                    </Button>
                  </Flex>
                )}
              </Flex>
            </Flex>

            {/* Grade de atletas */}
            {loadingPlayers ? (
              <Flex align="center" justify="center" py={16}>
                <Text color="gray.500" fontSize="sm">Carregando atletas...</Text>
              </Flex>
            ) : !selectedTeamId ? (
              <Flex align="center" justify="center" py={16}>
                <Text color="gray.600" fontSize="sm" textAlign="center">
                  Selecione uma equipe no dashboard para ver os atletas.
                </Text>
              </Flex>
            ) : filteredPlayers.length === 0 ? (
              <Flex align="center" justify="center" py={16}>
                <Text color="gray.600" fontSize="sm">Nenhum atleta cadastrado nesta posição.</Text>
              </Flex>
            ) : (
              <Flex wrap="wrap" gap={3} mb={6}>
                {filteredPlayers.map((player) => {
                  const isSelected = selectedPlayers.includes(player.id)
                  const borderCol = positionBorderColor[player.position] ?? 'blue.500'
                  const textCol = positionTextColor[player.position] ?? 'gray.400'
                  return (
                    <Box
                      key={player.id}
                      onClick={() => togglePlayer(player.id)}
                      cursor="pointer"
                      w="120px"
                      borderWidth="1px"
                      borderColor={isSelected ? borderCol : 'gray.800'}
                      bg={isSelected ? 'gray.800' : 'gray.900'}
                      borderRadius="xl"
                      overflow="hidden"
                      transition="all 0.15s"
                      boxShadow={isSelected ? `0 0 0 1px var(--chakra-colors-${borderCol.replace('.', '-')})` : 'none'}
                      _hover={{
                        borderColor: borderCol,
                        transform: 'translateY(-2px)',
                        boxShadow: 'lg',
                      }}
                    >
                      {/* Foto */}
                      <Box h="88px" overflow="hidden" position="relative" bg="gray.800">
                        {player.photo ? (
                          <Image
                            src={player.photo}
                            alt={player.name}
                            fill
                            style={{ objectFit: 'cover', opacity: isSelected ? 1 : 0.45 }}
                            sizes="120px"
                          />
                        ) : (
                          <Flex h="full" align="center" justify="center" opacity={isSelected ? 0.6 : 0.25}>
                            <Text fontSize="2xl" color="gray.600">👤</Text>
                          </Flex>
                        )}
                        {/* Check overlay */}
                        {isSelected && (
                          <Box
                            position="absolute"
                            top={1.5}
                            right={1.5}
                            w="18px"
                            h="18px"
                            borderRadius="full"
                            bg="green.500"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                            boxShadow="0 0 0 2px rgba(0,0,0,0.4)"
                          >
                            <Text color="white" fontSize="9px" lineHeight="1" fontWeight="bold">✓</Text>
                          </Box>
                        )}
                        {/* Número sobreposto no canto inferior esquerdo */}
                        <Box
                          position="absolute"
                          bottom={1}
                          left={2}
                          bg="blackAlpha.700"
                          px={1.5}
                          py={0.5}
                          borderRadius="md"
                        >
                          <Text fontSize="xs" fontWeight="bold" color="white">#{player.jerseyNumber}</Text>
                        </Box>
                      </Box>
                      {/* Info */}
                      <Box px={2} py={2}>
                        <Text
                          fontWeight={isSelected ? 'bold' : 'normal'}
                          color={isSelected ? 'white' : 'gray.600'}
                          fontSize="xs"
                          noOfLines={1}
                          mb={0.5}
                        >
                          {player.name}
                        </Text>
                        <Text
                          fontSize="2xs"
                          color={isSelected ? textCol : 'gray.700'}
                          fontWeight="medium"
                        >
                          {positionDisplayLabel[player.position] ?? player.position}
                        </Text>
                      </Box>
                    </Box>
                  )
                })}
              </Flex>
            )}

            {/* Footer: status + erro + CTA */}
            <Flex
              align="center"
              justify="space-between"
              pt={5}
              borderTopWidth="1px"
              borderTopColor="gray.800"
            >
              <Box>
                <Text color={selectedPlayers.length >= 6 ? 'green.400' : 'gray.500'} fontSize="sm" fontWeight="medium">
                  {selectedPlayers.length} atleta{selectedPlayers.length !== 1 ? 's' : ''} selecionado{selectedPlayers.length !== 1 ? 's' : ''}
                  {selectedPlayers.length >= 6 && ' ✓'}
                </Text>
                {playerSelectError && (
                  <Text color="red.400" fontSize="xs" mt={0.5}>{playerSelectError}</Text>
                )}
              </Box>
              <Button
                colorScheme="green"
                size="lg"
                fontWeight="bold"
                px={10}
                data-testid="btn-advance-step2"
                onClick={handleAdvanceToScout}
                isDisabled={selectedPlayers.length < 6 || playerSelectError !== ''}
                _disabled={{ opacity: 0.4, cursor: 'not-allowed' }}
              >
                Iniciar Scout
              </Button>
            </Flex>
          </Box>
        </>
      )}

      {step === 3 && (
        <Box position="fixed" inset={0} zIndex={100} display="flex" flexDirection="column" bg="gray.900">
          {/* TOPBAR UNIFICADO */}
          <Flex
            bg="blue.900"
            borderBottomWidth="1px"
            borderBottomColor="blue.800"
            px={4}
            py={2}
            align="center"
            position="relative"
            flexShrink={0}
            minH="48px"
          >
            {/* LEFT: botão principal + divisor */}
            <Flex align="center" gap={2} flexShrink={0}>
              {gameStarted && (
                <Button
                  size="sm"
                  colorScheme="yellow"
                  variant="solid"
                  onClick={handleSaveAndExit}
                  fontWeight="bold"
                >
                  ⏸ Pausar
                </Button>
              )}
              {!gameStarted && (
                <Button
                  size="xs"
                  variant="ghost"
                  color="gray.400"
                  _hover={{ color: 'gray.200' }}
                  onClick={() => setStep(2)}
                  px={1}
                >
                  ← Escalação
                </Button>
              )}
              <Box w="1px" h="20px" bg="whiteAlpha.200" />
            </Flex>

            {/* CENTER: Scoreboard absoluto */}
            <Box
              position="absolute"
              left="50%"
              top="50%"
              transform="translate(-50%, -50%)"
              pointerEvents="none"
            >
              <Scoreboard
                variant="inline"
                homeTeamName={homeTeamName}
                opponentName={opponentName}
                score={score}
                currentSet={currentSet}
                totalSets={totalSets}
                isLive={gameStarted}
                servingTeam={gameStarted ? servingTeam : undefined}
                setsHistory={setsHistory}
              />
            </Box>

            {/* RIGHT: controles + botões de jogo */}
            <Flex ml="auto" align="center" gap={2} flexShrink={0}>
              {hasStarted && <RotationControls rotation={rotation} />}

              {/* Fundamentos — pill toggle */}
              <Popover placement="bottom-end">
                <PopoverTrigger>
                  <Box
                    as="button"
                    px={3}
                    h="8"
                    borderRadius="md"
                    fontSize="xs"
                    fontWeight="medium"
                    bg={enabledFundamentos.length < 6 ? 'orange.950' : 'gray.800'}
                    color={enabledFundamentos.length < 6 ? 'orange.300' : 'gray.400'}
                    borderWidth="1px"
                    borderColor={enabledFundamentos.length < 6 ? 'orange.700' : 'gray.700'}
                    cursor="pointer"
                    transition="all 0.15s"
                    _hover={{ borderColor: 'blue.500', color: 'white', bg: 'gray.700' }}
                    whiteSpace="nowrap"
                    display="flex"
                    alignItems="center"
                  >
                    Fundamentos{enabledFundamentos.length < 6 ? ` ${enabledFundamentos.length}/6` : ''}
                  </Box>
                </PopoverTrigger>
                <PopoverContent bg="gray.900" borderColor="blue.500" w="260px">
                  <PopoverArrow bg="gray.900" />
                  <PopoverBody p={4}>
                    <Text fontSize="sm" color="white" fontWeight="bold" mb={3}>Fundamentos ativos</Text>
                    <Flex gap={2} flexWrap="wrap">
                      {([
                        { key: 'serve', label: 'Saque', required: true },
                        { key: 'reception', label: 'Recepção', required: true },
                        { key: 'attack', label: 'Ataque', required: true },
                        { key: 'block', label: 'Bloqueio', required: false },
                        { key: 'dig', label: 'Defesa', required: false },
                        { key: 'set', label: 'Levantamento', required: false },
                      ] as const).map((fund) => {
                        const isActive = enabledFundamentos.includes(fund.key)
                        return (
                          <Box
                            key={fund.key}
                            as="button"
                            px={3}
                            py={1}
                            borderRadius="full"
                            fontSize="xs"
                            fontWeight="medium"
                            bg={isActive ? 'green.800' : 'gray.700'}
                            color={isActive ? 'green.200' : 'gray.500'}
                            borderWidth="1px"
                            borderColor={isActive ? 'green.600' : 'gray.600'}
                            cursor={fund.required ? 'not-allowed' : 'pointer'}
                            opacity={fund.required ? 0.7 : 1}
                            onClick={() => {
                              if (fund.required) return
                              setEnabledFundamentos((prev) =>
                                prev.includes(fund.key)
                                  ? prev.filter((f) => f !== fund.key)
                                  : [...prev, fund.key]
                              )
                            }}
                            transition="all 0.15s"
                          >
                            {fund.label}{fund.required ? ' ✓' : ''}
                          </Box>
                        )
                      })}
                    </Flex>
                  </PopoverBody>
                </PopoverContent>
              </Popover>

              {/* Dicas — toggle com track visual */}
              <Flex
                as="button"
                align="center"
                gap={2}
                px={2.5}
                h="8"
                borderRadius="md"
                bg={showTips ? 'blue.900' : 'gray.800'}
                color={showTips ? 'blue.300' : 'gray.500'}
                borderWidth="1px"
                borderColor={showTips ? 'blue.700' : 'gray.700'}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{ borderColor: 'blue.600', color: 'blue.300' }}
                onClick={toggleTips}
                flexShrink={0}
              >
                {/* Track */}
                <Box
                  w="26px"
                  h="13px"
                  borderRadius="full"
                  bg={showTips ? 'blue.500' : 'gray.700'}
                  position="relative"
                  transition="background 0.2s"
                  flexShrink={0}
                >
                  {/* Thumb */}
                  <Box
                    position="absolute"
                    top="2.5px"
                    left={showTips ? '14px' : '2.5px'}
                    w="8px"
                    h="8px"
                    borderRadius="full"
                    bg="white"
                    transition="left 0.15s ease"
                    boxShadow="0 1px 2px rgba(0,0,0,0.4)"
                  />
                </Box>
                <Text fontSize="xs" fontWeight="medium" lineHeight="1">Dicas</Text>
              </Flex>

              {saveStatus === 'saving' && <Box w="6px" h="6px" borderRadius="full" bg="yellow.400" className="pulse-live" title="Salvando" />}
              {saveStatus === 'saved' && <Box w="6px" h="6px" borderRadius="full" bg="green.400" title="Salvo" />}
              {saveStatus === 'error' && <Box w="6px" h="6px" borderRadius="full" bg="red.400" title="Erro ao salvar" />}
              <Box w="1px" h="20px" bg="whiteAlpha.200" />
              {isLineupPhase && (() => {
                const filledCount = Object.values(courtPositions).filter(id => id !== null).length
                const isLineupReady = filledCount === 6
                return (
                  <Button
                    size="sm"
                    colorScheme="green"
                    data-testid="btn-start-scout"
                    onClick={handleStartScout}
                    isDisabled={!isLineupReady}
                    flexShrink={0}
                    boxShadow={isLineupReady ? '0 0 12px rgba(72, 187, 120, 0.4)' : 'none'}
                  >
                    ▶ Iniciar Scout {!isLineupReady && `(${filledCount}/6)`}
                  </Button>
                )
              })()}
              {(gameStarted || hasStarted) && (
                <Button
                  size="sm"
                  bg="transparent"
                  color="gray.400"
                  borderWidth="1px"
                  borderColor="gray.700"
                  _hover={{ bg: 'gray.700', color: 'gray.200', borderColor: 'gray.600' }}
                  _active={{ bg: 'gray.800' }}
                  onClick={() => {
                    handleInitialServerChange(servingTeam)
                    if (servingTeam === 'home') setInitialRotation(String(rotation))
                    setIsStartDialogOpen(true)
                  }}
                  flexShrink={0}
                >
                  Reiniciar
                </Button>
              )}
              {gameStarted && (
                <>
                  <Button
                    size="sm"
                    bg="blue.900"
                    color="blue.300"
                    borderWidth="1px"
                    borderColor="blue.800"
                    _hover={{ bg: 'blue.800', color: 'blue.200' }}
                    _active={{ bg: 'blue.950' }}
                    data-testid="btn-end-set"
                    onClick={() => setIsEndSetDialogOpen(true)}
                    flexShrink={0}
                  >
                    Finalizar Set
                  </Button>
                  <Button
                    size="sm"
                    bg="red.900"
                    color="red.300"
                    borderWidth="1px"
                    borderColor="red.800"
                    _hover={{ bg: 'red.800', color: 'red.200' }}
                    _active={{ bg: 'red.950' }}
                    fontWeight="semibold"
                    data-testid="btn-end-match"
                    onClick={() => setIsEndMatchDialogOpen(true)}
                    flexShrink={0}
                    whiteSpace="nowrap"
                  >
                    Finalizar Partida
                  </Button>
                </>
              )}
            </Flex>
          </Flex>

          {/* LAYOUT 3 COLUNAS */}
          <Flex flex="1" overflow="hidden">

            {/* LEFT: RallyFlow + Histórico de pontos */}
            <Flex
              w="240px"
              flexShrink={0}
              direction="column"
              gap={3}
              p={3}
              bg="gray.900"
              borderRightWidth="1px"
              borderRightColor="blue.900"
              overflowY="auto"
            >
              <RallyFlow
                rallyState={rallyState}
                onRemoveAction={(index) => {
                  const removed = removeRallyAction(index)
                  if (removed) {
                    toast({
                      position: 'bottom-left',
                      duration: 2000,
                      render: () => (
                        <Box
                          bg="gray.700"
                          color="white"
                          px={4}
                          py={3}
                          borderRadius="lg"
                          shadow="xl"
                          borderLeftWidth="4px"
                          borderLeftColor="red.400"
                          fontSize="sm"
                        >
                          Ação removida do rally
                        </Box>
                      ),
                    })
                  }
                }}
              />
              <Box h="1px" bg="gray.700" flexShrink={0} />
              <PointHistoryList
                history={history}
                currentSet={currentSet}
                onPointClick={(point) => setSelectedPointId(point.id)}
                direction="vertical"
              />
            </Flex>

            {/* CENTER: Quadra */}
            <Box flex="1" bg="gray.900" position="relative" display="flex" alignItems="center" justifyContent="center">
              <VolleyballCourt
                onActionRegister={registerAction}
                rotation={rotation}
                courtPositions={courtPositions}
                onPositionChange={handlePositionChange}
                rallyState={rallyState}
                gameStarted={gameStarted}
                onSubstitution={substitutePlayer}
                onUndo={handleUndoWithToast}
                showTips={showTips}
                enabledFundamentos={enabledFundamentos}
                liberoId={liberoId || undefined}
                onLiberoChange={setLiberoId}
                gameConfig={gameConfig || undefined}
                suppressInternalActionPanel
                externalActionRef={courtActionRef}
                onPlayerSelected={handleSidebarPlayerSelected}
                onFundamentoChange={handleSidebarFundamentoChange}
                onPendingZoneChange={handleSidebarPendingZoneChange}
              />
              {!gameStarted && !isLineupPhase && (
                <Box
                  position="absolute"
                  inset={0}
                  bg="blackAlpha.800"
                  backdropFilter="blur(6px)"
                  display="flex"
                  alignItems="center"
                  justifyContent="center"
                  zIndex={50}
                >
                  <Box textAlign="center" px={8} maxW="340px">
                    <Text
                      color="white"
                      fontSize="2xl"
                      fontWeight="bold"
                      letterSpacing="-0.02em"
                      mb={2}
                    >
                      {hasStarted && setsHistory.length > 0
                        ? `Set ${currentSet}`
                        : hasStarted
                        ? 'Partida pausada'
                        : 'Pronto para o scout?'}
                    </Text>
                    <Text color="whiteAlpha.500" fontSize="sm" mb={6}>
                      {hasStarted && setsHistory.length > 0
                        ? 'Defina o saque inicial e posicione os atletas em quadra'
                        : hasStarted
                        ? 'Reinicie para continuar registrando'
                        : 'Configure o jogo e monte sua escalação'}
                    </Text>
                    <Button
                      colorScheme="green"
                      size="lg"
                      fontWeight="bold"
                      px={8}
                      gap={2}
                      onClick={() => setIsStartDialogOpen(true)}
                      boxShadow="0 0 24px rgba(72, 187, 120, 0.5)"
                      _hover={{ transform: 'scale(1.05)', boxShadow: '0 0 32px rgba(72, 187, 120, 0.7)' }}
                      transition="all 0.2s"
                    >
                      <Text as="span">▶</Text>
                      {hasStarted && setsHistory.length > 0
                        ? `Iniciar Set ${currentSet}`
                        : hasStarted
                        ? 'Reiniciar'
                        : 'Começar Scout'}
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>

            {/* RIGHT: ActionPanel persistente */}
            <Flex
              w="280px"
              flexShrink={0}
              direction="column"
              bg="gray.800"
              borderLeftWidth="1px"
              borderLeftColor="blue.900"
            >
              <ActionPanel
                selectedPlayer={sidebarSelectedPlayer || ''}
                playerName={players.find(p => p.jerseyNumber.toString() === sidebarSelectedPlayer)?.name}
                isIdle={!sidebarSelectedPlayer || !gameStarted}
                isPendingZone={!!sidebarPendingZone}
                pendingZoneAction={sidebarPendingZone?.action}
                onActionComplete={handleSidebarActionComplete}
                onClose={() => handleSidebarPlayerSelected(null, undefined, '')}
                rallyState={rallyState}
                selectedAction={sidebarFundamento}
                onSelectedActionChange={handleSidebarFundamentoChange}
                highlightedKey={null}
                showTips={showTips}
                enabledFundamentos={sidebarFilteredFundamentos}
                serveType={sidebarServeType}
                onServeTypeChange={setSidebarServeType}
                onUndo={handleUndoWithToast}
                canUndo={canUndo}
              />
            </Flex>
          </Flex>

          {/* Modais */}
          <Modal isOpen={isStartDialogOpen} onClose={() => setIsStartDialogOpen(false)} isCentered size="md">
            <ModalOverlay bg="blackAlpha.900" backdropFilter="blur(4px)" />
            <ModalContent
              bg="gray.950"
              borderWidth="1px"
              borderColor="whiteAlpha.100"
              borderRadius="2xl"
              overflow="hidden"
              shadow="0 25px 60px rgba(0,0,0,0.7)"
            >
              {/* Header com accent */}
              <Box
                px={6}
                pt={6}
                pb={4}
                borderBottomWidth="1px"
                borderBottomColor="whiteAlpha.50"
              >
                <Text
                  fontSize="2xs"
                  color="blue.500"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="0.15em"
                  mb={1}
                >
                  {hasStarted && setsHistory.length > 0
                    ? `Set ${currentSet} de ${totalSets || '?'}`
                    : 'Configuração inicial'}
                </Text>
                <Text color="white" fontSize="xl" fontWeight="bold" letterSpacing="-0.02em">
                  {hasStarted && setsHistory.length > 0
                    ? 'Quem começa sacando?'
                    : 'Como começa o jogo?'}
                </Text>
              </Box>

              <Box px={6} py={5}>
                {/* Saque — dois cards grandes */}
                <Text
                  fontSize="2xs"
                  color="gray.500"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="0.12em"
                  mb={3}
                >
                  Saque inicial
                </Text>
                <Flex gap={3} mb={6}>
                  {/* Meu time */}
                  <Box
                    as="button"
                    flex="1"
                    py={4}
                    borderRadius="xl"
                    borderWidth="2px"
                    borderColor={initialServer === 'home' ? 'blue.500' : 'whiteAlpha.100'}
                    bg={initialServer === 'home' ? 'blue.900' : 'whiteAlpha.50'}
                    cursor="pointer"
                    transition="all 0.15s"
                    _hover={{ borderColor: initialServer === 'home' ? 'blue.400' : 'whiteAlpha.200', bg: initialServer === 'home' ? 'blue.900' : 'whiteAlpha.100' }}
                    onClick={() => handleInitialServerChange('home')}
                    position="relative"
                    overflow="hidden"
                  >
                    {initialServer === 'home' && (
                      <Box
                        position="absolute"
                        top={0} left={0} right={0}
                        h="2px"
                        bg="blue.400"
                      />
                    )}
                    <Text
                      fontSize="xs"
                      color={initialServer === 'home' ? 'blue.400' : 'gray.600'}
                      fontWeight="bold"
                      textTransform="uppercase"
                      letterSpacing="0.1em"
                      mb={1}
                    >
                      {initialServer === 'home' ? '● Selecionado' : '○'}
                    </Text>
                    <Text
                      fontSize="md"
                      color={initialServer === 'home' ? 'white' : 'gray.400'}
                      fontWeight="bold"
                    >
                      {homeTeamName}
                    </Text>
                  </Box>

                  {/* Adversário */}
                  <Box
                    as="button"
                    flex="1"
                    py={4}
                    borderRadius="xl"
                    borderWidth="2px"
                    borderColor={initialServer === 'away' ? 'orange.500' : 'whiteAlpha.100'}
                    bg={initialServer === 'away' ? 'orange.950' : 'whiteAlpha.50'}
                    cursor="pointer"
                    transition="all 0.15s"
                    _hover={{ borderColor: initialServer === 'away' ? 'orange.400' : 'whiteAlpha.200', bg: initialServer === 'away' ? 'orange.950' : 'whiteAlpha.100' }}
                    onClick={() => handleInitialServerChange('away')}
                    position="relative"
                    overflow="hidden"
                  >
                    {initialServer === 'away' && (
                      <Box
                        position="absolute"
                        top={0} left={0} right={0}
                        h="2px"
                        bg="orange.400"
                      />
                    )}
                    <Text
                      fontSize="xs"
                      color={initialServer === 'away' ? 'orange.400' : 'gray.600'}
                      fontWeight="bold"
                      textTransform="uppercase"
                      letterSpacing="0.1em"
                      mb={1}
                    >
                      {initialServer === 'away' ? '● Selecionado' : '○'}
                    </Text>
                    <Text
                      fontSize="md"
                      color={initialServer === 'away' ? 'orange.100' : 'gray.400'}
                      fontWeight="bold"
                    >
                      {opponentName}
                    </Text>
                  </Box>
                </Flex>

                {/* Rotação — 6 tiles */}
                <Text
                  fontSize="2xs"
                  color="gray.500"
                  fontWeight="bold"
                  textTransform="uppercase"
                  letterSpacing="0.12em"
                  mb={3}
                >
                  Rotação inicial
                </Text>
                <Flex gap={2} mb={2}>
                  {[1, 2, 3, 4, 5, 6].map((pos) => {
                    const isSelected = initialRotation === String(pos)
                    return (
                      <Box
                        key={pos}
                        as="button"
                        flex="1"
                        py={3}
                        borderRadius="lg"
                        borderWidth="1px"
                        borderColor={isSelected ? 'blue.500' : 'whiteAlpha.100'}
                        bg={isSelected ? 'blue.800' : 'whiteAlpha.50'}
                        cursor="pointer"
                        transition="all 0.12s"
                        _hover={{ borderColor: 'blue.600', bg: isSelected ? 'blue.700' : 'whiteAlpha.100' }}
                        onClick={() => setInitialRotation(String(pos))}
                      >
                        <Text
                          fontSize="xs"
                          color="gray.600"
                          fontWeight="medium"
                          lineHeight="1"
                          mb="2px"
                        >
                          P
                        </Text>
                        <Text
                          fontSize="lg"
                          color={isSelected ? 'white' : 'gray.500'}
                          fontWeight="black"
                          lineHeight="1"
                        >
                          {pos}
                        </Text>
                      </Box>
                    )
                  })}
                </Flex>
                <Text color="gray.700" fontSize="2xs" mb={6}>
                  {initialServer === 'home'
                    ? 'Pn = levantador está na zona n. Em P1, o levantador está na zona de saque (fundo direito).'
                    : 'Pn = levantador está na zona n. P2 é comum ao receber: ao marcar o primeiro ponto, o levantador rotaciona para a zona 1 e saca.'}
                </Text>

                {/* Confirmar */}
                <Flex gap={3}>
                  <Button
                    variant="ghost"
                    color="gray.600"
                    _hover={{ color: 'gray.400', bg: 'whiteAlpha.50' }}
                    onClick={() => setIsStartDialogOpen(false)}
                    size="md"
                  >
                    Cancelar
                  </Button>
                  <Button
                    flex="1"
                    colorScheme="green"
                    size="md"
                    fontWeight="bold"
                    data-testid="btn-confirm-start"
                    onClick={handleConfirmConfig}
                    isDisabled={isStartConfirmDisabled}
                    borderRadius="lg"
                    boxShadow={!isStartConfirmDisabled ? '0 0 20px rgba(72,187,120,0.25)' : 'none'}
                    transition="all 0.2s"
                  >
                    Confirmar e montar escalação
                  </Button>
                </Flex>
              </Box>
            </ModalContent>
          </Modal>

          <Modal isOpen={isEndSetDialogOpen} onClose={() => setIsEndSetDialogOpen(false)} isCentered>
            <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
            <ModalContent bg="gray.900" borderColor="blue.700" borderWidth="2px" borderRadius="xl">
              <ModalHeader color="white">Finalizar Set {currentSet}?</ModalHeader>
              <ModalBody>
                <Box bg="gray.800" p={4} borderRadius="md" mb={4}>
                  <Flex justify="space-between" align="center">
                    <Box textAlign="center">
                      <Text color="blue.200" fontSize="sm">{homeTeamName}</Text>
                      <Text color="white" fontSize="3xl" fontWeight="bold">{score.home}</Text>
                    </Box>
                    <Text color="gray.500" fontSize="xl">x</Text>
                    <Box textAlign="center">
                      <Text color="blue.200" fontSize="sm">{opponentName}</Text>
                      <Text color="white" fontSize="3xl" fontWeight="bold">{score.away}</Text>
                    </Box>
                  </Flex>
                </Box>
                <Text color="gray.400" fontSize="sm">
                  O placar será salvo e o set {currentSet + 1} começará com 0 x 0.
                </Text>
                {setsHistory.length > 0 && (
                  <Box mt={3}>
                    <Text color="gray.500" fontSize="xs" mb={1}>Sets anteriores:</Text>
                    {setsHistory.map((s) => (
                      <Text key={s.number} color="gray.400" fontSize="xs">
                        Set {s.number}: {s.homeScore} x {s.awayScore}
                      </Text>
                    ))}
                  </Box>
                )}
              </ModalBody>
              <ModalFooter gap={3}>
                <Button variant="ghost" onClick={() => setIsEndSetDialogOpen(false)}>Cancelar</Button>
                <Button colorScheme="blue" onClick={handleEndSet}>Confirmar</Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          <Modal
            isOpen={isEndMatchDialogOpen}
            onClose={() => { setIsEndMatchDialogOpen(false); setEndMatchConfirmed(false) }}
            isCentered
          >
            <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
            <ModalContent bg="gray.900" borderColor="red.700" borderWidth="2px" borderRadius="xl">
              <ModalHeader color="white">Encerrar Partida?</ModalHeader>
              <ModalBody>
                <Text color="gray.300" mb={4}>Todos os dados serão salvos e o scout será encerrado.</Text>
                <Box bg="gray.800" p={4} borderRadius="md" mb={4}>
                  <Text color="gray.400" fontSize="sm" mb={2}>Resumo da partida:</Text>
                  {setsHistory.map((s) => (
                    <Flex key={s.number} justify="space-between" mb={1}>
                      <Text color="gray.300" fontSize="sm">Set {s.number}</Text>
                      <Text color="white" fontSize="sm" fontWeight="bold">{s.homeScore} x {s.awayScore}</Text>
                    </Flex>
                  ))}
                  {(score.home > 0 || score.away > 0) && (
                    <Flex justify="space-between" mb={1}>
                      <Text color="yellow.300" fontSize="sm">Set {currentSet} (atual)</Text>
                      <Text color="yellow.300" fontSize="sm" fontWeight="bold">{score.home} x {score.away}</Text>
                    </Flex>
                  )}
                  <Box borderTopWidth="1px" borderColor="gray.700" mt={2} pt={2}>
                    <Flex justify="space-between">
                      <Text color="gray.400" fontSize="sm">Total de ações</Text>
                      <Text color="white" fontSize="sm" fontWeight="bold">{actions.length}</Text>
                    </Flex>
                  </Box>
                </Box>
                <Box mt={3} p={3} borderRadius="md" bg="red.950" borderWidth="1px" borderColor="red.800">
                  <Checkbox
                    isChecked={endMatchConfirmed}
                    onChange={(e) => setEndMatchConfirmed(e.target.checked)}
                    colorScheme="red"
                  >
                    <Text color="red.300" fontSize="sm">Confirmo que desejo encerrar esta partida</Text>
                  </Checkbox>
                </Box>
              </ModalBody>
              <ModalFooter gap={3}>
                <Button variant="ghost" onClick={() => { setIsEndMatchDialogOpen(false); setEndMatchConfirmed(false) }}>
                  Cancelar
                </Button>
                <Button
                  colorScheme="red"
                  onClick={handleEndMatch}
                  isLoading={saveStatus === 'saving'}
                  loadingText="Salvando..."
                  isDisabled={!endMatchConfirmed}
                >
                  Encerrar e Salvar
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          <LineupModal
            isOpen={showLineupModal}
            onClose={() => setShowLineupModal(false)}
            players={players}
            courtPositions={courtPositions}
            onPositionChange={handlePositionChange}
          />

          <RallyDetailsModal
            isOpen={isRallyModalOpen}
            onClose={() => setSelectedPointId(null)}
            pointRecord={selectedPoint}
            homeTeamName={homeTeamName}
            opponentName={opponentName}
            onDeletePoint={(pointId) => {
              deleteHistoryPoint(pointId)
              setSelectedPointId(null)
              toast({
                title: 'Ponto removido do histórico',
                status: 'warning',
                duration: 3000,
                position: 'bottom-left',
              })
            }}
            onEditAction={(pointId, actionIndex, newSubAction) => {
              editHistoryAction(pointId, actionIndex, newSubAction)
            }}
          />
        </Box>
      )}
    </Box>
  )
}
