// app/game/page.tsx
'use client'

import { useState, useEffect, useCallback, useRef } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Box,
  Flex,
  Heading,
  Text,
  Button,
  Checkbox,
  HStack,
  Skeleton,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useToast,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
} from '@chakra-ui/react'
import VolleyballCourt from '@/components/court/VolleyballCourt'
import ActionPanel from '@/components/court/ActionPanel'
import RallyFlow from '@/components/court/RallyFlow'
import LineupModal from '@/components/court/LineupModal'
import Scoreboard from '@/components/game/Scoreboard'
import RotationControls from '@/components/game/RotationControls'
import PointHistoryList from '@/components/game/PointHistoryList'
import RallyDetailsModal from '@/components/game/RallyDetailsModal'
import { useVolleyGame } from '@/hooks/useVolleyGame'
import { useMatchPersistence } from '@/hooks/useMatchPersistence'
import {
  GameConfig,
  ScoutAction,
  ServeType,
} from '@/types/scout'
import { SetInfo } from '@/types/game'
import { useTeamContext } from '@/contexts/TeamContext'
import { usePlayersAPI } from '@/hooks/usePlayersAPI'
import { useScoutTips } from '@/hooks/useScoutTips'
import { getActionLabel as getActionLabelCentral, getActionName } from '@/lib/actionLabels'

// ─────────────────────────────────────────────
// MatchSelector — Estado A (seleção de partida)
// ─────────────────────────────────────────────

interface ApiMatch {
  id: string
  awayTeam: string
  homeTeam: string
  tournament: string | null
  location: string | null
  date: string
  status: string
  lineup: string | null
  liberoId: string | null
  enabledFundamentos: string | null
  matchFormat: string | null
  teamId: string
  createdAt: string
}

interface ApiMatchSet {
  id: string
  number: number
  homeScore: number
  awayScore: number
  status: string
}

interface FinalizeTarget {
  matchId: string
  opponentName: string
  homeTeamName: string
  sets: ApiMatchSet[]
}

interface MatchSelectorProps {
  teamId: string
  onMatchSelected: (
    matchId: string,
    setNumber: number,
    matchName: string,
    existingSetId: string | null
  ) => void
  successMessage?: string | null
  onClearSuccess?: () => void
}

function MatchSelector({ teamId, onMatchSelected, successMessage, onClearSuccess }: MatchSelectorProps) {
  const [matches, setMatches] = useState<ApiMatch[]>([])
  const [matchSets, setMatchSets] = useState<Record<string, ApiMatchSet[]>>({})
  const [loading, setLoading] = useState(true)
  const [finalizeTarget, setFinalizeTarget] = useState<FinalizeTarget | null>(null)
  const [finalizing, setFinalizing] = useState(false)
  const toast = useToast()

  const loadMatches = useCallback(() => {
    if (!teamId) return
    setLoading(true)
    fetch(`/api/matches?teamId=${teamId}&status=in_progress`)
      .then((r) => r.json())
      .then(async (data: ApiMatch[]) => {
        setMatches(Array.isArray(data) ? data : [])
        const setsResults = await Promise.all(
          (Array.isArray(data) ? data : []).map((m) =>
            fetch(`/api/match-sets?matchId=${m.id}`)
              .then((r) => r.json())
              .then((sets: ApiMatchSet[]) => ({ matchId: m.id, sets: Array.isArray(sets) ? sets : [] }))
              .catch(() => ({ matchId: m.id, sets: [] as ApiMatchSet[] }))
          )
        )
        const setsMap: Record<string, ApiMatchSet[]> = {}
        setsResults.forEach(({ matchId, sets }) => { setsMap[matchId] = sets })
        setMatchSets(setsMap)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [teamId])

  useEffect(() => { loadMatches() }, [loadMatches])

  // Auto-dismiss success message
  useEffect(() => {
    if (!successMessage) return
    const t = setTimeout(() => onClearSuccess?.(), 4000)
    return () => clearTimeout(t)
  }, [successMessage, onClearSuccess])

  const handleFinalize = useCallback(async () => {
    if (!finalizeTarget) return
    setFinalizing(true)
    try {
      const { matchId, sets } = finalizeTarget
      const finalizedSets = sets.filter((s) => s.status === 'finalized')
      const homeSetsWon = finalizedSets.filter((s) => s.homeScore > s.awayScore).length
      const awaySetsWon = finalizedSets.filter((s) => s.awayScore > s.homeScore).length
      const result = homeSetsWon >= awaySetsWon ? 'vitoria' : 'derrota'
      const finalScore = `${homeSetsWon} x ${awaySetsWon}`

      const res = await fetch(`/api/matches/${matchId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          result,
          finalScore,
          sets: finalizedSets.map((s) => ({ number: s.number, homeScore: s.homeScore, awayScore: s.awayScore })),
          status: 'finalized',
        }),
      })

      if (!res.ok) throw new Error()

      setFinalizeTarget(null)
      toast({
        title: 'Partida finalizada!',
        description: `${finalizeTarget.opponentName} — ${finalScore} (${result === 'vitoria' ? 'Vitória' : 'Derrota'})`,
        status: 'success',
        duration: 5000,
        isClosable: true,
        position: 'top',
      })
      loadMatches()
    } catch {
      toast({ title: 'Erro ao finalizar partida', status: 'error', duration: 4000, position: 'top' })
    } finally {
      setFinalizing(false)
    }
  }, [finalizeTarget, loadMatches, toast])

  if (loading) {
    return (
      <Box maxW="820px" mx="auto" px={6} py={10}>
        <Box mb={8}>
          <Skeleton h="36px" w="180px" mb={2} borderRadius="md" />
          <Skeleton h="16px" w="300px" borderRadius="md" />
        </Box>
        {[0, 1].map((i) => (
          <Skeleton key={i} h="96px" borderRadius="xl" mb={3} />
        ))}
      </Box>
    )
  }

  return (
    <Box maxW="820px" mx="auto" px={6} py={10}>
      {/* Banner de sucesso */}
      {successMessage && (
        <Flex
          mb={5}
          px={4}
          py={3}
          bg="green.950"
          borderWidth="1px"
          borderColor="green.700"
          borderRadius="lg"
          align="center"
          gap={3}
        >
          <Box w="6px" h="6px" borderRadius="full" bg="green.400" flexShrink={0} />
          <Text color="green.300" fontSize="sm" fontWeight="medium" flex="1">
            {successMessage}
          </Text>
          <Button
            size="xs"
            variant="ghost"
            color="green.500"
            _hover={{ color: 'green.300', bg: 'green.900' }}
            onClick={onClearSuccess}
          >
            ✕
          </Button>
        </Flex>
      )}

      {/* Header */}
      <Box mb={8}>
        <Heading size="xl" color="white" fontWeight="800" letterSpacing="-0.02em" mb={1}>
          Iniciar Scout
        </Heading>
        <Text color="gray.500" fontSize="sm">
          Selecione a partida para gravar o próximo set
        </Text>
      </Box>

      {matches.length === 0 ? (
        <Box
          py={16}
          textAlign="center"
          borderWidth="1px"
          borderColor="gray.800"
          borderRadius="xl"
          bg="gray.950"
        >
          <Text color="gray.600" fontSize="2xl" mb={3}>🏐</Text>
          <Text color="gray.400" fontSize="sm" fontWeight="medium" mb={1}>
            Nenhuma partida em andamento
          </Text>
          <Text color="gray.600" fontSize="xs" mb={4}>
            Crie uma nova partida para começar o scout
          </Text>
          <Link href="/history">
            <Box
              as="span"
              display="inline-flex"
              alignItems="center"
              gap={1.5}
              px={4}
              py={2}
              borderRadius="lg"
              borderWidth="1px"
              borderColor="blue.800"
              bg="blue.950"
              color="blue.400"
              fontSize="sm"
              fontWeight="medium"
              cursor="pointer"
              transition="all 0.15s"
              _hover={{ bg: 'blue.900', borderColor: 'blue.600', color: 'blue.300' }}
            >
              Ir para Jogos →
            </Box>
          </Link>
        </Box>
      ) : (
        <Flex direction="column" gap={3}>
          {matches.map((match) => {
            const sets = matchSets[match.id] ?? []
            const finalizedSets = sets.filter((s) => s.status === 'finalized').sort((a, b) => a.number - b.number)
            const inProgressSet = sets.find((s) => s.status === 'in_progress')
            const nextSetNumber = inProgressSet ? inProgressSet.number : finalizedSets.length + 1
            const isResume = !!inProgressSet
            const canFinalize = finalizedSets.length > 0
            const matchFormat = match.matchFormat ? `MD${match.matchFormat}` : null

            const matchDate = new Date(match.date)
            const formattedDate = matchDate.toLocaleDateString('pt-BR', {
              day: '2-digit',
              month: '2-digit',
              year: 'numeric',
            })

            return (
              <Box
                key={match.id}
                bg="gray.900"
                borderWidth="1px"
                borderColor="gray.800"
                borderRadius="xl"
                borderLeftWidth="3px"
                borderLeftColor={isResume ? 'yellow.600' : 'blue.700'}
                overflow="hidden"
                transition="border-color 0.15s, box-shadow 0.15s"
                _hover={{ borderColor: 'gray.700', boxShadow: '0 0 0 1px rgba(255,255,255,0.04)' }}
              >
                {/* Linha superior: info + formato */}
                <Flex px={5} pt={4} pb={2} align="flex-start" gap={4}>
                  <Box flex="1" minW="0">
                    <Flex align="center" gap={2} mb={0.5}>
                      <Text color="white" fontWeight="700" fontSize="lg" lineHeight="1.2" noOfLines={1}>
                        vs. {match.awayTeam}
                      </Text>
                      {matchFormat && (
                        <Box
                          px={1.5}
                          py={0.5}
                          borderRadius="sm"
                          bg="gray.800"
                          borderWidth="1px"
                          borderColor="gray.700"
                          flexShrink={0}
                        >
                          <Text color="gray.500" fontSize="2xs" fontWeight="700" letterSpacing="0.05em">
                            {matchFormat}
                          </Text>
                        </Box>
                      )}
                    </Flex>
                    <Text color="gray.600" fontSize="xs">
                      {[match.tournament, formattedDate, match.location].filter(Boolean).join(' · ')}
                    </Text>
                  </Box>
                </Flex>

                {/* Linha inferior: chips + ações */}
                <Flex px={5} pb={4} align="center" gap={3} flexWrap="wrap">
                  {/* Set chips */}
                  <Flex gap={1.5} flex="1" flexWrap="wrap" minW="0">
                    {finalizedSets.map((s) => {
                      const homeWon = s.homeScore > s.awayScore
                      return (
                        <Box
                          key={s.id}
                          px={2}
                          py={1}
                          borderRadius="md"
                          bg={homeWon ? 'green.950' : 'red.950'}
                          borderWidth="1px"
                          borderColor={homeWon ? 'green.900' : 'red.900'}
                        >
                          <Text
                            color={homeWon ? 'green.400' : 'red.400'}
                            fontSize="xs"
                            fontWeight="600"
                            whiteSpace="nowrap"
                            letterSpacing="0.02em"
                          >
                            S{s.number} {s.homeScore}–{s.awayScore}
                          </Text>
                        </Box>
                      )
                    })}
                    {inProgressSet ? (
                      <Box
                        px={2}
                        py={1}
                        borderRadius="md"
                        bg="yellow.950"
                        borderWidth="1px"
                        borderColor="yellow.900"
                      >
                        <Text color="yellow.400" fontSize="xs" fontWeight="600" whiteSpace="nowrap">
                          S{inProgressSet.number} em andamento
                        </Text>
                      </Box>
                    ) : (
                      <Box
                        px={2}
                        py={1}
                        borderRadius="md"
                        bg="blue.950"
                        borderWidth="1px"
                        borderColor="blue.900"
                      >
                        <Text color="blue.500" fontSize="xs" fontWeight="600" whiteSpace="nowrap">
                          S{nextSetNumber} próximo
                        </Text>
                      </Box>
                    )}
                  </Flex>

                  {/* Ações */}
                  <HStack gap={2} flexShrink={0}>
                    {canFinalize && (
                      <Button
                        size="sm"
                        variant="ghost"
                        color="gray.500"
                        borderWidth="1px"
                        borderColor="gray.700"
                        _hover={{ color: 'red.300', borderColor: 'red.800', bg: 'red.950' }}
                        fontWeight="600"
                        onClick={() => setFinalizeTarget({
                          matchId: match.id,
                          opponentName: match.awayTeam,
                          homeTeamName: match.homeTeam,
                          sets,
                        })}
                      >
                        Finalizar Partida
                      </Button>
                    )}
                    <Button
                      colorScheme={isResume ? 'yellow' : 'blue'}
                      size="sm"
                      fontWeight="700"
                      onClick={() =>
                        onMatchSelected(match.id, nextSetNumber, match.awayTeam, inProgressSet?.id ?? null)
                      }
                    >
                      {isResume ? '⏵ Retomar Set' : '▶ Iniciar Scout'}
                    </Button>
                  </HStack>
                </Flex>
              </Box>
            )
          })}
        </Flex>
      )}

      {/* Modal: Finalizar Partida */}
      {finalizeTarget && (() => {
        const finalizedSets = finalizeTarget.sets
          .filter((s) => s.status === 'finalized')
          .sort((a, b) => a.number - b.number)
        const homeSetsWon = finalizedSets.filter((s) => s.homeScore > s.awayScore).length
        const awaySetsWon = finalizedSets.filter((s) => s.awayScore > s.homeScore).length
        const isVictory = homeSetsWon > awaySetsWon

        return (
          <Modal
            isOpen
            onClose={() => setFinalizeTarget(null)}
            isCentered
            size="md"
          >
            <ModalOverlay bg="blackAlpha.900" backdropFilter="blur(4px)" />
            <ModalContent
              bg="gray.950"
              borderWidth="1px"
              borderColor="whiteAlpha.100"
              borderRadius="2xl"
              overflow="hidden"
              shadow="0 25px 60px rgba(0,0,0,0.7)"
            >
              <Box px={6} pt={6} pb={4} borderBottomWidth="1px" borderBottomColor="whiteAlpha.50">
                <Text fontSize="2xs" color="gray.500" fontWeight="bold" textTransform="uppercase" letterSpacing="0.15em" mb={1}>
                  Encerrar partida
                </Text>
                <Text color="white" fontSize="xl" fontWeight="bold" letterSpacing="-0.02em">
                  vs. {finalizeTarget.opponentName}
                </Text>
              </Box>

              <Box px={6} py={5}>
                {/* Resumo dos sets */}
                <Text fontSize="2xs" color="gray.500" fontWeight="bold" textTransform="uppercase" letterSpacing="0.12em" mb={3}>
                  Sets finalizados
                </Text>

                {finalizedSets.length === 0 ? (
                  <Box px={4} py={3} bg="yellow.950" borderWidth="1px" borderColor="yellow.800" borderRadius="lg" mb={4}>
                    <Text color="yellow.300" fontSize="sm">
                      Nenhum set foi finalizado ainda. Finalize pelo menos um set no scout antes de encerrar.
                    </Text>
                  </Box>
                ) : (
                  <Flex direction="column" gap={1.5} mb={5}>
                    {finalizedSets.map((s) => {
                      const homeWon = s.homeScore > s.awayScore
                      return (
                        <Flex
                          key={s.id}
                          align="center"
                          justify="space-between"
                          px={4}
                          py={2.5}
                          borderRadius="lg"
                          bg={homeWon ? 'green.950' : 'red.950'}
                          borderWidth="1px"
                          borderColor={homeWon ? 'green.900' : 'red.900'}
                        >
                          <Text color="gray.400" fontSize="sm" fontWeight="medium">
                            Set {s.number}
                          </Text>
                          <Flex align="center" gap={3}>
                            <Text color="white" fontSize="md" fontWeight="bold" minW="28px" textAlign="right">
                              {s.homeScore}
                            </Text>
                            <Text color="gray.600" fontSize="xs">×</Text>
                            <Text color="white" fontSize="md" fontWeight="bold" minW="28px">
                              {s.awayScore}
                            </Text>
                            <Box
                              px={2}
                              py={0.5}
                              borderRadius="sm"
                              bg={homeWon ? 'green.900' : 'red.900'}
                            >
                              <Text color={homeWon ? 'green.300' : 'red.300'} fontSize="2xs" fontWeight="bold">
                                {homeWon ? 'W' : 'L'}
                              </Text>
                            </Box>
                          </Flex>
                        </Flex>
                      )
                    })}

                    {/* Resultado calculado */}
                    <Flex
                      align="center"
                      justify="space-between"
                      px={4}
                      py={3}
                      borderRadius="lg"
                      bg={isVictory ? 'green.900' : 'red.900'}
                      mt={1}
                    >
                      <Text color="white" fontSize="sm" fontWeight="bold">
                        Resultado final
                      </Text>
                      <Flex align="center" gap={2}>
                        <Text color="white" fontSize="lg" fontWeight="black" letterSpacing="-0.02em">
                          {homeSetsWon} × {awaySetsWon}
                        </Text>
                        <Box
                          px={2.5}
                          py={0.5}
                          borderRadius="md"
                          bg={isVictory ? 'green.700' : 'red.700'}
                        >
                          <Text color="white" fontSize="xs" fontWeight="bold">
                            {isVictory ? 'VITÓRIA' : 'DERROTA'}
                          </Text>
                        </Box>
                      </Flex>
                    </Flex>
                  </Flex>
                )}

                <Flex gap={3} mt={2}>
                  <Button
                    variant="ghost"
                    color="gray.600"
                    _hover={{ color: 'gray.400', bg: 'whiteAlpha.50' }}
                    onClick={() => setFinalizeTarget(null)}
                    flex="1"
                  >
                    Cancelar
                  </Button>
                  <Button
                    flex="2"
                    colorScheme={isVictory ? 'green' : 'red'}
                    fontWeight="bold"
                    borderRadius="lg"
                    isLoading={finalizing}
                    loadingText="Salvando..."
                    isDisabled={finalizedSets.length === 0}
                    onClick={handleFinalize}
                  >
                    Confirmar e encerrar
                  </Button>
                </Flex>
              </Box>
            </ModalContent>
          </Modal>
        )
      })()}
    </Box>
  )
}

// ─────────────────────────────────────────────
// ScoutPage — componente principal
// ─────────────────────────────────────────────

export default function ScoutPage() {
  const router = useRouter()
  const { showTips, toggleTips } = useScoutTips()

  // Estado da página: A = seleção de partida, B = scout do set
  const [pageState, setPageState] = useState<'A' | 'B'>('A')
  const [selectedMatchId, setSelectedMatchId] = useState<string | null>(null)
  const [successMessage, setSuccessMessage] = useState<string | null>(null)

  const [enabledFundamentos, setEnabledFundamentos] = useState<string[]>([
    'serve', 'reception', 'attack', 'block', 'dig', 'set',
  ])

  // Líbero selecionado
  const [liberoId, setLiberoId] = useState('')

  // Contexto de equipe selecionada
  const { selectedTeamId } = useTeamContext()
  const { players } = usePlayersAPI(selectedTeamId)

  // Configuração do jogo — preenchida ao selecionar partida
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
    history,
    substitutePlayer,
    undoLastAction,
    removeRallyAction,
    deleteHistoryPoint,
    editHistoryAction,
    lastRegisteredAction,
    canUndo,
    resetForNewSet,
  } = useVolleyGame({ gameConfig })

  // Histórico de sets finalizados
  const [setsHistory, setSetsHistory] = useState<SetInfo[]>([])
  const [isEndSetDialogOpen, setIsEndSetDialogOpen] = useState(false)
  const [isEndMatchDialogOpen, setIsEndMatchDialogOpen] = useState(false)
  const [endMatchConfirmed, setEndMatchConfirmed] = useState(false)

  // Persistência no banco de dados
  const {
    saveStatus,
    setDbSetId,
    createMatchInDb,
    createSetInDb,
    saveAndPause,
    finalizeSet,
    finalizeMatch,
  } = useMatchPersistence({
    gameConfig,
    actions,
    score,
    currentSet,
    setsHistory,
    rotation,
    servingTeam,
    initialDbMatchId: selectedMatchId,
  })

  const toast = useToast()

  // Helper para label de ação
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

  // ── Selecionar partida e entrar no scout ──
  const [isEntering, setIsEntering] = useState(false)
  const handleMatchSelected = useCallback(async (
    matchId: string,
    setNumber: number,
    _matchName: string,
    existingSetId: string | null,
  ) => {
    setIsEntering(true)
    try {
      // 1. Fetch match details
      const matchRes = await fetch(`/api/matches/${matchId}`)
      if (!matchRes.ok) throw new Error('Match not found')
      const match: ApiMatch = await matchRes.json()

      // 2. Build GameConfig from match data
      const lineup = match.lineup ? JSON.parse(match.lineup) : []
      const fundamentos = match.enabledFundamentos
        ? JSON.parse(match.enabledFundamentos)
        : ['serve', 'reception', 'attack', 'block', 'dig', 'set']
      const config: GameConfig = {
        gameId: match.id,
        teamId: match.teamId,
        teamName: match.homeTeam,
        opponentName: match.awayTeam,
        tournament: match.tournament || '',
        location: match.location || '',
        matchType: 'friendly',
        sets: parseInt(match.matchFormat || '5'),
        date: new Date(match.date),
        time: '',
        modelId: 'default',
        modelName: '',
        rotationStart: [1],
        lineup,
        liberoId: match.liberoId || '',
        enabledFundamentos: fundamentos,
        advanced: {
          useEPV: false,
          trackReceptionGradeAgainst: false,
          enableContextHashing: false,
          collectBlockersCount: false,
          collectChainId: false,
          enableXSR: false,
          enableEntropy: false,
        },
        createdAt: new Date(match.createdAt),
      }
      setGameConfig(config)
      if (match.liberoId) setLiberoId(match.liberoId)
      setEnabledFundamentos(fundamentos)

      // 3. Fetch finalized sets para popular setsHistory (scoreboard)
      const setsRes = await fetch(`/api/match-sets?matchId=${matchId}`)
      const sets: ApiMatchSet[] = setsRes.ok ? await setsRes.json() : []
      const finalized = Array.isArray(sets)
        ? sets
            .filter((s) => s.status === 'finalized')
            .sort((a, b) => a.number - b.number)
        : []
      setSetsHistory(finalized.map((s) => ({
        number: s.number,
        homeScore: s.homeScore,
        awayScore: s.awayScore,
      })))

      // 4. Registrar matchId no hook de persistência
      setSelectedMatchId(matchId)
      await createMatchInDb(matchId)

      // 5. Criar ou retomar set
      if (existingSetId) {
        setDbSetId(existingSetId)
      } else {
        await createSetInDb(matchId, setNumber)
      }
      setCurrentSet(setNumber)

      // 6. Resetar estado do jogo para o novo set
      resetForNewSet()
      setScore({ home: 0, away: 0 })
      setCourtPositions({ 1: null, 2: null, 3: null, 4: null, 5: null, 6: null })
      setGameStarted(false)
      setIsLineupPhase(false)
      setHasStarted(false)

      setPageState('B')
    } catch (err) {
      toast({
        title: 'Erro ao carregar partida',
        status: 'error',
        duration: 4000,
        position: 'top',
      })
    } finally {
      setIsEntering(false)
    }
  }, [createMatchInDb, createSetInDb, setDbSetId, setCurrentSet, resetForNewSet, setScore, toast])

  // Finalizar set: persistir no banco e voltar ao Estado A
  const handleEndSet = useCallback(async () => {
    const success = await finalizeSet(score.home, score.away)

    if (success) {
      const finishedSetNumber = currentSet
      const finishedScore = { ...score }

      setSetsHistory((prev) => [...prev, {
        number: finishedSetNumber,
        homeScore: finishedScore.home,
        awayScore: finishedScore.away,
      }])

      // Reset in-memory state
      resetForNewSet()
      setScore({ home: 0, away: 0 })
      setCourtPositions({ 1: null, 2: null, 3: null, 4: null, 5: null, 6: null })
      setGameStarted(false)
      setIsLineupPhase(false)
      setHasStarted(false)

      setIsEndSetDialogOpen(false)
      setPageState('A')
      setSuccessMessage(`Set ${finishedSetNumber} finalizado: ${finishedScore.home} × ${finishedScore.away}`)
    } else {
      toast({
        title: 'Erro ao finalizar set',
        description: 'Não foi possível salvar o set. Tente novamente.',
        status: 'error',
        duration: 4000,
        position: 'top',
      })
    }
  }, [currentSet, score, finalizeSet, resetForNewSet, toast, setScore])

  // Finalizar partida
  const handleEndMatch = useCallback(async () => {
    let finalSets = [...setsHistory]
    if (score.home > 0 || score.away > 0) {
      finalSets.push({ number: currentSet, homeScore: score.home, awayScore: score.away })
    }
    const success = await finalizeMatch(finalSets, score)
    setIsEndMatchDialogOpen(false)
    if (success) {
      toast({
        title: 'Partida finalizada!',
        description: 'Todos os dados foram salvos.',
        status: 'success',
        duration: 4000,
        isClosable: true,
        position: 'top',
      })
      setTimeout(() => router.push('/history'), 1500)
    } else {
      toast({
        title: 'Erro ao salvar',
        status: 'error',
        duration: 5000,
        isClosable: true,
        position: 'top',
      })
    }
  }, [setsHistory, score, currentSet, finalizeMatch, toast, router])

  // Salvar e sair (sem encerrar a partida/set)
  const handleSaveAndExit = async () => {
    await saveAndPause()
    setPageState('A')
  }

  // Estados de UI do jogo
  const [isStartDialogOpen, setIsStartDialogOpen] = useState(false)
  const [gameStarted, setGameStarted] = useState(false)
  const [initialServer, setInitialServer] = useState<'home' | 'away'>('home')
  const [initialRotation, setInitialRotation] = useState('1')
  const [hasStarted, setHasStarted] = useState(false)
  const [showLineupModal, setShowLineupModal] = useState(false)
  const [isLineupPhase, setIsLineupPhase] = useState(false)

  const [selectedPointId, setSelectedPointId] = useState<string | null>(null)
  const selectedPoint = selectedPointId ? history.find((p) => p.id === selectedPointId) ?? null : null
  const isRallyModalOpen = !!selectedPoint

  const isStartConfirmDisabled = initialServer === 'home' && !initialRotation

  const handleInitialServerChange = (value: 'home' | 'away') => {
    setInitialServer(value)
    setInitialRotation(value === 'home' ? '1' : '2')
  }

  // Etapa 1: Confirmar configuração inicial → fase de escalação
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
  }

  // ── Painel direito persistente ──
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

  const handlePositionChange = (position: number, playerId: string | null) => {
    setCourtPositions((prev) => ({ ...prev, [position]: playerId }))
  }

  const homeTeamName = gameConfig?.teamName || 'Seu Time'
  const opponentName = gameConfig?.opponentName || 'Adversário'
  const totalSets = gameConfig?.sets ?? null

  // ─────────────────────────────────────────────
  // RENDER
  // ─────────────────────────────────────────────

  return (
    <Box position="relative">
      {/* ── ESTADO A: Seleção de partida ── */}
      {pageState === 'A' && (
        <MatchSelector
          teamId={selectedTeamId || ''}
          onMatchSelected={handleMatchSelected}
          successMessage={successMessage}
          onClearSuccess={() => setSuccessMessage(null)}
        />
      )}

      {/* Loading ao entrar na partida */}
      {isEntering && (
        <Box
          position="fixed"
          inset={0}
          bg="blackAlpha.800"
          display="flex"
          alignItems="center"
          justifyContent="center"
          zIndex={200}
        >
          <Text color="white" fontSize="lg">Carregando partida...</Text>
        </Box>
      )}

      {/* ── ESTADO B: Scout do set ── */}
      {pageState === 'B' && (
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
            {/* LEFT */}
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
                  onClick={() => setPageState('A')}
                  px={1}
                >
                  ← Partidas
                </Button>
              )}
              <Box w="1px" h="20px" bg="whiteAlpha.200" />
            </Flex>

            {/* CENTER: Scoreboard */}
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

            {/* RIGHT */}
            <Flex ml="auto" align="center" gap={2} flexShrink={0}>
              {hasStarted && <RotationControls rotation={rotation} />}

              {/* Fundamentos toggle */}
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

              {/* Dicas toggle */}
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
                <Box
                  w="26px"
                  h="13px"
                  borderRadius="full"
                  bg={showTips ? 'blue.500' : 'gray.700'}
                  position="relative"
                  transition="background 0.2s"
                  flexShrink={0}
                >
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
                const filledCount = Object.values(courtPositions).filter((id) => id !== null).length
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

            {/* LEFT: RallyFlow + Histórico */}
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
                      Set {currentSet}
                    </Text>
                    <Text color="whiteAlpha.500" fontSize="sm" mb={6}>
                      Defina o saque inicial e posicione os atletas em quadra
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
                      Iniciar Set {currentSet}
                    </Button>
                  </Box>
                </Box>
              )}
            </Box>

            {/* RIGHT: ActionPanel */}
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
                playerName={players.find((p) => p.jerseyNumber.toString() === sidebarSelectedPlayer)?.name}
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

          {/* Modal: Iniciar set (saque + rotação) */}
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
              <Box px={6} pt={6} pb={4} borderBottomWidth="1px" borderBottomColor="whiteAlpha.50">
                <Text fontSize="2xs" color="blue.500" fontWeight="bold" textTransform="uppercase" letterSpacing="0.15em" mb={1}>
                  Set {currentSet}
                </Text>
                <Text color="white" fontSize="xl" fontWeight="bold" letterSpacing="-0.02em">
                  Como começa o set?
                </Text>
              </Box>

              <Box px={6} py={5}>
                <Text fontSize="2xs" color="gray.500" fontWeight="bold" textTransform="uppercase" letterSpacing="0.12em" mb={3}>
                  Saque inicial
                </Text>
                <Flex gap={3} mb={6}>
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
                    _hover={{ borderColor: initialServer === 'home' ? 'blue.400' : 'whiteAlpha.200' }}
                    onClick={() => handleInitialServerChange('home')}
                    position="relative"
                    overflow="hidden"
                  >
                    {initialServer === 'home' && (
                      <Box position="absolute" top={0} left={0} right={0} h="2px" bg="blue.400" />
                    )}
                    <Text fontSize="xs" color={initialServer === 'home' ? 'blue.400' : 'gray.600'} fontWeight="bold" textTransform="uppercase" letterSpacing="0.1em" mb={1}>
                      {initialServer === 'home' ? '● Selecionado' : '○'}
                    </Text>
                    <Text fontSize="md" color={initialServer === 'home' ? 'white' : 'gray.400'} fontWeight="bold">
                      {homeTeamName}
                    </Text>
                  </Box>

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
                    _hover={{ borderColor: initialServer === 'away' ? 'orange.400' : 'whiteAlpha.200' }}
                    onClick={() => handleInitialServerChange('away')}
                    position="relative"
                    overflow="hidden"
                  >
                    {initialServer === 'away' && (
                      <Box position="absolute" top={0} left={0} right={0} h="2px" bg="orange.400" />
                    )}
                    <Text fontSize="xs" color={initialServer === 'away' ? 'orange.400' : 'gray.600'} fontWeight="bold" textTransform="uppercase" letterSpacing="0.1em" mb={1}>
                      {initialServer === 'away' ? '● Selecionado' : '○'}
                    </Text>
                    <Text fontSize="md" color={initialServer === 'away' ? 'orange.100' : 'gray.400'} fontWeight="bold">
                      {opponentName}
                    </Text>
                  </Box>
                </Flex>

                <Text fontSize="2xs" color="gray.500" fontWeight="bold" textTransform="uppercase" letterSpacing="0.12em" mb={3}>
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
                        <Text fontSize="xs" color="gray.600" fontWeight="medium" lineHeight="1" mb="2px">P</Text>
                        <Text fontSize="lg" color={isSelected ? 'white' : 'gray.500'} fontWeight="black" lineHeight="1">{pos}</Text>
                      </Box>
                    )
                  })}
                </Flex>
                <Text color="gray.700" fontSize="2xs" mb={6}>
                  {initialServer === 'home'
                    ? 'Pn = levantador está na zona n. Em P1, o levantador está na zona de saque (fundo direito).'
                    : 'Pn = levantador está na zona n. P2 é comum ao receber: ao marcar o primeiro ponto, o levantador rotaciona para a zona 1 e saca.'}
                </Text>

                <Flex gap={3}>
                  <Button
                    variant="ghost"
                    color="gray.600"
                    _hover={{ color: 'gray.400', bg: 'whiteAlpha.50' }}
                    onClick={() => setIsStartDialogOpen(false)}
                  >
                    Cancelar
                  </Button>
                  <Button
                    flex="1"
                    colorScheme="green"
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

          {/* Modal: Finalizar Set */}
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
                    <Text color="gray.500" fontSize="xl">×</Text>
                    <Box textAlign="center">
                      <Text color="blue.200" fontSize="sm">{opponentName}</Text>
                      <Text color="white" fontSize="3xl" fontWeight="bold">{score.away}</Text>
                    </Box>
                  </Flex>
                </Box>
                <Text color="gray.400" fontSize="sm">
                  O placar será salvo e você voltará à seleção de partidas.
                </Text>
                {setsHistory.length > 0 && (
                  <Box mt={3}>
                    <Text color="gray.500" fontSize="xs" mb={1}>Sets anteriores:</Text>
                    {setsHistory.map((s) => (
                      <Text key={s.number} color="gray.400" fontSize="xs">
                        Set {s.number}: {s.homeScore} × {s.awayScore}
                      </Text>
                    ))}
                  </Box>
                )}
              </ModalBody>
              <ModalFooter gap={3}>
                <Button variant="ghost" onClick={() => setIsEndSetDialogOpen(false)}>Cancelar</Button>
                <Button colorScheme="blue" onClick={handleEndSet} isLoading={saveStatus === 'saving'}>
                  Confirmar
                </Button>
              </ModalFooter>
            </ModalContent>
          </Modal>

          {/* Modal: Finalizar Partida */}
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
                      <Text color="white" fontSize="sm" fontWeight="bold">{s.homeScore} × {s.awayScore}</Text>
                    </Flex>
                  ))}
                  {(score.home > 0 || score.away > 0) && (
                    <Flex justify="space-between" mb={1}>
                      <Text color="yellow.300" fontSize="sm">Set {currentSet} (atual)</Text>
                      <Text color="yellow.300" fontSize="sm" fontWeight="bold">{score.home} × {score.away}</Text>
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
