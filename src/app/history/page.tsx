// app/history/page.tsx
'use client'

import { useState, useMemo, useEffect, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import {
  Box,
  Flex,
  Heading,
  Text,
  Input,
  Badge,
  Spinner,
  Button,
  Modal,
  ModalOverlay,
  ModalContent,
  ModalHeader,
  ModalBody,
  ModalFooter,
  useDisclosure,
  Checkbox,
} from '@chakra-ui/react'
import { useTeamContext } from '@/contexts/TeamContext'
import { useMatchesList, useInProgressMatches } from '@/hooks/useMatchesAPI'
import { usePlayersAPI } from '@/hooks/usePlayersAPI'
import { useTeams } from '@/hooks/useTeams'

// ─────────────────────────────────────────────
// Modal de criação de partida
// ─────────────────────────────────────────────

interface NewMatchModalProps {
  isOpen: boolean
  onClose: () => void
  teamId: string
  teamName: string
  onCreated: () => void
}

function NewMatchModal({ isOpen, onClose, teamId, teamName, onCreated }: NewMatchModalProps) {
  const { players, loading: loadingPlayers } = usePlayersAPI(teamId)
  const [step, setStep] = useState<1 | 2>(1)
  const [saving, setSaving] = useState(false)
  const [formError, setFormError] = useState('')

  const [form, setForm] = useState({
    opponent: '',
    tournament: '',
    location: '',
    date: new Date().toISOString().split('T')[0],
    time: '20:00',
    sets: '5',
  })

  const [selectedPlayers, setSelectedPlayers] = useState<string[]>([])
  const [liberoId, setLiberoId] = useState('')
  const [positionFilter, setPositionFilter] = useState('todos')

  const enabledFundamentos = ['serve', 'reception', 'attack', 'block', 'dig', 'set']

  // Reset ao abrir/fechar
  useEffect(() => {
    if (isOpen) {
      setStep(1)
      setForm({
        opponent: '',
        tournament: '',
        location: '',
        date: new Date().toISOString().split('T')[0],
        time: '20:00',
        sets: '5',
      })
      setSelectedPlayers([])
      setLiberoId('')
      setPositionFilter('todos')
      setFormError('')
    }
  }, [isOpen])

  const handleNext = () => {
    if (!form.opponent.trim()) { setFormError('Informe o nome da equipe adversária.'); return }
    if (!form.date) { setFormError('Informe a data da partida.'); return }
    setFormError('')
    setStep(2)
  }

  const togglePlayer = (id: string) => {
    setSelectedPlayers((prev) => prev.includes(id) ? prev.filter((p) => p !== id) : [...prev, id])
  }

  const filteredPlayers = positionFilter === 'todos'
    ? players
    : players.filter((p) => p.position === positionFilter)

  const handleCreate = async () => {
    if (selectedPlayers.length < 6) {
      setFormError('Selecione pelo menos 6 atletas.')
      return
    }
    setFormError('')
    setSaving(true)
    try {
      const lineup = selectedPlayers.map((pid) => ({
        playerId: pid,
        jerseyNumber: players.find((p) => p.id === pid)?.jerseyNumber ?? 0,
        position: players.find((p) => p.id === pid)?.position ?? '',
        isStarter: true,
      }))

      const res = await fetch('/api/matches', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          teamId,
          homeTeam: teamName,
          awayTeam: form.opponent,
          tournament: form.tournament || null,
          location: form.location || null,
          date: new Date(`${form.date}T${form.time}:00`).toISOString(),
          result: 'em_andamento',
          finalScore: '0 x 0',
          sets: [],
          status: 'in_progress',
          lineup,
          liberoId: liberoId || null,
          enabledFundamentos,
          matchFormat: form.sets,
        }),
      })

      if (!res.ok) throw new Error('Erro ao criar partida')
      onCreated()
      onClose()
    } catch {
      setFormError('Erro ao criar partida. Tente novamente.')
    } finally {
      setSaving(false)
    }
  }

  const positionLabels: Record<string, string> = {
    todos: 'Todos',
    ponteiro: 'Ponteir.',
    central: 'Central',
    levantador: 'Levant.',
    oposto: 'Oposto',
    libero: 'Líbero',
  }

  const positionColors: Record<string, string> = {
    ponteiro: 'purple.300',
    central: 'teal.300',
    levantador: 'blue.300',
    oposto: 'orange.300',
    libero: 'yellow.300',
  }

  return (
    <Modal isOpen={isOpen} onClose={onClose} isCentered size="xl">
      <ModalOverlay bg="blackAlpha.900" backdropFilter="blur(4px)" />
      <ModalContent bg="gray.950" borderWidth="1px" borderColor="whiteAlpha.100" borderRadius="2xl" overflow="hidden">

        {/* Header */}
        <Box px={6} pt={6} pb={4} borderBottomWidth="1px" borderBottomColor="whiteAlpha.50">
          <Text fontSize="2xs" color="blue.500" fontWeight="bold" textTransform="uppercase" letterSpacing="0.15em" mb={1}>
            {step === 1 ? 'Passo 1 de 2 — Dados da partida' : 'Passo 2 de 2 — Escalação'}
          </Text>
          <Text color="white" fontSize="xl" fontWeight="bold" letterSpacing="-0.02em">
            Nova Partida
          </Text>
        </Box>

        <ModalBody px={6} py={5}>
          {step === 1 && (
            <Flex direction="column" gap={4}>
              <Box>
                <Text fontSize="sm" color="gray.300" mb={1.5} fontWeight="medium">
                  Equipe adversária <Text as="span" color="red.400">*</Text>
                </Text>
                <Input
                  value={form.opponent}
                  onChange={(e) => setForm((p) => ({ ...p, opponent: e.target.value }))}
                  placeholder="Nome da equipe adversária"
                  bg="gray.900"
                  color="white"
                  borderColor="gray.700"
                  _focus={{ borderColor: 'blue.500' }}
                  _placeholder={{ color: 'gray.600' }}
                  autoFocus
                />
              </Box>

              <Box>
                <Text fontSize="sm" color="gray.300" mb={1.5} fontWeight="medium">
                  Evento / Campeonato <Text as="span" color="gray.600" fontSize="xs" fontWeight="normal">(opcional)</Text>
                </Text>
                <Input
                  value={form.tournament}
                  onChange={(e) => setForm((p) => ({ ...p, tournament: e.target.value }))}
                  placeholder="Nome do evento"
                  bg="gray.900"
                  color="white"
                  borderColor="gray.700"
                  _focus={{ borderColor: 'blue.500' }}
                  _placeholder={{ color: 'gray.600' }}
                />
              </Box>

              <Box>
                <Text fontSize="sm" color="gray.300" mb={1.5} fontWeight="medium">
                  Local <Text as="span" color="gray.600" fontSize="xs" fontWeight="normal">(opcional)</Text>
                </Text>
                <Input
                  value={form.location}
                  onChange={(e) => setForm((p) => ({ ...p, location: e.target.value }))}
                  placeholder="Local da partida"
                  bg="gray.900"
                  color="white"
                  borderColor="gray.700"
                  _focus={{ borderColor: 'blue.500' }}
                  _placeholder={{ color: 'gray.600' }}
                />
              </Box>

              <Flex gap={3}>
                <Box flex="1">
                  <Text fontSize="sm" color="gray.300" mb={1.5} fontWeight="medium">
                    Data <Text as="span" color="red.400">*</Text>
                  </Text>
                  <Input
                    type="date"
                    value={form.date}
                    onChange={(e) => setForm((p) => ({ ...p, date: e.target.value }))}
                    bg="gray.900"
                    color="white"
                    borderColor="gray.700"
                    _focus={{ borderColor: 'blue.500' }}
                  />
                </Box>
                <Box flex="1">
                  <Text fontSize="sm" color="gray.300" mb={1.5} fontWeight="medium">Hora</Text>
                  <Input
                    type="time"
                    value={form.time}
                    onChange={(e) => setForm((p) => ({ ...p, time: e.target.value }))}
                    bg="gray.900"
                    color="white"
                    borderColor="gray.700"
                    _focus={{ borderColor: 'blue.500' }}
                  />
                </Box>
              </Flex>

              <Box>
                <Text fontSize="sm" color="gray.300" mb={2} fontWeight="medium">Formato</Text>
                <Flex gap={2}>
                  {(['3', '5'] as const).map((val) => {
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
                        cursor="pointer"
                        transition="all 0.15s"
                        _hover={{ borderColor: 'blue.600' }}
                        onClick={() => setForm((p) => ({ ...p, sets: val }))}
                        textAlign="center"
                      >
                        <Text fontSize="md" fontWeight="bold" color={isSelected ? 'blue.200' : 'gray.400'}>
                          MD{val}
                        </Text>
                        <Text fontSize="2xs" color={isSelected ? 'blue.400' : 'gray.600'}>
                          Melhor de {val}
                        </Text>
                      </Box>
                    )
                  })}
                </Flex>
              </Box>
            </Flex>
          )}

          {step === 2 && (
            <Box>
              {/* Filtro por posição */}
              <Flex gap={2} mb={4} flexWrap="wrap">
                {Object.entries(positionLabels).map(([pos, label]) => {
                  const isActive = positionFilter === pos
                  return (
                    <Box
                      key={pos}
                      as="button"
                      px={2.5}
                      py={1}
                      borderRadius="full"
                      fontSize="xs"
                      fontWeight="medium"
                      bg={isActive ? 'blue.800' : 'gray.800'}
                      color={isActive ? 'blue.200' : 'gray.500'}
                      borderWidth="1px"
                      borderColor={isActive ? 'blue.600' : 'gray.700'}
                      cursor="pointer"
                      onClick={() => setPositionFilter(pos)}
                      transition="all 0.12s"
                    >
                      {label}
                    </Box>
                  )
                })}
                <Text ml="auto" fontSize="xs" color="gray.500" alignSelf="center">
                  {selectedPlayers.length} selecionados
                </Text>
              </Flex>

              {/* Lista de jogadores */}
              {loadingPlayers ? (
                <Flex justify="center" py={8}><Spinner color="blue.400" /></Flex>
              ) : (
                <Box maxH="280px" overflowY="auto" pr={1}>
                  <Flex direction="column" gap={1.5}>
                    {filteredPlayers.map((player) => {
                      const isSelected = selectedPlayers.includes(player.id)
                      const isLibero = player.id === liberoId
                      return (
                        <Flex
                          key={player.id}
                          align="center"
                          gap={3}
                          px={3}
                          py={2}
                          borderRadius="md"
                          bg={isSelected ? 'blue.950' : 'gray.900'}
                          borderWidth="1px"
                          borderColor={isSelected ? 'blue.800' : 'gray.800'}
                          cursor="pointer"
                          transition="all 0.12s"
                          _hover={{ borderColor: 'blue.700' }}
                          onClick={() => togglePlayer(player.id)}
                        >
                          <Checkbox
                            isChecked={isSelected}
                            colorScheme="blue"
                            onChange={() => togglePlayer(player.id)}
                            onClick={(e) => e.stopPropagation()}
                          />
                          <Text
                            color={isSelected ? 'blue.300' : 'gray.400'}
                            fontWeight="bold"
                            fontSize="sm"
                            minW="28px"
                          >
                            #{player.jerseyNumber}
                          </Text>
                          <Text color="white" fontSize="sm" flex="1" noOfLines={1}>
                            {player.name}
                          </Text>
                          <Text
                            fontSize="xs"
                            color={positionColors[player.position] || 'gray.500'}
                            minW="60px"
                            textAlign="right"
                          >
                            {player.position}
                          </Text>
                          {player.position === 'libero' && isSelected && (
                            <Box
                              as="button"
                              px={2}
                              py={0.5}
                              borderRadius="sm"
                              fontSize="2xs"
                              fontWeight="bold"
                              bg={isLibero ? 'yellow.800' : 'gray.800'}
                              color={isLibero ? 'yellow.300' : 'gray.500'}
                              borderWidth="1px"
                              borderColor={isLibero ? 'yellow.700' : 'gray.700'}
                              onClick={(e: React.MouseEvent) => {
                                e.stopPropagation()
                                setLiberoId(isLibero ? '' : player.id)
                              }}
                              transition="all 0.12s"
                              flexShrink={0}
                            >
                              {isLibero ? '★ Líbero' : 'Líbero?'}
                            </Box>
                          )}
                        </Flex>
                      )
                    })}
                  </Flex>
                </Box>
              )}
            </Box>
          )}

          {formError && (
            <Box mt={4} px={3} py={2} bg="red.950" borderWidth="1px" borderColor="red.700" borderRadius="md">
              <Text color="red.300" fontSize="sm">{formError}</Text>
            </Box>
          )}
        </ModalBody>

        <ModalFooter gap={3} borderTopWidth="1px" borderTopColor="whiteAlpha.50" px={6} py={4}>
          {step === 2 && (
            <Button
              variant="ghost"
              color="gray.500"
              _hover={{ color: 'gray.300' }}
              onClick={() => { setStep(1); setFormError('') }}
            >
              ← Voltar
            </Button>
          )}
          <Button
            variant="ghost"
            color="gray.600"
            _hover={{ color: 'gray.400' }}
            onClick={onClose}
            mr="auto"
          >
            Cancelar
          </Button>
          {step === 1 ? (
            <Button colorScheme="blue" fontWeight="bold" onClick={handleNext}>
              Próximo — Escalação →
            </Button>
          ) : (
            <Button
              colorScheme="green"
              fontWeight="bold"
              onClick={handleCreate}
              isLoading={saving}
              loadingText="Criando..."
              isDisabled={selectedPlayers.length < 6}
            >
              Criar Partida
            </Button>
          )}
        </ModalFooter>
      </ModalContent>
    </Modal>
  )
}

// ─────────────────────────────────────────────
// HistoryPage
// ─────────────────────────────────────────────

export default function HistoryPage() {
  const router = useRouter()
  const { selectedTeamId } = useTeamContext()
  const { teams } = useTeams()
  const selectedTeam = teams.find((t) => t.id === selectedTeamId)

  const { matches: games, loading, refetch: refetchGames, deleteMatch: deleteMatchAPI } = useMatchesList(selectedTeamId)
  const { matches: inProgressMatches, loading: loadingInProgress, refetch: refetchInProgress } = useInProgressMatches(selectedTeamId)

  const { isOpen: isNewMatchOpen, onOpen: openNewMatch, onClose: closeNewMatch } = useDisclosure()

  const [searchTerm, setSearchTerm] = useState('')
  const [resultFilter, setResultFilter] = useState('todos')

  const handleMatchCreated = useCallback(() => {
    refetchGames()
    refetchInProgress()
  }, [refetchGames, refetchInProgress])

  const filteredGames = useMemo(() => {
    return games.filter((game) => {
      const matchesSearch = game.opponent.toLowerCase().includes(searchTerm.toLowerCase())
      const matchesResult = resultFilter === 'todos' || game.result === resultFilter
      return matchesSearch && matchesResult
    })
  }, [games, searchTerm, resultFilter])

  const stats = useMemo(() => {
    const total = games.length
    const victories = games.filter((g) => g.result === 'vitoria').length
    const defeats = games.filter((g) => g.result === 'derrota').length
    const winRate = total > 0 ? Math.round((victories / total) * 100) : 0

    let streak = 0
    let streakType = ''
    for (const g of games) {
      if (!streakType) { streakType = g.result; streak = 1 }
      else if (g.result === streakType) streak++
      else break
    }

    return { total, victories, defeats, winRate, streak, streakType }
  }, [games])

  const recentForm = games.slice(0, 5)

  const groupedByMonth = useMemo(() => {
    const groups: { label: string; games: typeof filteredGames }[] = []
    const seen = new Map<string, number>()
    for (const game of filteredGames) {
      const key = game.date.toLocaleDateString('pt-BR', { month: 'long', year: 'numeric' })
      const capitalKey = key.charAt(0).toUpperCase() + key.slice(1)
      if (!seen.has(capitalKey)) {
        seen.set(capitalKey, groups.length)
        groups.push({ label: capitalKey, games: [] })
      }
      groups[seen.get(capitalKey)!].games.push(game)
    }
    return groups
  }, [filteredGames])

  const handleDeleteGame = async (gameId: string, opponent: string, e: React.MouseEvent) => {
    e.stopPropagation()
    if (confirm(`Deletar a partida contra ${opponent}?`)) {
      await deleteMatchAPI(gameId)
      router.refresh()
    }
  }

  if (loading && loadingInProgress) {
    return (
      <Flex justify="center" align="center" minH="200px">
        <Spinner size="xl" color="blue.400" />
      </Flex>
    )
  }

  return (
    <>
      {/* Header */}
      <Flex justifyContent="space-between" alignItems="flex-start" mb={6} flexWrap="wrap" gap={4}>
        <Box>
          <Heading color="white" size={{ base: 'lg', md: 'xl' }} letterSpacing="-0.02em" mb={2}>
            Jogos
          </Heading>
          {recentForm.length > 0 && (
            <Flex align="center" gap={1.5}>
              <Text fontSize="xs" color="gray.500" mr={1}>Forma recente</Text>
              {recentForm.map((g, i) => (
                <Box
                  key={i}
                  w="8px" h="8px" borderRadius="full"
                  bg={g.result === 'vitoria' ? 'green.400' : 'red.400'}
                  title={g.result === 'vitoria' ? 'Vitória' : 'Derrota'}
                />
              ))}
            </Flex>
          )}
        </Box>

        <Flex align="center" gap={4} flexWrap="wrap">
          {/* KPI inline */}
          {stats.total > 0 && (
            <Flex gap={5} align="center">
              <Box textAlign="center">
                <Text fontSize="2xl" fontWeight="black" color="white" lineHeight="1.1">{stats.total}</Text>
                <Text fontSize="xs" color="gray.500">jogos</Text>
              </Box>
              <Box w="1px" h="28px" bg="gray.700" />
              <Box textAlign="center">
                <Text fontSize="2xl" fontWeight="black" color="green.400" lineHeight="1.1">{stats.victories}</Text>
                <Text fontSize="xs" color="gray.500">vitórias</Text>
              </Box>
              <Box w="1px" h="28px" bg="gray.700" />
              <Box textAlign="center">
                <Text fontSize="2xl" fontWeight="black" color="red.400" lineHeight="1.1">{stats.defeats}</Text>
                <Text fontSize="xs" color="gray.500">derrotas</Text>
              </Box>
              <Box w="1px" h="28px" bg="gray.700" />
              <Box textAlign="center">
                <Text fontSize="2xl" fontWeight="black" color="blue.300" lineHeight="1.1">{stats.winRate}%</Text>
                <Text fontSize="xs" color="gray.500">aproveit.</Text>
              </Box>
            </Flex>
          )}

          <Button
            colorScheme="blue"
            size="sm"
            fontWeight="bold"
            onClick={openNewMatch}
          >
            + Nova Partida
          </Button>
        </Flex>
      </Flex>

      {/* Barra de aproveitamento */}
      {stats.total > 0 && (
        <Box mb={6}>
          <Box h="4px" bg="red.900/60" borderRadius="full" overflow="hidden">
            <Box h="full" w={`${stats.winRate}%`} bg="green.500" borderRadius="full" />
          </Box>
        </Box>
      )}

      {/* Seção: Partidas em andamento */}
      {inProgressMatches.length > 0 && (
        <Box mb={8}>
          <Flex align="center" gap={3} mb={3}>
            <Box w="6px" h="6px" borderRadius="full" bg="yellow.400" flexShrink={0} />
            <Text fontSize="xs" fontWeight="bold" color="yellow.500" textTransform="uppercase" letterSpacing="widest">
              Em andamento
            </Text>
            <Box flex="1" h="1px" bg="gray.700/50" />
          </Flex>

          <Flex direction="column" gap={2}>
            {inProgressMatches.map((match) => (
              <Flex
                key={match.id}
                align="center"
                px={5}
                py={3.5}
                bg="gray.800"
                borderRadius="xl"
                borderWidth="1px"
                borderColor="yellow.900"
                gap={4}
                position="relative"
                overflow="hidden"
              >
                <Box
                  position="absolute"
                  left={0} top={0} bottom={0}
                  w="3px"
                  bg="yellow.500"
                />
                <Box flex="1" pl={1}>
                  <Text fontSize="xs" color="gray.500" mb={0.5}>
                    {match.date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'short' })}
                    {match.tournament ? ` · ${match.tournament}` : ''}
                  </Text>
                  <Text fontSize="md" fontWeight="bold" color="white">
                    vs {match.opponent}
                  </Text>
                </Box>
                <Badge colorScheme="yellow" variant="subtle" fontSize="2xs" fontWeight="bold">
                  EM ANDAMENTO
                </Badge>
                <Link href="/game">
                  <Button size="xs" colorScheme="yellow" variant="outline" fontWeight="bold">
                    Iniciar Scout →
                  </Button>
                </Link>
              </Flex>
            ))}
          </Flex>
        </Box>
      )}

      {/* Filtros */}
      <Flex gap={3} mb={6} flexWrap="wrap" align="center">
        <Input
          placeholder="Buscar adversário..."
          value={searchTerm}
          onChange={(e) => setSearchTerm(e.target.value)}
          bg="gray.800"
          borderColor="gray.700"
          _hover={{ borderColor: 'gray.600' }}
          _focus={{ borderColor: 'blue.500', bg: 'gray.800' }}
          maxW="240px"
          size="sm"
          borderRadius="lg"
          color="white"
          _placeholder={{ color: 'gray.500' }}
        />
        <Flex gap={2}>
          {(['todos', 'vitoria', 'derrota'] as const).map((r) => {
            const isActive = resultFilter === r
            const activeColor = r === 'vitoria' ? 'green' : r === 'derrota' ? 'red' : 'blue'
            return (
              <Box
                key={r}
                as="button"
                px={3}
                py={1}
                borderRadius="full"
                fontSize="xs"
                fontWeight="semibold"
                transition="all 0.15s"
                bg={isActive
                  ? r === 'vitoria' ? 'green.500' : r === 'derrota' ? 'red.500' : 'blue.500'
                  : 'gray.800'
                }
                color={isActive ? 'white' : 'gray.400'}
                borderWidth="1px"
                borderColor={isActive ? 'transparent' : 'gray.700'}
                onClick={() => setResultFilter(r)}
                _hover={{ color: 'white', borderColor: `${activeColor}.500` }}
              >
                {r === 'todos' ? 'Todos' : r === 'vitoria' ? 'Vitórias' : 'Derrotas'}
              </Box>
            )
          })}
        </Flex>
        <Text ml="auto" fontSize="xs" color="gray.500">
          {filteredGames.length} {filteredGames.length === 1 ? 'jogo' : 'jogos'}
        </Text>
      </Flex>

      {/* Lista de jogos */}
      {filteredGames.length === 0 ? (
        <Box
          textAlign="center"
          py={16}
          bg="gray.800"
          borderRadius="xl"
          borderWidth="1px"
          borderColor="gray.700"
        >
          <Text color="gray.400" fontSize="md">
            {games.length === 0 ? 'Nenhum jogo registrado ainda.' : 'Nenhum jogo encontrado com os filtros.'}
          </Text>
        </Box>
      ) : (
        <Flex direction="column" gap={6}>
          {groupedByMonth.map(({ label, games: monthGames }) => (
            <Box key={label}>
              <Flex align="center" gap={3} mb={2}>
                <Text
                  fontSize="xs"
                  fontWeight="bold"
                  color="gray.500"
                  textTransform="uppercase"
                  letterSpacing="widest"
                >
                  {label}
                </Text>
                <Box flex="1" h="1px" bg="gray.700/50" />
                <Text fontSize="xs" color="gray.600">
                  {monthGames.filter(g => g.result === 'vitoria').length}V{' '}
                  {monthGames.filter(g => g.result === 'derrota').length}D
                </Text>
              </Flex>

              <Flex direction="column" gap={2}>
                {monthGames.map((game) => {
                  const isWin = game.result === 'vitoria'
                  return (
                    <Box
                      key={game.id}
                      position="relative"
                      bg="gray.800"
                      borderRadius="xl"
                      borderWidth="1px"
                      borderColor="gray.700"
                      overflow="hidden"
                      cursor="pointer"
                      transition="all 0.18s"
                      _hover={{
                        borderColor: isWin ? 'green.600' : 'red.700',
                        transform: 'translateX(2px)',
                        bg: 'gray.750',
                      }}
                      onClick={() => router.push(`/history/${game.id}`)}
                      role="group"
                    >
                      <Box
                        position="absolute"
                        left={0} top={0} bottom={0}
                        w="3px"
                        bg={isWin ? 'green.400' : 'red.400'}
                      />

                      <Flex align="center" px={5} py={3.5} gap={4}>
                        <Box flex="1" pl={1}>
                          <Text fontSize="xs" color="gray.500" mb={0.5}>
                            {game.date.toLocaleDateString('pt-BR', {
                              day: '2-digit',
                              month: 'short',
                              weekday: 'short',
                            })}
                            {game.location ? ` · ${game.location}` : ''}
                          </Text>
                          <Text fontSize="md" fontWeight="bold" color="white">
                            vs {game.opponent}
                          </Text>
                          {game.tournament && (
                            <Badge
                              colorScheme="blue"
                              variant="subtle"
                              fontSize="2xs"
                              px={1.5}
                              py={0.5}
                              borderRadius="sm"
                              mt={1}
                            >
                              {game.tournament}
                            </Badge>
                          )}
                        </Box>

                        <Box textAlign="center" minW="50px">
                          <Text
                            fontSize="lg"
                            fontWeight="black"
                            color="white"
                            letterSpacing="tight"
                            lineHeight="1"
                          >
                            {game.score}
                          </Text>
                          <Text fontSize="2xs" color="gray.500" mt={0.5}>sets</Text>
                        </Box>

                        <Badge
                          px={2.5}
                          py={1}
                          borderRadius="md"
                          colorScheme={isWin ? 'green' : 'red'}
                          fontSize="2xs"
                          fontWeight="bold"
                          minW="64px"
                          textAlign="center"
                        >
                          {isWin ? 'VITÓRIA' : 'DERROTA'}
                        </Badge>

                        <Box
                          as="button"
                          w="24px"
                          h="24px"
                          display="flex"
                          alignItems="center"
                          justifyContent="center"
                          borderRadius="md"
                          opacity={0}
                          _groupHover={{ opacity: 1 }}
                          color="gray.600"
                          transition="all 0.15s"
                          _hover={{ color: 'red.400', bg: 'red.900/40' }}
                          onClick={(e: React.MouseEvent) => handleDeleteGame(game.id, game.opponent, e)}
                          flexShrink={0}
                        >
                          <Text fontSize="sm">✕</Text>
                        </Box>
                      </Flex>
                    </Box>
                  )
                })}
              </Flex>
            </Box>
          ))}
        </Flex>
      )}

      {/* Modal Nova Partida */}
      <NewMatchModal
        isOpen={isNewMatchOpen}
        onClose={closeNewMatch}
        teamId={selectedTeamId || ''}
        teamName={selectedTeam?.name || 'Meu Time'}
        onCreated={handleMatchCreated}
      />
    </>
  )
}
