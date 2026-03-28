'use client'

import { useState, useEffect } from 'react'
import { Box, Flex, Heading, Text, Button, Spinner, Badge, Image } from '@chakra-ui/react'
import { useTeamContext } from '@/contexts/TeamContext'
import { usePlayersAPI } from '@/hooks/usePlayersAPI'
import { CreateTeamModal } from '@/components/squad/CreateTeamModal'
import QuickActions from './QuickActions'
import TopPlayers from './TopPlayers'
import RecentGames from './RecentGames'
import Link from 'next/link'

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

export default function DashboardHome() {
  const { selectedTeam, selectedTeamId } = useTeamContext()
  const { players } = usePlayersAPI(selectedTeamId)
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)
  const [data, setData] = useState<DashboardData | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)

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

  // Sem equipe selecionada
  if (!selectedTeam) {
    return (
      <>
        <CreateTeamModal
          isOpen={isTeamModalOpen}
          onClose={() => setIsTeamModalOpen(false)}
          onTeamCreated={() => {}}
        />

        <Flex
          direction="column"
          align="center"
          justify="center"
          minH="60vh"
          textAlign="center"
          px={4}
        >
          <Box fontSize="6xl" mb={4}>
            🏐
          </Box>
          <Heading size="xl" color="white" mb={4}>
            Bem-vindo ao Scout Team
          </Heading>
          <Text color="gray.400" fontSize="lg" mb={6} maxW="600px">
            Para começar a usar o sistema de scout, selecione uma equipe no menu superior ou crie uma nova equipe.
          </Text>
          <Button
            size="lg"
            colorScheme="blue"
            onClick={() => setIsTeamModalOpen(true)}
          >
            <Text mr={2}>➕</Text>
            Criar Nova Equipe
          </Button>
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
  if (!data || data.kpis.matchesPlayed === 0) {
    return (
      <>
        <QuickActions />
        <Flex minH="40vh" align="center" justify="center" direction="column" gap={5}>
          <Box textAlign="center" maxW="440px">
            <Text fontSize="5xl" mb={3}>📊</Text>
            <Heading color="white" size="lg" mb={3}>
              Nenhuma partida registrada
            </Heading>
            <Text color="gray.400" fontSize="md" lineHeight="tall" mb={5}>
              As estatísticas serão geradas automaticamente a partir das partidas registradas pelo scout.
            </Text>
            <Link href="/game/new">
              <Button colorScheme="blue" size="md">
                Iniciar Novo Scout
              </Button>
            </Link>
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
