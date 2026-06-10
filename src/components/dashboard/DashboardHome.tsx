'use client'

import { useState, useEffect } from 'react'
import { Box, Flex, Heading, Text, Button, Spinner, Badge, Image, Skeleton } from '@chakra-ui/react'
import { useTeamContext } from '@/contexts/TeamContext'
import { usePlayersAPI } from '@/hooks/usePlayersAPI'
import { useTeams } from '@/hooks/useTeams'
import { CreateTeamModal } from '@/components/squad/CreateTeamModal'
import QuickActions from './QuickActions'
import TopPlayers from './TopPlayers'
import RecentGames from './RecentGames'

interface DashboardData {
  kpis: {
    matchesPlayed: number
    wins: number
    losses: number
    totalActions: number
    attackEfficiency: number
    killPercentage: number
    acePercentage: number
    receptionEfficiency: number
    blockKillsPerMatch: number
    totalPoints: number
  }
  playerStats: {
    playerId: string
    playerName: string
    jerseyNumber: number
    position: string
    totalActions: number
    attacks: { total: number; kills: number; errors: number; blocked: number; efficiency: number }
    serves: { total: number; aces: number; errors: number; efficiency: number }
    blocks: { total: number; kills: number; touches: number; efficiency: number }
    receptions: { total: number; perfect: number; good: number; poor: number; errors: number; efficiency: number }
    digs: { total: number; successful: number; errors: number; efficiency: number }
  }[]
  matches: {
    id: string
    opponent: string
    date: string
    result: string
    finalScore: string
    actionsCount: number
  }[]
}

/** Paleta de avatares para equipes sem logo — determinística pelo nome */
const AVATAR_PALETTE = [
  { bg: 'blue.900',   color: 'blue.300'   },
  { bg: 'purple.900', color: 'purple.300' },
  { bg: 'teal.900',   color: 'teal.300'   },
  { bg: 'orange.900', color: 'orange.300' },
  { bg: 'red.900',    color: 'red.300'    },
  { bg: 'green.900',  color: 'green.300'  },
]

function teamAvatarColor(name: string) {
  const idx = name.split('').reduce((acc, c) => acc + c.charCodeAt(0), 0) % AVATAR_PALETTE.length
  return AVATAR_PALETTE[idx]
}

function teamInitials(name: string) {
  return name.split(' ').map(w => w[0]).join('').slice(0, 2).toUpperCase()
}

export default function DashboardHome() {
  const { selectedTeam, selectedTeamId, setSelectedTeam } = useTeamContext()
  const { players } = usePlayersAPI(selectedTeamId)
  const { teams, loading: loadingTeams, refetch: refetchTeams } = useTeams()
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  const [pendingSelectId, setPendingSelectId] = useState<string | null>(null)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

  // Seleciona automaticamente a equipe recém-criada após refetch
  useEffect(() => {
    if (!pendingSelectId || teams.length === 0) return
    const team = teams.find(t => t.id === pendingSelectId)
    if (team) {
      setSelectedTeam(team)
      setPendingSelectId(null)
    }
  }, [teams, pendingSelectId, setSelectedTeam])

  useEffect(() => {
    if (!selectedTeamId) return

    setLoading(true)
    setError(null)

    fetch(`/api/statistics?teamId=${selectedTeamId}`)
      .then((r) => {
        if (!r.ok) throw new Error('Erro ao carregar dados')
        return r.json()
      })
      .then((res: DashboardData) => {
        setData(res)
        setLoading(false)
      })
      .catch((err) => {
        setError(err.message)
        setLoading(false)
      })
  }, [selectedTeamId])

  // Sem equipe selecionada — seletor estilo streaming
  if (!selectedTeam) {
    return (
      <>
        <CreateTeamModal
          isOpen={isTeamModalOpen}
          onClose={() => setIsTeamModalOpen(false)}
          onTeamCreated={(teamId) => {
            setPendingSelectId(teamId)
            refetchTeams()
          }}
        />

        <Flex direction="column" align="center" justify="center" minH="70vh" px={4}>
          {/* Cabeçalho */}
          <Box textAlign="center" mb={10}>
            <Heading
              size="lg"
              color="white"
              letterSpacing="-0.03em"
              mb={2}
            >
              Bem-vindo ao Scout Team
            </Heading>
            <Text color="gray.500" fontSize="md">
              Selecione uma equipe para continuar
            </Text>
          </Box>

          {/* Grid de cards */}
          {loadingTeams ? (
            <Flex gap={5} flexWrap="wrap" justify="center">
              {[0, 1, 2].map((i) => (
                <Skeleton key={i} w="140px" h="186px" borderRadius="xl" startColor="gray.800" endColor="gray.700" />
              ))}
            </Flex>
          ) : (
            <Flex gap={5} flexWrap="wrap" justify="center" maxW="860px">

              {/* Cards das equipes existentes */}
              {teams.map((team) => {
                const palette = teamAvatarColor(team.name)
                const initials = teamInitials(team.name)
                return (
                  <Box
                    key={team.id}
                    as="button"
                    onClick={() => setSelectedTeam(team)}
                    w="140px"
                    display="flex"
                    flexDirection="column"
                    alignItems="center"
                    pt={6}
                    pb={5}
                    px={3}
                    borderRadius="xl"
                    bg="gray.800"
                    border="2px solid transparent"
                    cursor="pointer"
                    transition="all 0.18s ease"
                    _hover={{
                      borderColor: 'blue.400',
                      boxShadow: '0 0 0 1px rgba(99,179,237,0.3), 0 8px 24px rgba(99,179,237,0.15)',
                      transform: 'translateY(-3px)',
                      bg: 'gray.750',
                    }}
                  >
                    {/* Avatar */}
                    <Box w="80px" h="80px" borderRadius="xl" overflow="hidden" mb={4} flexShrink={0}>
                      {team.logo ? (
                        <Image src={team.logo} alt={team.name} w="full" h="full" objectFit="cover" />
                      ) : (
                        <Flex w="full" h="full" bg={palette.bg} align="center" justify="center">
                          <Text fontSize="2xl" fontWeight="bold" color={palette.color} letterSpacing="-0.02em">
                            {initials}
                          </Text>
                        </Flex>
                      )}
                    </Box>

                    {/* Nome */}
                    <Text
                      color="gray.200"
                      fontSize="sm"
                      fontWeight="medium"
                      textAlign="center"
                      lineHeight="short"
                      noOfLines={2}
                      mb={1}
                    >
                      {team.name}
                    </Text>

                    {/* Contagem de atletas */}
                    {team._count && (
                      <Text color="gray.600" fontSize="xs">
                        {team._count.players} atleta{team._count.players !== 1 ? 's' : ''}
                      </Text>
                    )}
                  </Box>
                )
              })}

              {/* Card — Nova Equipe */}
              <Box
                as="button"
                onClick={() => setIsTeamModalOpen(true)}
                w="140px"
                display="flex"
                flexDirection="column"
                alignItems="center"
                pt={6}
                pb={5}
                px={3}
                borderRadius="xl"
                bg="transparent"
                border="2px dashed"
                borderColor="gray.600"
                cursor="pointer"
                transition="all 0.18s ease"
                _hover={{
                  borderColor: 'gray.400',
                  bg: 'whiteAlpha.50',
                  transform: 'translateY(-3px)',
                }}
              >
                {/* Ícone + */}
                <Flex
                  w="80px"
                  h="80px"
                  borderRadius="xl"
                  bg="gray.800"
                  align="center"
                  justify="center"
                  mb={4}
                  flexShrink={0}
                >
                  <Text fontSize="4xl" color="gray.500" lineHeight="1" userSelect="none">
                    +
                  </Text>
                </Flex>

                <Text color="gray.500" fontSize="sm" fontWeight="medium" textAlign="center">
                  Nova Equipe
                </Text>
              </Box>

            </Flex>
          )}
        </Flex>
      </>
    )
  }

  // Loading
  if (loading) {
    return (
      <>
        <QuickActions />
        <Flex minH="40vh" align="center" justify="center" direction="column" gap={3}>
          <Spinner size="xl" color="blue.500" thickness="3px" />
          <Text color="gray.500" fontSize="sm">Carregando dashboard...</Text>
        </Flex>
      </>
    )
  }

  // Erro
  if (error) {
    return (
      <>
        <QuickActions />
        <Flex minH="40vh" align="center" justify="center" direction="column" gap={4}>
          <Text color="red.400" fontSize="sm">{error}</Text>
          <Button
            size="sm"
            colorScheme="blue"
            variant="outline"
            onClick={() => {
              setLoading(true)
              setError(null)
              fetch(`/api/statistics?teamId=${selectedTeamId}`)
                .then((r) => r.json())
                .then((res) => { setData(res); setLoading(false) })
                .catch((e) => { setError(e.message); setLoading(false) })
            }}
          >
            Tentar novamente
          </Button>
        </Flex>
      </>
    )
  }

  // Sem partidas registradas
  if (!data || !data.kpis || data.kpis.matchesPlayed === 0) {
    return (
      <>
        <QuickActions />
        <Flex minH="40vh" align="center" justify="center" direction="column" gap={5}>
          <Box textAlign="center" maxW="440px">
            <Heading color="white" size="lg" mb={3}>
              Nenhuma partida registrada
            </Heading>
            <Text color="gray.400" fontSize="md" lineHeight="tall">
              As estatísticas serão geradas automaticamente a partir das partidas registradas pelo scout.
            </Text>
          </Box>
        </Flex>
      </>
    )
  }

  const { kpis } = data
  const winRate = Math.round((kpis.wins / kpis.matchesPlayed) * 100)

  return (
    <>
      {/* Team header — above everything */}
      <Box
        bgGradient="linear(to-r, gray.800, gray.800)"
        borderRadius="xl"
        px={5}
        py={4}
        mb={5}
        borderWidth="1px"
        borderColor="blue.500/20"
        position="relative"
        overflow="hidden"
        _before={{
          content: '""',
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '3px',
          bgGradient: 'linear(to-r, blue.400, blue.600)',
        }}
      >
        <Flex align="center" justify="space-between" flexWrap="wrap" gap={3}>
          <Flex align="center" gap={3}>
            {selectedTeam?.logo ? (
              <Image
                src={selectedTeam.logo}
                alt={selectedTeam.name}
                w="40px"
                h="40px"
                borderRadius="lg"
                objectFit="cover"
                flexShrink={0}
              />
            ) : (
              <Flex
                w="40px"
                h="40px"
                borderRadius="lg"
                bg="blue.500/15"
                align="center"
                justify="center"
                flexShrink={0}
              >
                <Text fontSize="lg">🏐</Text>
              </Flex>
            )}
            <Box>
              <Heading size="md" color="white" letterSpacing="-0.02em">
                {selectedTeam?.name}
              </Heading>
              <Badge
                bg={kpis.wins >= kpis.losses ? 'green.500/15' : 'red.500/15'}
                color={kpis.wins >= kpis.losses ? 'green.300' : 'red.300'}
                px={2}
                py={0}
                borderRadius="full"
                fontSize="2xs"
                fontWeight="bold"
                mt={0.5}
              >
                {kpis.wins}V — {kpis.losses}D
              </Badge>
            </Box>
          </Flex>
          <Flex gap={4}>
            <Box textAlign="center">
              <Text fontSize="lg" fontWeight="black" color="white">{kpis.matchesPlayed}</Text>
              <Text fontSize="2xs" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">partidas</Text>
            </Box>
            <Box w="1px" bg="gray.700" />
            <Box textAlign="center">
              <Text fontSize="lg" fontWeight="black" color="green.300">{winRate}%</Text>
              <Text fontSize="2xs" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">aproveit.</Text>
            </Box>
            <Box w="1px" bg="gray.700" />
            <Box textAlign="center">
              <Text fontSize="lg" fontWeight="black" color="blue.300">{kpis.totalPoints}</Text>
              <Text fontSize="2xs" color="gray.500" textTransform="uppercase" letterSpacing="0.05em">pontos</Text>
            </Box>
          </Flex>
        </Flex>
      </Box>

      <QuickActions />

      <Box h="1px" bg="gray.700/40" mx={2} my={2} />

      <TopPlayers
        playerStats={data.playerStats}
        playerPhotos={Object.fromEntries(players.map(p => [p.id, p.photo]))}
      />

      <Box h="1px" bg="gray.700/40" mx={2} my={2} />

      <RecentGames matches={data.matches} />
    </>
  )
}
