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
  Select,
  useToast,
  Switch,
  Tooltip,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
} from '@chakra-ui/react'
import VolleyballCourt from '@/components/court/VolleyballCourt'
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
  ScoutAction
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
    opponent: 'Aliança B',
    event: '',
    location: '',
    sets: '5',
    date: '2023-10-01',
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
            {lastRegisteredAction.videoTimestamp && (
              <Text as="span" color="blue.300" mr={1}>[{lastRegisteredAction.videoTimestamp}]</Text>
            )}
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

  // Estado do timestamp de vídeo
  const [videoTimestamp, setVideoTimestamp] = useState('')
  const timestampInputRef = useRef<HTMLInputElement>(null)

  // Auto-formatar timestamp: "1230" → "12:30"
  const handleTimestampChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    let raw = e.target.value.replace(/[^0-9:]/g, '')
    // Se digitou só números e tem 3+ chars, inserir ":"
    if (!raw.includes(':') && raw.length >= 3) {
      raw = raw.slice(0, -2) + ':' + raw.slice(-2)
    }
    // Limitar formato MM:SS ou HH:MM:SS
    if (raw.length > 8) raw = raw.slice(0, 8)
    setVideoTimestamp(raw)
  }

  const handleTimestampKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
    if (e.key === 'Enter' || e.key === 'Tab') {
      e.preventDefault()
      timestampInputRef.current?.blur()
    }
  }

  const handleFocusTimestamp = useCallback(() => {
    timestampInputRef.current?.focus()
    timestampInputRef.current?.select()
  }, [])

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

    // Limpar posições em quadra e abrir modal de configuração do próximo set
    setCourtPositions({ 1: null, 2: null, 3: null, 4: null, 5: null, 6: null })
    setGameStarted(false)
    setIsLineupPhase(false)
    setIsStartDialogOpen(true)

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
    // Em transições entre sets, abrir LineupModal automaticamente para posicionar atletas
    if (setsHistory.length > 0) {
      setShowLineupModal(true)
    }
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
          <GameStepper currentStep={1} />

          {/* Card de retomada de partida em andamento */}
          {resumeData && (
            <Box
              bg="gray.800"
              borderRadius="xl"
              p={5}
              borderWidth="2px"
              borderColor="green.600"
              mb={6}
              maxW="420px"
              mx="auto"
            >
              <Flex align="center" gap={2} mb={3}>
                <Box w="8px" h="8px" borderRadius="full" bg="green.400" className="pulse-live" />
                <Text color="green.300" fontWeight="bold" fontSize="sm">
                  Partida em andamento
                </Text>
              </Flex>
              <Text color="white" fontWeight="bold" fontSize="lg" mb={1}>
                vs {(() => {
                  try {
                    const cfg = JSON.parse(localStorage.getItem('current-game-config') || '{}')
                    return cfg.opponentName || 'Adversário'
                  } catch { return 'Adversário' }
                })()}
              </Text>
              <Flex gap={4} mb={3}>
                <Box>
                  <Text color="gray.400" fontSize="xs">Set</Text>
                  <Text color="white" fontWeight="bold">
                    {(resumeData.setsHistory?.length || 0) + 1}
                  </Text>
                </Box>
                <Box>
                  <Text color="gray.400" fontSize="xs">Sets</Text>
                  <Text color="white" fontWeight="bold">
                    {resumeData.setsHistory?.filter(s => s.homeScore > s.awayScore).length || 0}
                    {' x '}
                    {resumeData.setsHistory?.filter(s => s.awayScore > s.homeScore).length || 0}
                  </Text>
                </Box>
                <Box>
                  <Text color="gray.400" fontSize="xs">Salvo em</Text>
                  <Text color="white" fontWeight="bold" fontSize="sm">
                    {new Date(resumeData.savedAt).toLocaleString('pt-BR', {
                      day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit'
                    })}
                  </Text>
                </Box>
              </Flex>
              <Flex gap={3}>
                <Button
                  colorScheme="green"
                  flex={1}
                  onClick={handleResume}
                >
                  Continuar
                </Button>
                <Button
                  variant="ghost"
                  color="red.400"
                  _hover={{ bg: 'red.900', color: 'red.300' }}
                  onClick={handleDiscardSession}
                >
                  Descartar
                </Button>
              </Flex>
            </Box>
          )}

          <Box
            bg="gray.800"
            borderRadius="xl"
            p={5}
            borderWidth="2px"
            borderColor="blue.700"
            mb={6}
            maxW="420px"
            mx="auto"
          >
          <Flex mb={3} align="center">
            <Button
              variant="ghost"
              size="sm"
              color="gray.500"
              _hover={{ color: 'gray.200' }}
              onClick={() => router.push('/dashboard')}
              px={1}
              fontWeight="normal"
            >
              ← Dashboard
            </Button>
          </Flex>
          <Heading size="md" color="blue.300" mb={2}>
            Nova Partida
          </Heading>
          <Box mb={3}>
            <Text fontSize="sm" color="gray.200" mb={1}>
              Equipe adversária *
            </Text>
            <Input
              name="opponent"
              value={form.opponent}
              onChange={handleFormChange}
              placeholder="Ex: Vôlei Clube"
              bg="gray.900"
              color="white"
              mb={2}
            />
            <Text fontSize="sm" color="gray.200" mb={1}>
              Evento/Campeonato <Text as="span" color="gray.500" fontSize="xs">(opcional)</Text>
            </Text>
            <Input
              name="event"
              value={form.event}
              onChange={handleFormChange}
              placeholder="Ex: Copa Regional"
              bg="gray.900"
              color="white"
              mb={2}
            />
            <Text fontSize="sm" color="gray.200" mb={1}>
              Local <Text as="span" color="gray.500" fontSize="xs">(opcional)</Text>
            </Text>
            <Input
              name="location"
              value={form.location}
              onChange={handleFormChange}
              placeholder="Ex: Ginásio Municipal"
              bg="gray.900"
              color="white"
              mb={2}
            />
            <Text fontSize="sm" color="gray.200" mb={1}>
              Quantidade de sets *
            </Text>
            <Flex gap={2} flexWrap="wrap" mb={2}>
              {(['3', '5', 'custom'] as const).map((val) => {
                const label =
                  val === '3' ? 'Melhor de 3' : val === '5' ? 'Melhor de 5' : 'Personalizado'
                const isSelected = form.sets === val
                return (
                  <Button
                    key={val}
                    size="sm"
                    onClick={() => handleSetsChange(val)}
                    bg={isSelected ? 'blue.600' : 'gray.700'}
                    color={isSelected ? 'white' : 'gray.400'}
                    borderWidth="1px"
                    borderColor={isSelected ? 'blue.400' : 'gray.600'}
                    _hover={{ bg: isSelected ? 'blue.500' : 'gray.600' }}
                    fontWeight={isSelected ? 'bold' : 'normal'}
                    transition="all 0.15s"
                  >
                    {label}
                  </Button>
                )
              })}
              {form.sets === 'custom' && (
                <Input
                  name="customSets"
                  type="number"
                  min={1}
                  max={10}
                  value={customSets}
                  onChange={handleCustomSetsChange}
                  placeholder="Nº"
                  w="60px"
                  bg="gray.900"
                  color="white"
                  size="sm"
                />
              )}
            </Flex>
            <Flex gap={2} mb={2}>
              <Box flex={1}>
                <Text fontSize="sm" color="gray.200" mb={1}>
                  Data *
                </Text>
                <Input
                  name="date"
                  type="date"
                  value={form.date}
                  onChange={handleFormChange}
                  bg="gray.900"
                  color="white"
                />
              </Box>
              <Box flex={1}>
                <Text fontSize="sm" color="gray.200" mb={1}>
                  Hora *
                </Text>
                <Input
                  name="time"
                  type="time"
                  value={form.time}
                  onChange={handleFormChange}
                  bg="gray.900"
                  color="white"
                />
              </Box>
            </Flex>
            {/* Fundamentos a registrar */}
            <Text fontSize="sm" color="gray.200" mb={1} mt={2}>
              Fundamentos a registrar
            </Text>
            <Flex gap={2} flexWrap="wrap" mb={2}>
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
                    {fund.label}{fund.required ? ' 🔒' : ''}
                  </Box>
                )
                return fund.required ? (
                  <Tooltip
                    key={fund.key}
                    label="Obrigatório — não pode ser desativado"
                    fontSize="xs"
                    placement="top"
                    hasArrow
                  >
                    {pill}
                  </Tooltip>
                ) : pill
              })}
            </Flex>
            <Text fontSize="xs" color="gray.500" mb={2}>
              Se estiver começando, mantenha Saque, Recepção e Ataque. Ative os demais quando se sentir confiante.
            </Text>
            {formError && (
              <Text color="red.300" fontSize="sm">
                {formError}
              </Text>
            )}
          </Box>
          <Button
            colorScheme="blue"
            size="lg"
            fontWeight="bold"
            fontSize="xl"
            data-testid="btn-advance-step1"
            onClick={handleAdvance}
            disabled={!form.opponent || !form.sets || !form.date || !form.time}
            w="100%"
            boxShadow="0 0 0 2px #4299e1"
            mt={2}
          >
            Avançar
          </Button>
        </Box>
        </>
      )}

      {step === 2 && (
        <>
          <GameStepper currentStep={2} />
          <Box
            bg="gray.800"
            borderRadius="xl"
            p={5}
            borderWidth="2px"
            borderColor="blue.700"
            mb={6}
            maxW="720px"
            mx="auto"
          >
            <Flex mb={3} align="center">
              <Button
                variant="ghost"
                size="sm"
                color="gray.500"
                _hover={{ color: 'gray.200' }}
                onClick={() => setStep(1)}
                px={1}
                fontWeight="normal"
              >
                ← Partida
              </Button>
            </Flex>

            <Heading size="md" color="blue.300" mb={1}>
              Escalação da Partida
            </Heading>
            <Text color="gray.400" fontSize="sm" mb={4}>
              Clique nos atletas para incluí-los ou removê-los da partida.
            </Text>

            {/* Presets de seleção */}
            <Flex gap={2} flexWrap="wrap" mb={4} align="center">
              <Button
                size="xs"
                onClick={handleSelectAll}
                bg={players.length > 0 && players.every(p => selectedPlayers.includes(p.id)) ? 'blue.600' : 'gray.700'}
                color={players.length > 0 && players.every(p => selectedPlayers.includes(p.id)) ? 'white' : 'gray.300'}
                borderWidth="1px"
                borderColor="gray.600"
                _hover={{ bg: 'blue.500', color: 'white' }}
              >
                Todos
              </Button>

              {presets.map(preset => (
                <Flex key={preset.id} align="center" gap={0}>
                  <Button
                    size="xs"
                    onClick={() => handleApplyPreset(preset)}
                    bg="gray.700"
                    color="gray.300"
                    borderWidth="1px"
                    borderColor="gray.600"
                    borderRightRadius={0}
                    _hover={{ bg: 'blue.600', color: 'white' }}
                  >
                    {preset.name}
                  </Button>
                  <Button
                    size="xs"
                    onClick={() => handleDeletePreset(preset.id)}
                    bg="gray.700"
                    color="red.400"
                    borderWidth="1px"
                    borderColor="gray.600"
                    borderLeftRadius={0}
                    borderLeftWidth={0}
                    px={1.5}
                    minW="auto"
                    _hover={{ bg: 'red.700', color: 'white' }}
                  >
                    ×
                  </Button>
                </Flex>
              ))}

              {selectedPlayers.length > 0 && !showSavePreset && (
                <Button
                  size="xs"
                  onClick={() => setShowSavePreset(true)}
                  bg="gray.700"
                  color="green.300"
                  borderWidth="1px"
                  borderColor="gray.600"
                  _hover={{ bg: 'green.700', color: 'white' }}
                >
                  + Salvar seleção
                </Button>
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
                    borderColor="gray.600"
                    color="white"
                    w="140px"
                    autoFocus
                  />
                  <Button
                    size="xs"
                    onClick={handleSavePreset}
                    bg="green.600"
                    color="white"
                    _hover={{ bg: 'green.500' }}
                    isDisabled={!presetName.trim()}
                  >
                    Salvar
                  </Button>
                  <Button
                    size="xs"
                    onClick={() => { setShowSavePreset(false); setPresetName('') }}
                    bg="gray.700"
                    color="gray.400"
                    _hover={{ bg: 'gray.600' }}
                  >
                    ×
                  </Button>
                </Flex>
              )}
            </Flex>

            {/* Barra de composição em tempo real */}
            <Flex gap={2} flexWrap="wrap" mb={4}>
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
                    py={1}
                    borderRadius="full"
                    bg={done ? `${color}.900` : 'gray.900'}
                    borderWidth="1px"
                    borderColor={done ? `${color}.600` : 'gray.600'}
                  >
                    <Box w="6px" h="6px" borderRadius="full" bg={done ? `${color}.400` : 'gray.600'} />
                    <Text fontSize="xs" color={done ? `${color}.300` : 'gray.500'} fontWeight={done ? 'bold' : 'normal'}>
                      {label} {current}/{need}
                    </Text>
                  </Flex>
                )
              })}
              {hasLiberoInSquad && (
                <Flex
                  align="center"
                  gap={1.5}
                  px={3}
                  py={1}
                  borderRadius="full"
                  bg={liberoCount > 0 ? 'yellow.900' : 'gray.900'}
                  borderWidth="1px"
                  borderColor={liberoCount > 0 ? 'yellow.600' : 'gray.600'}
                >
                  <Box w="6px" h="6px" borderRadius="full" bg={liberoCount > 0 ? 'yellow.400' : 'gray.600'} />
                  <Text fontSize="xs" color={liberoCount > 0 ? 'yellow.300' : 'gray.500'} fontWeight={liberoCount > 0 ? 'bold' : 'normal'}>
                    Líbero {liberoCount} <Text as="span" opacity={0.6}>(opt.)</Text>
                  </Text>
                </Flex>
              )}
            </Flex>

            {/* Filtro por posição */}
            <Flex gap={2} flexWrap="wrap" mb={4}>
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
                  <Button
                    key={key}
                    size="xs"
                    onClick={() => setPositionFilter(key)}
                    bg={isActive ? 'blue.700' : 'gray.700'}
                    color={isActive ? 'blue.100' : 'gray.400'}
                    borderWidth="1px"
                    borderColor={isActive ? 'blue.500' : 'gray.600'}
                    _hover={{ bg: isActive ? 'blue.600' : 'gray.600' }}
                    fontWeight={isActive ? 'bold' : 'normal'}
                  >
                    {label}
                  </Button>
                )
              })}
            </Flex>

            {/* Grade de atletas */}
            {loadingPlayers ? (
              <Text color="gray.500" fontSize="sm" mb={4}>Carregando atletas...</Text>
            ) : !selectedTeamId ? (
              <Text color="gray.500" fontSize="sm" textAlign="center" py={6}>
                Selecione uma equipe no dashboard para ver os atletas.
              </Text>
            ) : filteredPlayers.length === 0 ? (
              <Text color="gray.500" fontSize="sm" textAlign="center" py={6}>
                Nenhum atleta cadastrado nesta posição.
              </Text>
            ) : (
              <Flex wrap="wrap" gap={3} mb={4}>
                {filteredPlayers.map((player) => {
                  const isSelected = selectedPlayers.includes(player.id)
                  return (
                    <Box
                      key={player.id}
                      onClick={() => togglePlayer(player.id)}
                      cursor="pointer"
                      borderWidth="2px"
                      borderColor={isSelected ? (positionBorderColor[player.position] ?? 'blue.500') : 'gray.700'}
                      bg={isSelected ? 'gray.700' : 'gray.900'}
                      borderRadius="xl"
                      overflow="hidden"
                      minW="110px"
                      maxW="130px"
                      opacity={isSelected ? 1 : 0.5}
                      transition="all 0.15s"
                      _hover={{
                        opacity: 1,
                        borderColor: positionBorderColor[player.position] ?? 'blue.400',
                        transform: 'translateY(-2px)',
                        boxShadow: 'md',
                      }}
                    >
                      <Box h="80px" overflow="hidden" position="relative">
                        {player.photo && (
                          <Image
                            src={player.photo}
                            alt={player.name}
                            fill
                            style={{ objectFit: 'cover' }}
                            sizes="(max-width: 130px) 100vw, 130px"
                          />
                        )}
                        {isSelected && (
                          <Box
                            position="absolute"
                            top={1}
                            right={1}
                            w="18px"
                            h="18px"
                            borderRadius="full"
                            bg="green.500"
                            display="flex"
                            alignItems="center"
                            justifyContent="center"
                          >
                            <Text color="white" fontSize="9px" lineHeight="1" fontWeight="bold">✓</Text>
                          </Box>
                        )}
                      </Box>
                      <Box p={2}>
                        <Flex justify="space-between" align="center" mb={0.5}>
                          <Badge colorScheme={isSelected ? 'blue' : 'gray'} fontSize="2xs">
                            #{player.jerseyNumber}
                          </Badge>
                          <Text
                            fontSize="2xs"
                            color={isSelected ? (positionTextColor[player.position] ?? 'gray.400') : 'gray.600'}
                          >
                            {positionDisplayLabel[player.position] ?? player.position}
                          </Text>
                        </Flex>
                        <Text
                          fontWeight={isSelected ? 'bold' : 'normal'}
                          color={isSelected ? 'white' : 'gray.500'}
                          fontSize="xs"
                          noOfLines={1}
                        >
                          {player.name}
                        </Text>
                      </Box>
                    </Box>
                  )
                })}
              </Flex>
            )}

            {/* Status + erro inline */}
            <Flex justify="space-between" align="center" mb={4} minH="20px">
              <Text color="gray.400" fontSize="sm">
                {selectedPlayers.length} atleta{selectedPlayers.length !== 1 ? 's' : ''} selecionado{selectedPlayers.length !== 1 ? 's' : ''}
              </Text>
              {playerSelectError && (
                <Text color="red.300" fontSize="xs" textAlign="right" maxW="60%">
                  {playerSelectError}
                </Text>
              )}
            </Flex>

            <Button
              bg={selectedPlayers.length >= 6 && playerSelectError === '' ? 'green.500' : 'green.800'}
              color="white"
              size="lg"
              fontWeight="bold"
              fontSize="xl"
              w="100%"
              height="60px"
              data-testid="btn-advance-step2"
              onClick={handleAdvanceToScout}
              disabled={selectedPlayers.length < 6 || playerSelectError !== ''}
              _hover={{
                transform: 'translateY(-2px)',
                boxShadow: 'xl',
                bg: selectedPlayers.length >= 6 && playerSelectError === '' ? 'green.600' : 'green.800',
              }}
              _disabled={{
                opacity: 0.8,
                cursor: 'not-allowed',
                _hover: { transform: 'none' },
                bg: 'green.800',
                color: 'whiteAlpha.900',
              }}
              transition="all 0.2s"
            >
              Avançar para Scout ➜
            </Button>
          </Box>
        </>
      )}

      {step === 3 && (
        <>
          {/* Header do Jogo — 2 barras */}
          <Box
            bg="blue.900"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="blue.800"
            shadow="xl"
            mb={4}
            overflow="hidden"
          >
            {/* Barra Superior: contexto + controles principais */}
            <Flex
              px={{ base: 3, md: 5 }}
              py={3}
              align="center"
              justify="space-between"
              gap={3}
              borderBottomWidth="1px"
              borderColor="whiteAlpha.100"
              flexWrap="wrap"
            >
              <Box flex="1" minW={0}>
                <Text
                  color="blue.100"
                  fontSize={{ base: 'md', md: 'lg' }}
                  fontWeight="bold"
                  noOfLines={1}
                >
                  {homeTeamName}{' '}
                  <Text as="span" color="gray.500" fontWeight="normal">vs</Text>{' '}
                  {opponentName}
                </Text>
                <Text color="blue.400" fontSize="xs" mt={0.5} noOfLines={1}>
                  {tournamentName} · {formattedMatchDate} às {formattedMatchTime} · {locationName}
                </Text>
              </Box>
              <Flex gap={2} align="center" flexShrink={0}>
                {saveStatus === 'saving' && (
                  <Flex align="center" gap={1.5}>
                    <Box w="6px" h="6px" borderRadius="full" bg="yellow.400" className="pulse-live" />
                    <Text color="yellow.400" fontSize="xs">Salvando</Text>
                  </Flex>
                )}
                {saveStatus === 'saved' && (
                  <Box w="6px" h="6px" borderRadius="full" bg="green.400" title="Salvo" />
                )}
                {saveStatus === 'error' && (
                  <Flex align="center" gap={1.5}>
                    <Box w="6px" h="6px" borderRadius="full" bg="red.400" />
                    <Text color="red.400" fontSize="xs">Erro</Text>
                  </Flex>
                )}
                {/* Botão "Iniciar Scout" durante fase de escalação */}
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
                      boxShadow={isLineupReady ? '0 0 12px rgba(72, 187, 120, 0.4)' : 'none'}
                      _disabled={{ opacity: 0.5, cursor: 'not-allowed' }}
                      gap={1}
                    >
                      ▶ Iniciar Scout {!isLineupReady && `(${filledCount}/6)`}
                    </Button>
                  )
                })()}
                {/* Botão de Reiniciar — visível no header após o jogo começar */}
                {(gameStarted || hasStarted) && (
                  <Button
                    size="sm"
                    colorScheme="green"
                    variant="outline"
                    data-testid="btn-start-game"
                    onClick={() => {
                      handleInitialServerChange(servingTeam)
                      if (servingTeam === 'home') {
                        setInitialRotation(String(rotation))
                      }
                      setIsStartDialogOpen(true)
                    }}
                    disabled={selectedPlayers.length < 6}
                  >
                    Reiniciar
                  </Button>
                )}
                {gameStarted && (
                  <>
                    <Button
                      size="sm"
                      colorScheme="blue"
                      variant="outline"
                      data-testid="btn-end-set"
                      onClick={() => setIsEndSetDialogOpen(true)}
                    >
                      Finalizar Set
                    </Button>
                    <Box w="1px" h="18px" bg="whiteAlpha.200" flexShrink={0} />
                    <Button
                      size="xs"
                      variant="ghost"
                      color="yellow.400"
                      onClick={handleSaveAndExit}
                      _hover={{ bg: 'yellow.900', color: 'yellow.300' }}
                      px={2}
                      whiteSpace="nowrap"
                    >
                      💾 Salvar e Sair
                    </Button>
                    <Button
                      size="xs"
                      variant="ghost"
                      color="red.500"
                      data-testid="btn-end-match"
                      onClick={() => setIsEndMatchDialogOpen(true)}
                      _hover={{ bg: 'red.900', color: 'red.300' }}
                      px={2}
                      whiteSpace="nowrap"
                    >
                      Encerrar Partida
                    </Button>
                  </>
                )}
              </Flex>
            </Flex>

            {/* Barra Inferior: utilitários do scout */}
            <Flex
              px={{ base: 3, md: 5 }}
              py={2}
              gap={{ base: 3, md: 5 }}
              align="center"
              flexWrap="wrap"
            >
              <RotationControls rotation={rotation} />
              <ActionLog actions={actions} countOnly />
              <Flex align="center" gap={2}>
                <Text color="blue.300" fontSize="xs" fontWeight="bold" whiteSpace="nowrap">
                  Vídeo
                </Text>
                <Input
                  ref={timestampInputRef}
                  value={videoTimestamp}
                  onChange={handleTimestampChange}
                  onKeyDown={handleTimestampKeyDown}
                  placeholder="MM:SS"
                  size="sm"
                  w="80px"
                  bg="gray.900"
                  color="white"
                  borderColor="blue.700"
                  textAlign="center"
                  fontFamily="mono"
                  fontSize="sm"
                  _placeholder={{ color: 'gray.500' }}
                />
                <Text color="gray.500" fontSize="xs" whiteSpace="nowrap">
                  [T]
                </Text>
              </Flex>
              <Flex align="center" gap={3} ml="auto">
                <Flex align="center" gap={2}>
                  <Text color="gray.400" fontSize="xs" whiteSpace="nowrap">
                    Dicas
                  </Text>
                  <Switch
                    size="sm"
                    colorScheme="blue"
                    isChecked={showTips}
                    onChange={toggleTips}
                  />
                </Flex>
                <Popover placement="bottom-end">
                  <PopoverTrigger>
                    <Button
                      size="xs"
                      variant="ghost"
                      color="gray.400"
                      _hover={{ color: 'white', bg: 'gray.700' }}
                      px={2}
                    >
                      Fundamentos
                    </Button>
                  </PopoverTrigger>
                  <PopoverContent bg="gray.900" borderColor="blue.500" w="260px">
                    <PopoverArrow bg="gray.900" />
                    <PopoverBody p={4}>
                      <Text fontSize="sm" color="white" fontWeight="bold" mb={3}>
                        Fundamentos ativos
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
              </Flex>
            </Flex>
          </Box>

          {/* Área Principal: Quadra + Sidebar */}
          <Flex
            direction={{ base: 'column', lg: 'row' }}
            gap={4}
            alignItems="flex-start"
            mb={4}
          >
            {/* Coluna da Quadra: Quadra + RallyFlow abaixo */}
            <Box flex="1" position="relative" w="100%" display="flex" flexDirection="column" gap={4}>
              {/* Wrapper relativo para o overlay de início */}
              <Box position="relative">
                <VolleyballCourt
                  onActionRegister={registerAction}
                  rotation={rotation}
                  courtPositions={courtPositions}
                  onPositionChange={handlePositionChange}
                  rallyState={rallyState}
                  gameStarted={gameStarted}
                  onSubstitution={substitutePlayer}
                  onUndo={handleUndoWithToast}
                  videoTimestamp={videoTimestamp}
                  onFocusTimestamp={handleFocusTimestamp}
                  showTips={showTips}
                  enabledFundamentos={enabledFundamentos}
                  liberoId={liberoId || undefined}
                  onLiberoChange={setLiberoId}
                  gameConfig={gameConfig || undefined}
                />
                {/* Etapa 1: Tela inicial com blur — botão "Começar Scout" abre modal de config */}
                {!gameStarted && !isLineupPhase && (
                  <Box
                    position="absolute"
                    top="0"
                    left="0"
                    right="0"
                    bottom="0"
                    borderRadius="2xl"
                    bg="blackAlpha.700"
                    backdropFilter="blur(5px)"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    zIndex={35}
                  >
                    <Box textAlign="center" px={6}>
                      <Text fontSize="4xl" mb={3} lineHeight="1" userSelect="none">
                        🏐
                      </Text>
                      <Text
                        color="white"
                        fontSize={{ base: 'lg', md: 'xl' }}
                        fontWeight="bold"
                        mb={1}
                      >
                        {hasStarted && setsHistory.length > 0
                          ? `Set ${currentSet} — Configurar escalação`
                          : hasStarted
                          ? 'Partida pausada'
                          : 'Pronto para o scout?'}
                      </Text>
                      <Text color="whiteAlpha.700" fontSize="sm" mb={4}>
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
                        _hover={{
                          transform: 'scale(1.05)',
                          boxShadow: '0 0 32px rgba(72, 187, 120, 0.7)',
                        }}
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
            </Box>

            {/* Sidebar: Placar + Histórico */}
            <Box
              display="flex"
              flexDirection="column"
              gap={4}
              minW={{ base: '100%', lg: '320px' }}
              maxW={{ base: '100%', lg: '340px' }}
              position={{ base: 'relative', lg: 'sticky' }}
              top={{ lg: '20px' }}
              h="fit-content"
              zIndex={10}
            >
              <Scoreboard
                homeTeamName={homeTeamName}
                opponentName={opponentName}
                score={score}
                currentSet={currentSet}
                totalSets={totalSets}
                isLive={gameStarted}
                servingTeam={gameStarted ? servingTeam : undefined}
              />
              <PointHistoryList
                history={history}
                currentSet={currentSet}
                onPointClick={(point) => setSelectedPointId(point.id)}
              />
            </Box>
          </Flex>

          <Modal
            isOpen={isStartDialogOpen}
            onClose={() => setIsStartDialogOpen(false)}
            isCentered
            size="lg"
          >
            <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
            <ModalContent
              bg="gray.900"
              borderColor="blue.700"
              borderWidth="2px"
              borderRadius="xl"
            >
              <ModalHeader color="white" fontSize="xl" fontWeight="bold">
                {hasStarted && setsHistory.length > 0 ? `Iniciar Set ${currentSet}` : 'Configuração inicial'}
              </ModalHeader>
              <ModalBody>
                <Flex direction="column" gap={5}>
                  <Box>
                    <Text color="blue.200" fontSize="sm" mb={2}>
                      Quem inicia sacando?
                    </Text>
                    <Flex gap={3} wrap="wrap">
                      <Button
                        onClick={() => handleInitialServerChange('home')}
                        bg={
                          initialServer === 'home' ? 'blue.600' : 'gray.800'
                        }
                        color="white"
                        _hover={{
                          bg:
                            initialServer === 'home'
                              ? 'blue.500'
                              : 'gray.700',
                        }}
                        aria-pressed={initialServer === 'home'}
                      >
                        Meu time
                      </Button>
                      <Button
                        onClick={() => handleInitialServerChange('away')}
                        bg={
                          initialServer === 'away' ? 'blue.600' : 'gray.800'
                        }
                        color="white"
                        _hover={{
                          bg:
                            initialServer === 'away'
                              ? 'blue.500'
                              : 'gray.700',
                        }}
                        aria-pressed={initialServer === 'away'}
                      >
                        Adversário
                      </Button>
                    </Flex>
                  </Box>

                  <Box>
                    <Text color="blue.200" fontSize="sm" mb={2}>
                      Rotação inicial do seu time (P1-P6)
                    </Text>
                    <Select
                      value={initialRotation}
                      onChange={(e) => setInitialRotation(e.target.value)}
                      bg="gray.800"
                      borderColor="blue.700"
                      borderWidth="1px"
                      borderRadius="md"
                      color="white"
                    >
                      {[1, 2, 3, 4, 5, 6].map((opt) => (
                        <option key={opt} value={opt}>
                          P{opt}
                        </option>
                      ))}
                    </Select>
                    <Text color="gray.400" fontSize="xs" mt={1}>
                      {initialServer === 'home'
                        ? 'Padrão: P1 (seu time está sacando)'
                        : 'Padrão: P2 (adversário está sacando)'}
                    </Text>
                  </Box>
                </Flex>
              </ModalBody>
              <ModalFooter display="flex" justifyContent="flex-end" gap={3}>
                <Button
                  variant="ghost"
                  onClick={() => setIsStartDialogOpen(false)}
                >
                  Cancelar
                </Button>
                <Button
                  colorScheme="green"
                  data-testid="btn-confirm-start"
                  onClick={handleConfirmConfig}
                  disabled={isStartConfirmDisabled}
                >
                  Confirmar
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          {/* Modal Finalizar Set */}
          <Modal
            isOpen={isEndSetDialogOpen}
            onClose={() => setIsEndSetDialogOpen(false)}
            isCentered
          >
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
                <Button variant="ghost" onClick={() => setIsEndSetDialogOpen(false)}>
                  Cancelar
                </Button>
                <Button colorScheme="blue" onClick={handleEndSet}>
                  Confirmar
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          {/* Modal Finalizar Partida */}
          <Modal
            isOpen={isEndMatchDialogOpen}
            onClose={() => {
              setIsEndMatchDialogOpen(false)
              setEndMatchConfirmed(false)
            }}
            isCentered
          >
            <ModalOverlay bg="rgba(0, 0, 0, 0.8)" />
            <ModalContent bg="gray.900" borderColor="red.700" borderWidth="2px" borderRadius="xl">
              <ModalHeader color="white">Encerrar Partida?</ModalHeader>
              <ModalBody>
                <Text color="gray.300" mb={4}>
                  Todos os dados serão salvos e o scout será encerrado.
                </Text>
                <Box bg="gray.800" p={4} borderRadius="md" mb={4}>
                  <Text color="gray.400" fontSize="sm" mb={2}>Resumo da partida:</Text>
                  {setsHistory.map((s) => (
                    <Flex key={s.number} justify="space-between" mb={1}>
                      <Text color="gray.300" fontSize="sm">Set {s.number}</Text>
                      <Text color="white" fontSize="sm" fontWeight="bold">
                        {s.homeScore} x {s.awayScore}
                      </Text>
                    </Flex>
                  ))}
                  {(score.home > 0 || score.away > 0) && (
                    <Flex justify="space-between" mb={1}>
                      <Text color="yellow.300" fontSize="sm">Set {currentSet} (atual)</Text>
                      <Text color="yellow.300" fontSize="sm" fontWeight="bold">
                        {score.home} x {score.away}
                      </Text>
                    </Flex>
                  )}
                  <Box borderTopWidth="1px" borderColor="gray.700" mt={2} pt={2}>
                    <Flex justify="space-between">
                      <Text color="gray.400" fontSize="sm">Total de ações</Text>
                      <Text color="white" fontSize="sm" fontWeight="bold">{actions.length}</Text>
                    </Flex>
                  </Box>
                </Box>
                <Box
                  mt={3}
                  p={3}
                  borderRadius="md"
                  bg="red.950"
                  borderWidth="1px"
                  borderColor="red.800"
                >
                  <Checkbox
                    isChecked={endMatchConfirmed}
                    onChange={(e) => setEndMatchConfirmed(e.target.checked)}
                    colorScheme="red"
                  >
                    <Text color="red.300" fontSize="sm">
                      Confirmo que desejo encerrar esta partida
                    </Text>
                  </Checkbox>
                </Box>
              </ModalBody>
              <ModalFooter gap={3}>
                <Button
                  variant="ghost"
                  onClick={() => {
                    setIsEndMatchDialogOpen(false)
                    setEndMatchConfirmed(false)
                  }}
                >
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

          {/* Footer com os Atletas */}
          <Box
            bg="gray.800"
            borderTop="1px"
            borderColor="gray.700"
            py={{ base: 3, md: 4 }}
            px={{ base: 3, md: 6 }}
            borderRadius={{ base: 'lg', md: 'xl' }}
            boxShadow="0 -8px 24px rgba(0,0,0,0.35)"
            position={{ base: 'relative', xl: 'sticky' }}
            bottom="auto"
            mt={4}
          >
            <Flex
              maxW="1200px"
              mx="auto"
              gap={3}
              overflowX="auto"
              align="stretch"
              css={{
                '&::-webkit-scrollbar': {
                  height: '8px',
                },
                '&::-webkit-scrollbar-track': {
                  background: 'rgba(0,0,0,0.1)',
                },
                '&::-webkit-scrollbar-thumb': {
                  background: 'rgba(255,255,255,0.1)',
                  borderRadius: '4px',
                },
              }}
            >
              {selectedPlayers.map((id) => {
                const player = players.find((p) => p.id === id)
                if (!player) return null
                const isOnCourt = courtPlayerIds.has(player.id)
                return (
                  <Box
                    key={player.id}
                    minW={{ base: '110px', md: '120px' }}
                    maxW={{ base: '110px', md: '120px' }}
                    bg={isOnCourt ? 'gray.700' : 'gray.800'}
                    borderRadius="md"
                    borderWidth="1px"
                    borderColor={isOnCourt ? 'blue.500' : 'gray.700'}
                    p={3}
                    textAlign="center"
                    position="relative"
                    cursor="default"
                    transition="all 0.2s"
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    justifyContent="flex-start"
                    opacity={isOnCourt ? 1 : 0.5}
                  >
                    <Box
                      h="56px"
                      w="56px"
                      borderRadius="full"
                      overflow="hidden"
                      position="relative"
                      mx="auto"
                      mb={3}
                    >
                      {player.photo && (
                        <Image
                          src={player.photo}
                          alt={player.name}
                          fill
                          style={{ objectFit: 'cover' }}
                          sizes="(max-width: 120px) 100vw, 120px"
                        />
                      )}
                    </Box>
                    <Text
                      color="white"
                      fontWeight="bold"
                      fontSize="sm"
                      noOfLines={1}
                      mb={1}
                    >
                      {player.name}
                    </Text>
                    <Badge colorScheme="blue" fontSize="xs">
                      #{player.jerseyNumber}
                    </Badge>
                  </Box>
                )
              })}
            </Flex>
          </Box>

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
        </>
      )}
    </Box>
  )
}
