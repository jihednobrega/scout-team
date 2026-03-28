// app/components/court/VolleyballCourt.tsx
'use client'

import { useState, useCallback, useRef } from 'react'
import { motion } from 'framer-motion'
import { getFormationOffsetByLineup, getFormationOffset, FormationMode } from '@/lib/formationOffsets'
import { Box, Image, Text, Button, Grid, useToast } from '@chakra-ui/react'
import { ScoutAction, GameConfig, RallyState, RallyStep, ServingTeam, ServeType } from '@/types/scout'
import { Player, VolleyballPosition } from '@/types/player'
import { usePlayersAPI } from '@/hooks/usePlayersAPI'
import { CourtPositions } from '@/types/game'
import ActionPanel, { subActions, inferFundamento } from './ActionPanel'
import PlayerPositionSelector from './PlayerPositionSelector'
import SubstitutionModal from '../game/SubstitutionModal'
import { useTeams } from '@/hooks/useTeams'
import { useTeamContext } from '@/contexts/TeamContext'
import { useKeyboardShortcuts } from '@/hooks/useKeyboardShortcuts'

interface VolleyballCourtProps {
  onActionRegister: (action: ScoutAction) => void
  rotation: number
  courtPositions: CourtPositions
  onPositionChange: (position: number, playerId: string | null) => void
  rallyState: RallyState
  gameStarted: boolean
  onSubstitution: (playerOutId: string, playerInId: string) => void
  onUndo?: () => void
  videoTimestamp?: string
  onFocusTimestamp?: () => void
  showTips?: boolean
  enabledFundamentos?: string[]
  liberoId?: string
  onLiberoChange?: (id: string) => void
  gameConfig?: GameConfig
}

export default function VolleyballCourt({
  onActionRegister,
  rotation,
  courtPositions,
  onPositionChange,
  rallyState,
  gameStarted,
  onSubstitution,
  onUndo,
  videoTimestamp,
  onFocusTimestamp,
  showTips,
  enabledFundamentos,
  liberoId,
  onLiberoChange,
  gameConfig,
}: VolleyballCourtProps) {
  const { selectedTeamId } = useTeamContext()
  const { players } = usePlayersAPI(selectedTeamId)
  const [selectedPlayer, setSelectedPlayer] = useState<string | null>(null)
  const [showActionPanel, setShowActionPanel] = useState(false)
  const [pendingAction, setPendingAction] = useState<{
    action: string
    subAction: string
    serveType?: ServeType
  } | null>(null)
  const [selectedPosition, setSelectedPosition] = useState<number | null>(null)
  const [showPlayerSelector, setShowPlayerSelector] = useState(false)
  const [showSubModal, setShowSubModal] = useState(false)
  const { teams } = useTeams()
  const toast = useToast()
  const courtRef = useRef<HTMLDivElement>(null)

  const selectedTeam = teams.find((team) => team.id === selectedTeamId)

  const showToast = (message: string, color = 'yellow.400') => {
    toast({
      position: 'bottom-left',
      duration: 2500,
      render: () => (
        <Box
          bg="gray.800"
          color="white"
          px={4}
          py={3}
          borderRadius="lg"
          shadow="xl"
          borderLeftWidth="4px"
          borderLeftColor={color}
          fontSize="sm"
          maxW="300px"
        >
          {message}
        </Box>
      ),
    })
  }

  // Estado controlado do fundamento selecionado no ActionPanel
  const [actionPanelFundamento, setActionPanelFundamento] = useState<string>(
    inferFundamento(rallyState, enabledFundamentos)
  )

  // Fundamentos filtrados por posição do jogador (ex: linha de trás não pode bloquear)
  const [playerFilteredFundamentos, setPlayerFilteredFundamentos] = useState<string[] | undefined>(enabledFundamentos)

  // Zona destino do último levantamento (para destacar apenas o atacante correto)
  const [lastSetDestinationZone, setLastSetDestinationZone] = useState<number | null>(null)

  // Tipo de saque selecionado (persiste entre ações)
  const [serveType, setServeType] = useState<ServeType>('float')

  // Determinar a zona visual de um jogador pelo ID
  const getPlayerVisualZone = (playerId: string): number | null => {
    for (let visualZone = 1; visualZone <= 6; visualZone++) {
      const lineupPos = getRotatedPosition(visualZone, rotation)
      const id = courtPositions[lineupPos as keyof CourtPositions]
      if (id === playerId) return visualZone
    }
    return null
  }

  // Função auxiliar para pegar jogador por ID
  const getPlayerById = (id: string | null): Player | null => {
    if (!id) return null
    return players.find((p) => p.id === id) || null
  }

  // Função para rotacionar jogadores no sentido horário
  // P1: [1,2,3,4,5,6] -> P6: [2,3,4,5,6,1] -> P5: [3,4,5,6,1,2] etc
  const getRotatedPosition = (
    basePosition: number,
    rotation: number
  ): number => {
    // Rotação no sentido horário
    // P1 (rotation=1): 1->1, 2->2, 3->3, 4->4, 5->5, 6->6
    // P6 (rotation=6): 1->6, 2->1, 3->2, 4->3, 5->4, 6->5
    const rotatedPos = ((basePosition - rotation + 6) % 6) + 1
    return rotatedPos === 0 ? 6 : rotatedPos
  }

  // Verificar se lineup está completo (6 posições preenchidas)
  const filledPositions = Object.values(courtPositions).filter(id => id !== null).length
  const isLineupComplete = filledPositions === 6

  // Criar array de 12 posições: 6 para seu time (com rotação) + 6 para adversário (sem rotação)
  const courtPlayers = Array.from({ length: 12 }, (_, index) => {
    if (index < 6) {
      // Seu time - aplicar rotação
      const targetPosition = index + 1
      // Descobrir de qual posição base este jogador deveria estar
      const originalPosition = getRotatedPosition(targetPosition, rotation)
      // Pegar o ID do jogador que está na posição base
      const playerId = courtPositions[originalPosition as keyof CourtPositions]
      // Retornar o objeto Player completo
      return getPlayerById(playerId)
    }
    // Time adversário (posições 7-12) - sem jogadores
    return null
  })

  const handlePlayerClick = (player: any) => {
    if (!gameStarted) {
      showToast('Inicie o jogo primeiro para registrar ações.')
      return
    }

    // Bloquear se lineup não está completo
    if (!isLineupComplete) {
      showToast(`Escalação incompleta (${filledPositions}/6). Posicione todos os jogadores.`, 'orange.400')
      return
    }

    // Restrição de Saque: Apenas o jogador na posição 1 pode sacar quando o time da casa está sacando
    if (rallyState.servingTeam === 'home' && rallyState.currentStep === 'serve') {
      // Quem está visualmente na Zona 1?
      const lineupPositionInZone1 = getRotatedPosition(1, rotation)
      const playerInZone1Id = courtPositions[lineupPositionInZone1 as keyof CourtPositions]
      
      // Se o jogador clicado não for o que está na P1 (comparando IDs)
      if (player.id !== playerInZone1Id) {
        // Silently ignore (como solicitado pelo usuário)
        return
      }
    }

    setSelectedPlayer(player.jerseyNumber.toString())

    // Filtrar fundamentos por posição na quadra (regras do vôlei)
    // Linha de trás (zonas 1, 5, 6) NÃO pode bloquear
    // Nota: líbero não está em courtPositions (o central está), então visualZone=null → tratar como back-row
    const visualZone = getPlayerVisualZone(player.id)
    const isBackRow = visualZone === null || [1, 5, 6].includes(visualZone)
    const filtered = isBackRow
      ? (enabledFundamentos || ['serve', 'reception', 'attack', 'block', 'dig', 'set']).filter(f => f !== 'block')
      : enabledFundamentos
    setPlayerFilteredFundamentos(filtered)

    setActionPanelFundamento(inferFundamento(rallyState, filtered))
    setShowActionPanel(true)
    setPendingAction(null)
  }

  const handleActionComplete = (action: string, subAction: string, zone?: number, actionServeType?: ServeType) => {
    // Guardar destino do set para destacar o atacante correto; limpar nas demais ações
    if (action === 'set' && zone !== undefined) {
      setLastSetDestinationZone(zone)
    } else if (action !== 'set') {
      setLastSetDestinationZone(null)
    }

    // Se for erro, registrar imediatamente sem pedir zona
    if (subAction === 'error') {
      const scoutAction: ScoutAction = {
        id: `action-${Date.now()}`,
        time: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        player: selectedPlayer || '0',
        action: action as ScoutAction['action'],
        subAction: subAction,
        zone: 0,
        coordinates: { x: 0, y: 0 },
        timestamp: new Date(),
        videoTimestamp: videoTimestamp || undefined,
        ...(action === 'serve' && actionServeType ? { serveType: actionServeType } : {}),
      }
      onActionRegister(scoutAction)
      closePanel()
      return
    }

    // Set com destino escolhido no drawer → registrar direto com a zona
    if (action === 'set' && zone !== undefined) {
      const scoutAction: ScoutAction = {
        id: `action-${Date.now()}`,
        time: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        player: selectedPlayer || '0',
        action: action as ScoutAction['action'],
        subAction: subAction,
        zone: zone,
        coordinates: { x: 0, y: 0 },
        timestamp: new Date(),
        videoTimestamp: videoTimestamp || undefined,
      }
      onActionRegister(scoutAction)
      closePanel()
      return
    }

    // Bloqueio, recepção, defesa → registrar imediatamente sem pedir zona
    // EXCEÇÃO: Ataque bloqueado/replay também não precisa de zona
    const isAttackNoZone = action === 'attack' && ['blocked', 'replay', 'block_out'].includes(subAction)

    if (['block', 'reception', 'dig'].includes(action) || isAttackNoZone) {
      const scoutAction: ScoutAction = {
        id: `action-${Date.now()}`,
        time: new Date().toLocaleTimeString('pt-BR', {
          hour: '2-digit',
          minute: '2-digit',
        }),
        player: selectedPlayer || '0',
        action: action as ScoutAction['action'],
        subAction: subAction,
        zone: 0,
        coordinates: { x: 0, y: 0 },
        timestamp: new Date(),
        videoTimestamp: videoTimestamp || undefined,
      }
      onActionRegister(scoutAction)
      closePanel()
      return
    }

    setPendingAction({ action, subAction, serveType: actionServeType })
    // Fechar drawer para liberar a visão da quadra — o indicador "aguardando zona" aparece
    setShowActionPanel(false)
  }

  const handleOpponentError = () => {
    const scoutAction: ScoutAction = {
      id: `action-${Date.now()}`,
      time: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      player: '0', // 0 representa o time/adversário
      action: 'opponent_error',
      subAction: 'error',
      zone: 0,
      coordinates: { x: 0, y: 0 },
      timestamp: new Date(),
      videoTimestamp: videoTimestamp || undefined,
    }
    onActionRegister(scoutAction)
  }

  const handleZoneClick = (e: React.MouseEvent, zone: number) => {
    if (!selectedPlayer || !pendingAction) {
      return
    }

    // ====================================================================
    // Coordenadas relativas ao container da quadra (courtRef)
    // ====================================================================
    const courtRect = courtRef.current?.getBoundingClientRect()
    if (!courtRect) return

    // Posição do clique relativa ao container da quadra (0-100%)
    const screenXPct = ((e.clientX - courtRect.left) / courtRect.width) * 100
    const screenYPct = ((e.clientY - courtRect.top) / courtRect.height) * 100

    // Coordenadas de centro por zona (fallback para eventos sem clique real)
    // Sistema do heatmap: x=sideline L→R (0-100), y=net→baseline (0-100)
    const ZONE_CENTERS: Record<number, { x: number; y: number }> = {
      // Meu time (zonas 1-6) — mantém valores originais
      1: { x: 75, y: 80 },
      2: { x: 75, y: 20 },
      3: { x: 50, y: 20 },
      4: { x: 25, y: 20 },
      5: { x: 25, y: 80 },
      6: { x: 50, y: 80 },
      // Adversário (zonas 11-16) — mapeado para sistema do heatmap
      // Screen Y → heatmap X (sideline), Screen X invertido → heatmap Y (net→baseline)
      11: { x: 83, y: 67 },  // Z1: bottom-left na tela → right-back no heatmap
      12: { x: 83, y: 17 },  // Z2: bottom-right na tela → right-front no heatmap
      13: { x: 50, y: 17 },  // Z3: middle-right na tela → center-front
      14: { x: 17, y: 17 },  // Z4: top-right na tela → left-front
      15: { x: 17, y: 67 },  // Z5: top-left na tela → left-back
      16: { x: 50, y: 67 },  // Z6: middle-left na tela → center-back
    }

    const isOpponentZone = zone > 10
    let destX: number
    let destY: number

    if (isOpponentZone && courtRect.width > 0) {
      // Mapear coordenadas da tela para o sistema do heatmap:
      // heatmapX = screenY (top→bottom da tela = left→right do heatmap)
      // heatmapY = 100 - screenX normalizado pelo half (left→right da tela = baseline→net)
      const oppHalfWidth = courtRect.width * 0.5
      const screenXInOpp = ((e.clientX - courtRect.left) / oppHalfWidth) * 100
      destX = Math.max(0, Math.min(100, screenYPct))
      destY = Math.max(0, Math.min(100, 100 - screenXInOpp))
    } else {
      // Zonas do home court: usar centro da zona (não é alvo de heatmap)
      const center = ZONE_CENTERS[zone] ?? { x: 50, y: 50 }
      destX = center.x
      destY = center.y
    }

    // Coordenadas para o indicador visual (relativas ao elemento clicado)
    const cellRect = e.currentTarget.getBoundingClientRect()
    const indicatorX = ((e.clientX - cellRect.left) / cellRect.width) * 100
    const indicatorY = ((e.clientY - cellRect.top) / cellRect.height) * 100

    // Criar indicador visual
    const indicator = document.createElement('div')
    indicator.className = 'click-indicator'
    indicator.style.left = indicatorX + '%'
    indicator.style.top = indicatorY + '%'
    e.currentTarget.appendChild(indicator)

    setTimeout(() => {
      indicator.remove()
    }, 1000)

    const scoutAction: ScoutAction = {
      id: `action-${Date.now()}`,
      time: new Date().toLocaleTimeString('pt-BR', {
        hour: '2-digit',
        minute: '2-digit',
      }),
      player: selectedPlayer,
      action: pendingAction.action as ScoutAction['action'],
      subAction: pendingAction.subAction,
      zone: zone,
      coordinates: { x: screenXPct, y: screenYPct },
      destX,
      destY,
      timestamp: new Date(),
      videoTimestamp: videoTimestamp || undefined,
      ...(pendingAction.serveType ? { serveType: pendingAction.serveType } : {}),
    }

    onActionRegister(scoutAction)

    // Reset
    setSelectedPlayer(null)
    setShowActionPanel(false)
    setPendingAction(null)
  }

  const closePanel = () => {
    setShowActionPanel(false)
    setSelectedPlayer(null)
    setPendingAction(null)
  }

  // Selecionar jogador por zona via teclado (teclas 1-6)
  const handleSelectPlayerByZone = useCallback((zone: number) => {
    if (!gameStarted || !isLineupComplete) return
    const player = courtPlayers[zone - 1]
    if (player) {
      handlePlayerClick(player)
    }
  }, [gameStarted, courtPlayers, rallyState])

  // Selecionar resultado via teclado (teclas 1-5 quando painel aberto)
  const handleSelectResult = useCallback((index: number) => {
    const currentSubs = subActions[actionPanelFundamento] || []
    if (index >= 0 && index < currentSubs.length) {
      handleActionComplete(actionPanelFundamento, currentSubs[index].id)
    }
  }, [actionPanelFundamento, selectedPlayer])

  // Keyboard shortcuts
  const { highlightedKey } = useKeyboardShortcuts({
    enabled: gameStarted,
    gameStarted,
    showActionPanel,
    subActionsCount: (subActions[actionPanelFundamento] || []).length,
    onSelectPlayerByZone: handleSelectPlayerByZone,
    onChangeFundamento: setActionPanelFundamento,
    onSelectResult: handleSelectResult,
    onClose: closePanel,
    onUndo,
    onOpponentError: handleOpponentError,
    onFocusTimestamp,
    enabledFundamentos: showActionPanel ? playerFilteredFundamentos : enabledFundamentos,
  })

  // Abrir seletor de jogador para uma posição vazia
  const handleEmptySlotClick = (position: number) => {
    if (players.length === 0) {
      showToast('Nenhum jogador cadastrado. Vá ao Dashboard → Minha Equipe.', 'red.400')
      return
    }
    setSelectedPosition(position)
    setShowPlayerSelector(true)
  }

  // Adicionar jogador em uma posição
  const handleAddPlayer = (playerId: string) => {
    if (selectedPosition === 7) {
      // Posição 7 = slot do líbero (convenção interna)
      onLiberoChange?.(playerId)
      setShowPlayerSelector(false)
      setSelectedPosition(null)
      return
    }
    if (selectedPosition && onPositionChange) {
      // Converter posição visual para lógica baseada na rotação
      const logicalPosition = getRotatedPosition(selectedPosition, rotation)
      onPositionChange(logicalPosition, playerId)
      setShowPlayerSelector(false)
      setSelectedPosition(null)
    }
  }

  // Remover jogador de uma posição
  const handleRemovePlayer = (position: number) => {
    onPositionChange(position, null)
  }

  // Jogadores disponíveis (não estão em quadra, apenas os selecionados para a partida)
  const playersOnCourt = Object.values(courtPositions).filter(
    (id) => id !== null
  )
  const lineupPlayerIds = gameConfig?.lineup?.map((lp) => lp.playerId) || []
  const eligiblePlayers = lineupPlayerIds.length > 0
    ? players.filter((p) => lineupPlayerIds.includes(p.id))
    : players
  const availablePlayers = eligiblePlayers.filter((p) => !playersOnCourt.includes(p.id))

  return (
    <>
      {/* Layout com Quadra e Indicador */}
      <Grid
        templateColumns={{ base: '1fr' }}
        gap={{ base: 4, lg: 6 }}
        alignItems="start"
        maxW="900px"
        mx="auto"
        w="full"
        px={{ base: 0, md: 2 }}
      >
        {/* Quadra */}
        <Box
          bg="gray.800"
          borderRadius={{ base: 'xl', sm: '2xl' }}
          p={{ base: 3, sm: 4, lg: 5, xl: 6 }}
          borderWidth="1px"
          borderColor="blue.500/30"
          shadow="2xl"
          maxW={{ base: '100%' }}
          mx="auto"
        >
          <Box
            w="full"
            h="full"
            position="relative"
            ref={courtRef}
            className="volleyball-court"
            borderRadius={{ base: 'lg', sm: 'xl' }}
            borderWidth="4px"
            borderColor="white"
            cursor="crosshair"
            minH={{ base: '320px', sm: '360px', md: '400px', lg: '440px' }}
            maxW="900px"
            mx="auto"
            maxH="480px"
            aspectRatio="2/1"
          >
            {/* Linhas de divisão das áreas de ataque */}
            {/* Lado esquerdo (adversário): divide fundo e ataque */}
            <Box
              position="absolute"
              top="0"
              bottom="0"
              left="33.33%"
              w="3px"
              bg="rgba(255,255,255)"
              zIndex={20}
            />
            {/* Lado direito (seu time): divide ataque e fundo */}
            <Box
              position="absolute"
              top="0"
              bottom="0"
              right="33.33%"
              w="3px"
              bg="rgba(255,255,255)"
              zIndex={20}
            />

            {/* REDE - Linha grossa central dividindo os dois times */}
            <Box
              position="absolute"
              top="0"
              bottom="0"
              left="50%"
              w="4px"
              bg="white"
              transform="translateX(-50%)"
              zIndex={25}
              boxShadow="0 0 10px rgba(255,255,255,0.5)"
            />

            {/* Botão de Erro do Adversário - Movido para o topo da quadra adversária */}
            <Button
              position="absolute"
              top="-40px"
              left="25%"
              transform="translateX(-50%)"
              size="sm"
              colorScheme="red"
              variant="solid"
              zIndex={40}
              onClick={(e) => {
                e.stopPropagation()
                handleOpponentError()
              }}
              isDisabled={!gameStarted || !isLineupComplete || (rallyState.servingTeam === 'home' && rallyState.currentStep === 'serve')}
              boxShadow="md"
              borderWidth="1px"
              borderColor="white"
              _disabled={{
                opacity: 0.5,
                cursor: 'not-allowed',
                bg: 'gray.500'
              }}
              data-testid="btn-opponent-error"
            >
              Erro Adversário
            </Button>

            {/* Botão de Substituição - Placeholder no topo do seu time */}
            <Button
              position="absolute"
              top="-40px"
              right="25%"
              transform="translateX(50%)"
              size="sm"
              colorScheme="yellow"
              variant="solid"
              zIndex={40}
              onClick={(e) => {
                e.stopPropagation()
                setShowSubModal(true)
              }}
              isDisabled={!gameStarted}
              boxShadow="md"
              borderWidth="1px"
              borderColor="white"
              _disabled={{
                opacity: 0.5,
                cursor: 'not-allowed',
                bg: 'gray.500'
              }}
            >
              Substituição
            </Button>

            {/* Labels dos times */}
            <Box
              position="absolute"
              top="2%"
              left="2%"
              color="orange.400"
              fontSize={{ base: 'sm', md: 'md', lg: 'lg' }}
              fontWeight="bold"
              textShadow="2px 2px 4px rgba(0,0,0,0.7)"
              zIndex={30}
              pointerEvents="none"
            >
              {gameConfig?.opponentName || 'Time Adversário'}
            </Box>
            <Box
              position="absolute"
              bottom="2%"
              right="2%"
              color="blue.400"
              fontSize={{ base: 'sm', md: 'md', lg: 'lg' }}
              fontWeight="bold"
              textShadow="2px 2px 4px rgba(0,0,0,0.7)"
              zIndex={30}
            >
              {selectedTeam?.name || 'Seu Time'}
            </Box>

            {/* Zonas de ataque do adversário (frente: Z4, Z3, Z2) — sem subdivisão */}
            {[4, 3, 2].map((zone) => (
              <div
                key={`opp-${zone}`}
                className={`absolute border border-dashed border-orange-500/40 hover:bg-orange-500 transition-all cursor-pointer ${getOpponentZoneClasses(
                  zone
                )}`}
                onClick={(e) => handleZoneClick(e, zone + 10)}
              />
            ))}

            {/* Zonas de defesa do adversário (fundo: Z5, Z6, Z1) — grade 2×6 para heatmap preciso */}
            {Array.from({ length: 12 }, (_, i) => {
              const row = Math.floor(i / 2) // 0-5
              const col = i % 2             // 0-1
              // Zona: rows 0-1 → Z5 (15), rows 2-3 → Z6 (16), rows 4-5 → Z1 (11)
              const zone = row < 2 ? 15 : row < 4 ? 16 : 11
              const cellW = 33.33 / 2  // 16.67%
              const cellH = 100 / 6    // 16.67%
              return (
                <div
                  key={`opp-grid-${i}`}
                  className="absolute border border-dashed border-orange-500/30 hover:bg-orange-500 hover:border-orange-400/60 transition-all cursor-pointer"
                  style={{
                    left: `${col * cellW}%`,
                    top: `${row * cellH}%`,
                    width: `${cellW}%`,
                    height: `${cellH}%`,
                  }}
                  onClick={(e) => handleZoneClick(e, zone)}
                />
              )
            })}

            {/* Zonas - Seu Time (direita) */}
            {[4, 3, 2, 5, 6, 1].map((zone) => (
              <div
                key={`home-${zone}`}
                data-testid={`court-zone-${zone}`}
                className={`absolute border border-dashed border-blue-500/40 hover:bg-blue-500/20 transition-all cursor-pointer ${getHomeZoneClasses(
                  zone
                )}`}
                onClick={(e) => handleZoneClick(e, zone)}
              />
            ))}

            {/* Indicador de "Aguardando Zona" quando pendingAction ativo */}
            {pendingAction && (
              <Box
                position="absolute"
                bottom="8px"
                left="50%"
                transform="translateX(-50%)"
                bg="yellow.600"
                color="white"
                px={4}
                py={2}
                borderRadius="full"
                fontSize="sm"
                fontWeight="bold"
                zIndex={35}
                className="pulse-live"
                shadow="lg"
                whiteSpace="nowrap"
                pointerEvents="none"
              >
                Clique na zona de destino
              </Box>
            )}

            {/* Jogadores e Posições */}
            <>
              {/* Seu time (posições 1-6) - Com jogadores cadastrados */}
              {(() => {
                const isHomeSacando = rallyState.servingTeam === 'home' && rallyState.currentStep === 'serve'
                const lineupPositionInZone1 = getRotatedPosition(1, rotation)
                const playerInZone1Id = courtPositions[lineupPositionInZone1 as keyof CourtPositions]

                // Calcular jogadores esperados para a próxima ação
                // Quando há pendingAction (aguardando zona), não mostrar badges
                const expectedInfo = gameStarted && isLineupComplete && !pendingAction
                  ? getExpectedPlayerIds(
                      rallyState.currentStep,
                      rallyState.servingTeam,
                      courtPositions,
                      rotation,
                      players,
                      getRotatedPosition,
                      lastSetDestinationZone,
                      rallyState.rallyActions
                    )
                  : { ids: new Set<string>(), badge: '', color: '', badgeMap: undefined as Map<string, string> | undefined, colorMap: undefined as Map<string, string> | undefined }

                // Modo de formação:
                // - 'serve': meu time sacando, aguardando o saque
                // - 'reception': adversário sacando, aguardando recepção
                // - 'transition': rally em andamento (após saque/recepção), jogadores em posição de jogo
                const isServeStep = rallyState.currentStep === 'serve'
                const mode: FormationMode = isServeStep
                  ? (rallyState.servingTeam === 'home' ? 'serve' : 'reception')
                  : 'transition'

                return courtPlayers
                  .slice(0, 6)
                  .map((player, index) => {
                    if (!player) {
                      return (
                        <EmptyPlayerSlot
                          key={`empty-${index}`}
                          position={index + 1}
                          positionNumber={getYourTeamPositionNumber(index + 1)}
                          onClick={() => handleEmptySlotClick(index + 1)}
                        />
                      )
                    }
                    // Usa a posição de lineup (slot na súmula) em vez da posição natural do jogador
                    const visualZone = index + 1
                    const lineupPosition = getRotatedPosition(visualZone, rotation)
                    // Sacador vai para posição fixa de saque enquanto step === 'serve'
                    const isSacador = isHomeSacando && player.id === playerInZone1Id

                    // Substituição automática do líbero: entra no lugar do central da linha de trás
                    const BACK_ROW_ZONES = new Set([1, 5, 6])
                    const CENTRAL_LINEUPS = new Set([3, 6])
                    const isCentral = CENTRAL_LINEUPS.has(lineupPosition)
                    const isBackRow = BACK_ROW_ZONES.has(visualZone)
                    // Central fica em quadra durante TODO o rally quando saca (Z1 + home serve)
                    const isCentralServingRally = visualZone === 1 && rallyState.servingTeam === 'home'
                    const useLibero = !!(liberoId && gameStarted && isCentral && isBackRow && !isCentralServingRally)
                    const displayPlayer = useLibero ? (getPlayerById(liberoId) ?? player) : player

                    // Formação livre só após iniciar scout; antes, posição fixa de zona (súmula)
                    const formationOffset = gameStarted
                      ? (isSacador
                          ? { top: 15, right: 5 }
                          : useLibero
                            ? (getFormationOffset(rotation, mode, 'libero', 0) ?? undefined)
                            : (getFormationOffsetByLineup(rotation, mode, lineupPosition) ?? undefined))
                      : undefined
                    return (
                      <PlayerCard
                        key={displayPlayer.id}
                        player={displayPlayer}
                        position={index + 1}
                        positionNumber={getYourTeamPositionNumber(index + 1)}
                        formationOffset={formationOffset}
                        isSelected={selectedPlayer === displayPlayer.jerseyNumber.toString()}
                        isServeTurn={gameStarted && isLineupComplete && isHomeSacando && player.id === playerInZone1Id}
                        isUnclickable={isLineupComplete && isHomeSacando && player.id !== playerInZone1Id}
                        isExpected={gameStarted && isLineupComplete && expectedInfo.ids.has(player.id) && !(useLibero && (expectedInfo.badgeMap?.get(player.id) || expectedInfo.badge) === 'ATACAR')}
                        expectedBadge={expectedInfo.ids.has(player.id) && !(useLibero && (expectedInfo.badgeMap?.get(player.id) || expectedInfo.badge) === 'ATACAR') ? (expectedInfo.badgeMap?.get(player.id) || expectedInfo.badge) : undefined}
                        expectedColor={expectedInfo.ids.has(player.id) && !(useLibero && (expectedInfo.badgeMap?.get(player.id) || expectedInfo.badge) === 'ATACAR') ? (expectedInfo.colorMap?.get(player.id) || expectedInfo.color) : undefined}
                        onClick={() => handlePlayerClick(displayPlayer)}
                        onRemove={!gameStarted ? () => handleRemovePlayer(index + 1) : undefined}
                      />
                    )
                  })
              })()}

              {/* Slot do Líbero — fora das 6 zonas, posição fixa */}
              {(() => {
                // Líberos disponíveis (selecionados no step 2, não em quadra, posição = libero)
                const onCourtIds = Object.values(courtPositions).filter(Boolean) as string[]
                const availableLiberos = players.filter(
                  p => p.position === 'libero' && !onCourtIds.includes(p.id)
                )
                const liberoPlayer = liberoId ? getPlayerById(liberoId) : null
                // Só mostra o slot se:
                // 1. Fase de lineup (não começou o scout) E há líberos disponíveis ou já selecionado
                // 2. OU se já há líbero selecionado (mesmo depois de iniciar)
                const showSlot = (!gameStarted && (availableLiberos.length > 0 || liberoPlayer)) || (!gameStarted && liberoPlayer)
                if (!showSlot) return null

                if (!liberoPlayer) {
                  // Slot vazio — clicável para selecionar líbero
                  return (
                    <Box
                      position="absolute"
                      w={{ base: '16', md: '20' }}
                      h={{ base: '16', md: '20' }}
                      bottom="4px"
                      right="4px"
                      zIndex={30}
                      cursor="pointer"
                      onClick={() => {
                        // Se há apenas 1 líbero, seleciona automaticamente
                        if (availableLiberos.length === 1 && onLiberoChange) {
                          onLiberoChange(availableLiberos[0].id)
                        } else if (availableLiberos.length > 1) {
                          // Abre seletor — reutiliza o selector com posição especial
                          setSelectedPosition(7) // posição 7 = líbero (convenção interna)
                          setShowPlayerSelector(true)
                        }
                      }}
                      _hover={{ transform: 'scale(1.1)' }}
                      transition="all 0.2s"
                    >
                      <Box
                        w="full"
                        h="full"
                        borderRadius="full"
                        borderWidth="3px"
                        borderStyle="dashed"
                        borderColor="yellow.500"
                        bg="yellow.900/30"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        position="relative"
                      >
                        <Text
                          color="yellow.400"
                          fontSize={{ base: 'lg', md: 'xl' }}
                          fontWeight="bold"
                        >
                          L
                        </Text>
                        <Box
                          position="absolute"
                          top="-2"
                          left="-2"
                          bg="yellow.500"
                          color="white"
                          fontWeight="bold"
                          fontSize={{ base: 'xs', md: 'sm' }}
                          w={{ base: '5', md: '6' }}
                          h={{ base: '5', md: '6' }}
                          borderRadius="full"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          borderWidth="2px"
                          borderColor="white"
                        >
                          L
                        </Box>
                      </Box>
                    </Box>
                  )
                }

                // Líbero selecionado — renderiza como PlayerCard com estilo especial
                return (
                  <Box
                    position="absolute"
                    w={{ base: '16', md: '20' }}
                    h={{ base: '16', md: '20' }}
                    bottom="4px"
                    right="4px"
                    transform="translate(0, 0)"
                    zIndex={30}
                  >
                    <Box
                      w="full"
                      h="full"
                      position="relative"
                    >
                      {/* Foto do jogador */}
                      <Box
                        position="relative"
                        w="full"
                        h="full"
                        borderRadius="full"
                        overflow="visible"
                        borderWidth="3px"
                        borderColor="yellow.400"
                        boxShadow="0 0 12px rgba(236, 201, 75, 0.5)"
                      >
                        <Image
                          src={liberoPlayer.photo}
                          alt={liberoPlayer.name}
                          w="full"
                          h="full"
                          objectFit="cover"
                          borderRadius="full"
                        />
                      </Box>

                      {/* Badge número da camisa */}
                      <Box
                        position="absolute"
                        bottom="-2"
                        right="-2"
                        bg="yellow.500"
                        color="white"
                        fontWeight="bold"
                        fontSize={{ base: 'xs', md: 'sm' }}
                        px={{ base: 1.5, md: 2 }}
                        py={{ base: 0.5, md: 1 }}
                        borderRadius="md"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        borderWidth="2px"
                        borderColor="white"
                        boxShadow="0 2px 6px rgba(0,0,0,0.4)"
                        zIndex={1}
                      >
                        #{liberoPlayer.jerseyNumber}
                      </Box>

                      {/* Badge L (posição) */}
                      <Box
                        position="absolute"
                        top="-2"
                        left="-2"
                        bg="yellow.500"
                        color="white"
                        fontWeight="bold"
                        fontSize={{ base: 'xs', md: 'sm' }}
                        w={{ base: '6', md: '7' }}
                        h={{ base: '6', md: '7' }}
                        borderRadius="full"
                        display="flex"
                        alignItems="center"
                        justifyContent="center"
                        borderWidth="2px"
                        borderColor="white"
                        boxShadow="0 2px 6px rgba(0,0,0,0.4)"
                        zIndex={1}
                      >
                        L
                      </Box>

                      {/* Botão remover */}
                      <Button
                        position="absolute"
                        top="-2"
                        right="-2"
                        size="xs"
                        w={{ base: '6', md: '7' }}
                        h={{ base: '6', md: '7' }}
                        minW="auto"
                        p={0}
                        borderRadius="full"
                        bg="red.500"
                        color="white"
                        _hover={{ bg: 'red.600' }}
                        borderWidth="2px"
                        borderColor="white"
                        boxShadow="0 2px 6px rgba(0,0,0,0.4)"
                        zIndex={2}
                        onClick={(e) => {
                          e.stopPropagation()
                          onLiberoChange?.('')
                        }}
                      >
                        <Text fontSize={{ base: 'xs', md: 'sm' }}>✕</Text>
                      </Button>

                      {/* Nome */}
                      <Box
                        position="absolute"
                        bottom="-8"
                        left="50%"
                        transform="translateX(-50%)"
                        bg="gray.900"
                        color="yellow.300"
                        px={2}
                        py={1}
                        borderRadius="md"
                        fontSize="xs"
                        whiteSpace="nowrap"
                        maxW="100px"
                        overflow="hidden"
                        textOverflow="ellipsis"
                        zIndex={1}
                      >
                        {liberoPlayer.name}
                      </Box>
                    </Box>
                  </Box>
                )
              })()}

              {/* Time adversário (posições 7-12) - Apenas números das posições */}
              {[7, 8, 9, 10, 11, 12].map((position) => (
                <OpponentPositionMarker
                  key={`opponent-${position}`}
                  position={position}
                  positionNumber={getOpponentPositionNumber(position)}
                />
              ))}
            </>
          </Box>
        </Box>
        {/* Modal de Substituição */}
      <SubstitutionModal
        isOpen={showSubModal}
        onClose={() => setShowSubModal(false)}
        playersOnCourt={Object.values(courtPositions)
          .map(id => getPlayerById(id))
          .filter((p): p is Player => p !== null)}
        benchPlayers={eligiblePlayers.filter(p => !Object.values(courtPositions).includes(p.id))}
        onConfirmSubstitution={(outId, inId) => {
          onSubstitution(outId, inId)
          setShowSubModal(false)
        }}
      />
    </Grid>
      {/* Painel de Ações */}
      {showActionPanel && (
        <ActionPanel
          selectedPlayer={selectedPlayer!}
          playerName={players.find(p => p.jerseyNumber.toString() === selectedPlayer)?.name}
          onActionComplete={handleActionComplete}
          onClose={closePanel}
          rallyState={rallyState}
          selectedAction={actionPanelFundamento}
          onSelectedActionChange={setActionPanelFundamento}
          highlightedKey={highlightedKey}
          showTips={showTips}
          enabledFundamentos={playerFilteredFundamentos}
          serveType={serveType}
          onServeTypeChange={setServeType}
        />
      )}

      {/* Modal de Seleção de Jogador com Prioridade por Posição */}
      <PlayerPositionSelector
        isOpen={showPlayerSelector}
        onClose={() => {
          setShowPlayerSelector(false)
          setSelectedPosition(null)
        }}
        players={selectedPosition === 7
          ? availablePlayers.filter(p => p.position === 'libero')
          : availablePlayers
        }
        position={selectedPosition === 7 ? 1 : (selectedPosition || 1)}
        onSelectPlayer={handleAddPlayer}
        rotation={rotation}
      />
    </>
  )
}

// Mapeamento das posições do seu time
// As posições 1-6 devem corresponder diretamente às zonas 1-6
function getYourTeamPositionNumber(position: number): number {
  // Posição na tela corresponde diretamente à zona
  return position
}

// Mapeamento das posições do time adversário
function getOpponentPositionNumber(position: number): number {
  // Posições 7-12 mapeiam para zonas 1-6
  const mapping: Record<number, number> = {
    7: 1, // Posição 7 → Zona 1
    8: 2, // Posição 8 → Zona 2
    9: 3, // Posição 9 → Zona 3
    10: 4, // Posição 10 → Zona 4
    11: 5, // Posição 11 → Zona 5
    12: 6, // Posição 12 → Zona 6
  }
  return mapping[position] || position
}

// Zonas para o lado do adversário (esquerda da quadra)
// Cada lado tem 50% da quadra (left: 0-50%)
// Área de fundo: 2/3 da metade = 33.33% (left: 0-33.33%)
// Área de ataque: 1/3 da metade = 16.67% (left: 33.33%-50%)
// 3 zonas na altura (top, middle, bottom) dividindo verticalmente em 1/3 cada
function getOpponentZoneClasses(zone: number): string {
  const zoneClasses = {
    // Linha de fundo - 0% a 33.33% da esquerda (mais largo, longe da rede)
    5: 'top-0 left-0 h-1/3', // Zona 5 - topo, fundo
    6: 'top-[33.33%] left-0 h-1/3', // Zona 6 - meio, fundo
    1: 'top-[66.67%] left-0 h-1/3', // Zona 1 - baixo, fundo

    // Linha de frente (ataque) - 33.33% a 50% da esquerda (mais estreito, próximo à rede)
    4: 'top-0 left-[33.33%] h-1/3', // Zona 4 - topo, ataque
    3: 'top-[33.33%] left-[33.33%] h-1/3', // Zona 3 - meio, ataque
    2: 'top-[66.67%] left-[33.33%] h-1/3', // Zona 2 - baixo, ataque
  }

  // Largura: fundo = 33.33%, ataque = 16.67%
  const widths: Record<number, string> = {
    5: 'w-[33.33%]',
    6: 'w-[33.33%]',
    1: 'w-[33.33%]',
    4: 'w-[16.67%]',
    3: 'w-[16.67%]',
    2: 'w-[16.67%]',
  }

  return `${zoneClasses[zone as keyof typeof zoneClasses]} ${widths[zone]}`
}

// Zonas para o seu time (direita da quadra)
// Cada lado tem 50% da quadra (right: 0-50%)
// Área de fundo: 2/3 da metade = 33.33% (right: 0-33.33%)
// Área de ataque: 1/3 da metade = 16.67% (right: 33.33%-50%)
function getHomeZoneClasses(zone: number): string {
  const zoneClasses = {
    // Linha de fundo - 0% a 33.33% da direita (mais largo, longe da rede)
    1: 'top-0 right-0 h-1/3', // Zona 1 - topo, fundo
    6: 'top-[33.33%] right-0 h-1/3', // Zona 6 - meio, fundo
    5: 'top-[66.67%] right-0 h-1/3', // Zona 5 - baixo, fundo

    // Linha de frente (ataque) - 33.33% a 50% da direita (mais estreito, próximo à rede)
    2: 'top-0 right-[33.33%] h-1/3', // Zona 2 - topo, ataque
    3: 'top-[33.33%] right-[33.33%] h-1/3', // Zona 3 - meio, ataque
    4: 'top-[66.67%] right-[33.33%] h-1/3', // Zona 4 - baixo, ataque
  }

  // Largura: fundo = 33.33%, ataque = 16.67%
  const widths: Record<number, string> = {
    1: 'w-[33.33%]',
    6: 'w-[33.33%]',
    5: 'w-[33.33%]',
    2: 'w-[16.67%]',
    3: 'w-[16.67%]',
    4: 'w-[16.67%]',
  }

  return `${zoneClasses[zone as keyof typeof zoneClasses]} ${widths[zone]}`
}

/**
 * Retorna IDs dos jogadores esperados para a próxima ação do rally.
 * Serve como sugestão visual — o operador pode clicar em qualquer jogador.
 */
function getExpectedPlayerIds(
  currentStep: RallyStep,
  servingTeam: ServingTeam,
  courtPositions: CourtPositions,
  rotation: number,
  players: Player[],
  getRotatedPosition: (basePos: number, rot: number) => number,
  lastSetDestinationZone?: number | null,
  rallyActions?: ScoutAction[]
): { ids: Set<string>; badge: string; color: string; badgeMap?: Map<string, string>; colorMap?: Map<string, string> } {
  const empty = { ids: new Set<string>(), badge: '', color: '' }

  // Saque do nosso time: já tratado pelo isServeTurn existente
  if (currentStep === 'serve' && servingTeam === 'home') return empty

  // Quando adversário saca, step='serve' mas nosso time recebe → tratar como recepção
  const effectiveCurrentStep: RallyStep = (currentStep === 'serve' && servingTeam === 'away') ? 'reception' : currentStep

  // Helper: obter ID do jogador na zona visual X
  const getPlayerInVisualZone = (visualZone: number): string | null => {
    const logicalPos = getRotatedPosition(visualZone, rotation)
    return courtPositions[logicalPos as keyof CourtPositions]
  }

  // Helper: encontrar jogador por posição tática
  const findPlayerByRole = (role: VolleyballPosition): string | null => {
    const onCourt = Object.values(courtPositions).filter(Boolean) as string[]
    return onCourt.find((id) => {
      const p = players.find((pl) => pl.id === id)
      return p?.position === role
    }) || null
  }

  switch (effectiveCurrentStep) {
    case 'reception': {
      // Passadores: ponteiros + central substituído pelo líbero (por role)
      const ids = new Set<string>()
      const BACK_ROW_ZONES = new Set([1, 5, 6])
      const CENTRAL_LINEUPS = new Set([3, 6])
      const onCourt = Object.values(courtPositions).filter(Boolean) as string[]
      for (const id of onCourt) {
        const p = players.find((pl) => pl.id === id)
        if (!p) continue
        // Ponteiros sempre recebem
        if (p.position === 'ponteiro') {
          ids.add(id)
          continue
        }
        // Central na linha de trás = líbero está ali, líbero recebe
        if (p.position === 'central') {
          for (let vz = 1; vz <= 6; vz++) {
            const lp = getRotatedPosition(vz, rotation)
            if (courtPositions[lp as keyof CourtPositions] === id && BACK_ROW_ZONES.has(vz) && CENTRAL_LINEUPS.has(lp)) {
              ids.add(id) // O render mostra o líbero, mas o ID no set é do central
            }
          }
        }
      }
      return { ids, badge: 'RECEBER', color: 'gray.400' }
    }

    case 'set': {
      const setterId = findPlayerByRole('levantador')
      // Se o levantador fez a última ação (ex: defesa), ele não pode levantar →
      // indicar o líbero (ou central da linha de trás) como levantador alternativo
      const lastAction = rallyActions && rallyActions.length > 0 ? rallyActions[rallyActions.length - 1] : null
      const setterJersey = setterId ? players.find(p => p.id === setterId)?.jerseyNumber.toString() : null
      const setterDidLastAction = lastAction && setterJersey && lastAction.player === setterJersey

      if (setterDidLastAction) {
        // Procurar líbero ou central da linha de trás para levantar
        const BACK_ROW_ZONES = new Set([1, 5, 6])
        const CENTRAL_LINEUPS = new Set([3, 6])
        const onCourt = Object.values(courtPositions).filter(Boolean) as string[]
        const ids = new Set<string>()
        for (const id of onCourt) {
          const p = players.find(pl => pl.id === id)
          if (!p || p.position !== 'central') continue
          for (let vz = 1; vz <= 6; vz++) {
            const lp = getRotatedPosition(vz, rotation)
            if (courtPositions[lp as keyof CourtPositions] === id && BACK_ROW_ZONES.has(vz) && CENTRAL_LINEUPS.has(lp)) {
              ids.add(id) // ID do central (render mostra o líbero)
            }
          }
        }
        if (ids.size > 0) {
          return { ids, badge: 'LEVANTAR', color: 'blue.400' }
        }
      }

      if (setterId) {
        return { ids: new Set([setterId]), badge: 'LEVANTAR', color: 'blue.400' }
      }
      return empty
    }

    case 'attack': {
      const BACK_ROW = new Set([1, 5, 6])
      // Levantador nunca recebe sugestão de atacar (ele acabou de levantar)
      const setterId = findPlayerByRole('levantador')

      // Helper: mapear zona de ataque para quem está fisicamente naquela zona
      // Usa courtPositions + rotation — independente da posição cadastrada do atleta
      const getAttackerForZone = (zone: number): string | null => {
        return getPlayerInVisualZone(zone)
      }

      // Se sabemos o destino do levantamento, destacar o atacante correto
      if (lastSetDestinationZone) {
        // Pipe / ataque de fundo: destino é zona de trás → destacar todos os jogadores
        // de fundo (líbero filtrado no render, levantador excluído aqui)
        if (BACK_ROW.has(lastSetDestinationZone)) {
          const ids = new Set<string>()
          for (const zone of [1, 5, 6]) {
            const id = getPlayerInVisualZone(zone)
            if (id && id !== setterId) ids.add(id)
          }
          return { ids, badge: 'ATACAR', color: 'orange.400' }
        }
        const id = getAttackerForZone(lastSetDestinationZone)
        if (id && id !== setterId) {
          return { ids: new Set([id]), badge: 'ATACAR', color: 'orange.400' }
        }
      }
      // Fallback: todos da linha de frente (zonas visuais 2, 3, 4), exceto levantador
      const ids = new Set<string>()
      for (const zone of [2, 3, 4]) {
        const id = getAttackerForZone(zone)
        if (id && id !== setterId) ids.add(id)
      }
      return { ids, badge: 'ATACAR', color: 'orange.400' }
    }

    case 'block': {
      // Bloqueadores (frente) + Defensores (fundo)
      const ids = new Set<string>()
      const badgeMap = new Map<string, string>()
      const colorMap = new Map<string, string>()
      for (const zone of [2, 3, 4]) {
        const id = getPlayerInVisualZone(zone)
        if (id) {
          ids.add(id)
          badgeMap.set(id, 'BLOQUEAR')
          colorMap.set(id, 'purple.400')
        }
      }
      for (const zone of [1, 5, 6]) {
        const id = getPlayerInVisualZone(zone)
        if (id) {
          ids.add(id)
          badgeMap.set(id, 'DEFENDER')
          colorMap.set(id, 'green.400')
        }
      }
      return { ids, badge: 'BLOQUEAR', color: 'purple.400', badgeMap, colorMap }
    }

    case 'dig': {
      // Defensores: linha de fundo (zonas visuais 1, 5, 6)
      const ids = new Set<string>()
      for (const zone of [1, 5, 6]) {
        const id = getPlayerInVisualZone(zone)
        if (id) ids.add(id)
      }
      return { ids, badge: 'DEFENDER', color: 'green.400' }
    }

    default:
      return empty
  }
}

// Posições dos jogadores na quadra horizontal - Formação real de vôlei
// Centralizados nas áreas de fundo (2/3) e ataque (1/3)
// pos 1-6: Seu time (direita) - zonas 1,2,3,4,5,6
// pos 7-12: Time adversário (esquerda) - zonas 1,2,3,4,5,6
function getPositionClasses(pos: number): string {
  const positions = {
    // SEU TIME (direita)
    // Área de FUNDO (right: 0-33.33%) - zonas 1, 6, 5
    // Centro horizontal: 16.67% (meio de 0-33.33%)
    1: 'top-[16.67%] right-[16.67%]', // Zona 1 - 1/6 da altura
    6: 'top-[50%] right-[16.67%]', // Zona 6 - meio exato
    5: 'top-[83.33%] right-[16.67%]', // Zona 5 - 5/6 da altura

    // Área de ATAQUE (right: 33.33%-50%) - zonas 2, 3, 4
    // Centro horizontal: 41.67% (meio entre 33.33% e 50%)
    2: 'top-[16.67%] right-[41.67%]', // Zona 2 - 1/6 da altura
    3: 'top-[50%] right-[41.67%]', // Zona 3 - meio exato
    4: 'top-[83.33%] right-[41.67%]', // Zona 4 - 5/6 da altura

    // TIME ADVERSÁRIO (esquerda)
    // Área de FUNDO (left: 0-33.33%) - zonas 5, 6, 1
    // Centro horizontal: 16.67% (meio de 0-33.33%)
    11: 'top-[16.67%] left-[16.67%]', // Zona 5 - 1/6 da altura
    12: 'top-[50%] left-[16.67%]', // Zona 6 - meio exato
    7: 'top-[83.33%] left-[16.67%]', // Zona 1 - 5/6 da altura

    // Área de ATAQUE (left: 33.33%-50%) - zonas 4, 3, 2
    // Centro horizontal: 41.67% (meio entre 33.33% e 50%)
    10: 'top-[16.67%] left-[41.67%]', // Zona 4 - topo, ataque (centro da área de ataque)
    9: 'top-[50%] left-[41.67%]', // Zona 3 - meio, ataque
    8: 'top-[83.33%] left-[41.67%]', // Zona 2 - baixo, ataque
  }
  return positions[pos as keyof typeof positions]
}

function EmptyPlayerSlot({
  position,
  positionNumber,
  onClick,
}: {
  position: number
  positionNumber: number
  onClick?: () => void
}) {
  return (
    <Box
      position="absolute"
      w={{ base: '16', md: '20' }}
      h={{ base: '16', md: '20' }}
      className={getPositionClasses(position)}
      transform="translate(50%, -50%)"
      zIndex={30}
      cursor={onClick ? 'pointer' : 'default'}
      onClick={onClick}
      _hover={onClick ? { transform: 'translate(50%, -50%) scale(1.1)' } : {}}
      transition="all 0.2s"
    >
      {/* Placeholder vazio com número da posição */}
      <Box
        w="full"
        h="full"
        borderRadius="full"
        borderWidth="3px"
        borderStyle="dashed"
        borderColor="blue.500"
        bg="blue.900/30"
        display="flex"
        alignItems="center"
        justifyContent="center"
        position="relative"
      >
        <Text
          color="blue.400"
          fontSize={{ base: 'xl', md: '2xl' }}
          fontWeight="bold"
        >
          +
        </Text>
        {/* Número da posição */}
        <Box
          position="absolute"
          top="-2"
          left="-2"
          bg="blue.500"
          color="white"
          fontWeight="bold"
          fontSize={{ base: 'xs', md: 'sm' }}
          w={{ base: '5', md: '6' }}
          h={{ base: '5', md: '6' }}
          borderRadius="full"
          display="flex"
          alignItems="center"
          justifyContent="center"
          borderWidth="2px"
          borderColor="white"
        >
          {positionNumber}
        </Box>
      </Box>
    </Box>
  )
}

function OpponentPositionMarker({
  position,
  positionNumber,
}: {
  position: number
  positionNumber: number
}) {
  return (
    <Box
      position="absolute"
      w={{ base: '10', md: '12' }}
      h={{ base: '10', md: '12' }}
      className={getPositionClasses(position)}
      transform="translate(-50%, -50%)"
      zIndex={20}
      display="flex"
      alignItems="center"
      justifyContent="center"
      pointerEvents="none"
    >
      <Text
        color="orange.400"
        fontSize={{ base: 'md', md: 'lg' }}
        fontWeight="bold"
        opacity={0.5}
        userSelect="none"
      >
        Z{positionNumber}
      </Text>
    </Box>
  )
}

function PlayerCard({
  player,
  position,
  positionNumber,
  isSelected,
  isServeTurn,
  isUnclickable,
  isExpected,
  expectedBadge,
  expectedColor,
  formationOffset,
  onClick,
  onRemove,
}: {
  player: Player
  position: number
  positionNumber: number
  isSelected: boolean
  isServeTurn?: boolean
  isUnclickable?: boolean
  isExpected?: boolean
  expectedBadge?: string
  expectedColor?: string
  formationOffset?: { top: number; right: number }
  onClick: () => void
  onRemove?: () => void
}) {
  return (
    <motion.div
      className={!formationOffset ? getPositionClasses(position) : undefined}
      style={{
        position: 'absolute',
        transform: 'translate(50%, -50%)',
        zIndex: 30,
        cursor: isUnclickable ? 'not-allowed' : 'pointer',
      }}
      animate={
        formationOffset
          ? { top: `${formationOffset.top}%`, right: `${formationOffset.right / 2}%` }
          : undefined
      }
      initial={
        formationOffset
          ? { top: `${formationOffset.top}%`, right: `${formationOffset.right / 2}%` }
          : false
      }
      transition={{ type: 'tween', ease: 'easeOut', duration: 0.35 }}
      data-testid={`player-pos-${position}`}
      onClick={(e) => {
        e.stopPropagation()
        onClick()
      }}
    >
      <Box
        w={{ base: '16', md: '20' }}
        h={{ base: '16', md: '20' }}
        opacity={isUnclickable ? 0.4 : 1}
        transition="all 0.2s"
        _hover={{
          transform: isUnclickable ? 'scale(1)' : 'scale(1.1)',
        }}
        transform={isSelected ? 'scale(1.15)' : 'scale(1)'}
      >
      {/* Badge "SACAR" quando é a vez do sacador */}
      {isServeTurn && !isSelected && (
        <Box
          position="absolute"
          top="-18px"
          left="50%"
          transform="translateX(-50%)"
          bg="green.500"
          color="white"
          fontSize="2xs"
          fontWeight="bold"
          px={1.5}
          py={0.5}
          borderRadius="md"
          whiteSpace="nowrap"
          zIndex={2}
          letterSpacing="0.05em"
        >
          SACAR
        </Box>
      )}
      {/* Badge genérico para próximo jogador esperado */}
      {isExpected && !isServeTurn && !isSelected && expectedBadge && (
        <Box
          position="absolute"
          top="-18px"
          left="50%"
          transform="translateX(-50%)"
          bg={expectedColor || 'blue.500'}
          color="white"
          fontSize="2xs"
          fontWeight="bold"
          px={1.5}
          py={0.5}
          borderRadius="md"
          whiteSpace="nowrap"
          zIndex={2}
          letterSpacing="0.05em"
          opacity={0.9}
        >
          {expectedBadge}
        </Box>
      )}
      {/* Foto do jogador */}
      <Box
        position="relative"
        w="full"
        h="full"
        borderRadius="full"
        overflow="visible"
        borderWidth="3px"
        borderColor={
          isSelected ? 'red.500'
          : isServeTurn ? 'green.400'
          : isExpected ? (expectedColor || 'blue.400')
          : 'white'
        }
        boxShadow={
          isSelected
            ? '0 0 20px rgba(231, 76, 60, 0.8)'
            : isServeTurn
            ? '0 0 16px rgba(72, 187, 120, 0.9)'
            : isExpected
            ? '0 0 12px rgba(100, 150, 255, 0.5)'
            : '0 4px 10px rgba(0,0,0,0.4)'
        }
        className={
          isServeTurn && !isSelected ? 'pulse-serve'
          : isExpected && !isSelected ? 'pulse-expected'
          : undefined
        }
      >
        <Image
          src={player.photo}
          alt={player.name}
          w="full"
          h="full"
          objectFit="cover"
          borderRadius="full"
        />
      </Box>

      {/* Número da camisa - fora do círculo (canto inferior direito) */}
      <Box
        position="absolute"
        bottom="-2"
        right="-2"
        bg={isSelected ? 'red.500' : 'blue.500'}
        color="white"
        fontWeight="bold"
        fontSize={{ base: 'xs', md: 'sm' }}
        px={{ base: 1.5, md: 2 }}
        py={{ base: 0.5, md: 1 }}
        borderRadius="md"
        display="flex"
        alignItems="center"
        justifyContent="center"
        borderWidth="2px"
        borderColor="white"
        boxShadow="0 2px 6px rgba(0,0,0,0.4)"
        zIndex={1}
      >
        #{player.jerseyNumber}
      </Box>

      {/* Número da posição - fora do círculo (canto superior esquerdo) */}
      <Box
        position="absolute"
        top="-2"
        left="-2"
        bg="blue.500"
        color="white"
        fontWeight="bold"
        fontSize={{ base: 'xs', md: 'sm' }}
        w={{ base: '6', md: '7' }}
        h={{ base: '6', md: '7' }}
        borderRadius="full"
        display="flex"
        alignItems="center"
        justifyContent="center"
        borderWidth="2px"
        borderColor="white"
        boxShadow="0 2px 6px rgba(0,0,0,0.4)"
        zIndex={1}
      >
        {positionNumber}
      </Box>

      {/* Botão de Remover - canto superior direito */}
      {onRemove && (
        <Button
          position="absolute"
          top="-2"
          right="-2"
          size="xs"
          w={{ base: '6', md: '7' }}
          h={{ base: '6', md: '7' }}
          minW="auto"
          p={0}
          borderRadius="full"
          bg="red.500"
          color="white"
          _hover={{ bg: 'red.600' }}
          borderWidth="2px"
          borderColor="white"
          boxShadow="0 2px 6px rgba(0,0,0,0.4)"
          zIndex={2}
          onClick={(e) => {
            e.stopPropagation()
            onRemove()
          }}
        >
          <Text fontSize={{ base: 'xs', md: 'sm' }}>✕</Text>
        </Button>
      )}

      {/* Nome do jogador (tooltip on hover) */}
      <Box
        position="absolute"
        bottom="-8"
        left="50%"
        transform="translateX(-50%)"
        bg="gray.900"
        color="white"
        px={2}
        py={1}
        borderRadius="md"
        fontSize="xs"
        whiteSpace="nowrap"
        opacity={0}
        transition="opacity 0.2s"
        pointerEvents="none"
        _groupHover={{
          opacity: 1,
        }}
      >
        <Text fontWeight="bold">{player.name}</Text>
      </Box>
      </Box>
    </motion.div>
  )
}
