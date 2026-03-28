// app/history/page.tsx
'use client'

import { useState, useMemo } from 'react'
import { useRouter } from 'next/navigation'
import {
  Box,
  Flex,
  Heading,
  Text,
  Input,
  Badge,
  Spinner,
} from '@chakra-ui/react'
import { useTeamContext } from '@/contexts/TeamContext'
import { useMatchesList } from '@/hooks/useMatchesAPI'

export default function HistoryPage() {
  const router = useRouter()
  const { selectedTeamId } = useTeamContext()
  const { matches: games, loading, deleteMatch: deleteMatchAPI } = useMatchesList(selectedTeamId)
  const [searchTerm, setSearchTerm] = useState('')
  const [resultFilter, setResultFilter] = useState('todos')

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

    // Sequência atual (games vem ordenado do mais recente)
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
    }
  }

  if (loading) {
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

        {/* KPI inline */}
        {stats.total > 0 && (
          <Flex gap={5} align="center" flexWrap="wrap">
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
      </Flex>

      {/* Barra de aproveitamento */}
      {stats.total > 0 && (
        <Box mb={6}>
          <Box h="4px" bg="red.900/60" borderRadius="full" overflow="hidden">
            <Box
              h="full"
              w={`${stats.winRate}%`}
              bg="green.500"
              borderRadius="full"
            />
          </Box>
        </Box>
      )}

      {/* Filtros compactos */}
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
          <Text fontSize="4xl" mb={3}>🏐</Text>
          <Text color="gray.400" fontSize="md">
            {games.length === 0 ? 'Nenhum jogo registrado ainda.' : 'Nenhum jogo encontrado com os filtros.'}
          </Text>
        </Box>
      ) : (
        <Flex direction="column" gap={6}>
          {groupedByMonth.map(({ label, games: monthGames }) => (
            <Box key={label}>
              {/* Label do mês */}
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

              {/* Cards do mês */}
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
                      {/* Barra lateral colorida */}
                      <Box
                        position="absolute"
                        left={0}
                        top={0}
                        bottom={0}
                        w="3px"
                        bg={isWin ? 'green.400' : 'red.400'}
                      />

                      <Flex align="center" px={5} py={3.5} gap={4}>
                        {/* Info principal */}
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

                        {/* Placar */}
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

                        {/* Badge resultado */}
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

                        {/* Botão deletar — aparece no hover */}
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
    </>
  )
}
