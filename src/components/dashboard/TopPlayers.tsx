'use client'

import { useMemo } from 'react'
import { Box, Flex, Text, Grid, Image } from '@chakra-ui/react'

interface PlayerStat {
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
}

interface RankedPlayer {
  playerId: string
  playerName: string
  jerseyNumber: number
  value: string
  rawValue: number
}

interface Category {
  id: string
  label: string
  color: string
  getRanking: (players: PlayerStat[]) => RankedPlayer[]
}

const CATEGORIES: Category[] = [
  {
    id: 'scorers',
    label: 'Pontuadores',
    color: '#22C55E',
    getRanking: (players) =>
      players
        .map(p => ({
          playerId: p.playerId,
          playerName: p.playerName,
          jerseyNumber: p.jerseyNumber,
          rawValue: p.attacks.kills + p.serves.aces + p.blocks.kills,
          value: `${p.attacks.kills + p.serves.aces + p.blocks.kills} pts`,
        }))
        .filter(p => p.rawValue > 0)
        .sort((a, b) => b.rawValue - a.rawValue)
        .slice(0, 3),
  },
  {
    id: 'attackers',
    label: 'Ataque',
    color: '#EF4444',
    getRanking: (players) =>
      players
        .filter(p => p.attacks.total >= 5)
        .map(p => ({
          playerId: p.playerId,
          playerName: p.playerName,
          jerseyNumber: p.jerseyNumber,
          rawValue: p.attacks.efficiency,
          value: `${p.attacks.efficiency.toFixed(1)}%`,
        }))
        .sort((a, b) => b.rawValue - a.rawValue)
        .slice(0, 3),
  },
  {
    id: 'receivers',
    label: 'Recepção',
    color: '#3B82F6',
    getRanking: (players) =>
      players
        .filter(p => p.receptions.total >= 5)
        .map(p => ({
          playerId: p.playerId,
          playerName: p.playerName,
          jerseyNumber: p.jerseyNumber,
          rawValue: p.receptions.efficiency,
          value: `${p.receptions.efficiency.toFixed(1)}%`,
        }))
        .sort((a, b) => b.rawValue - a.rawValue)
        .slice(0, 3),
  },
  {
    id: 'servers',
    label: 'Aces',
    color: '#F59E0B',
    getRanking: (players) =>
      players
        .filter(p => p.serves.aces > 0)
        .map(p => ({
          playerId: p.playerId,
          playerName: p.playerName,
          jerseyNumber: p.jerseyNumber,
          rawValue: p.serves.aces,
          value: `${p.serves.aces}`,
        }))
        .sort((a, b) => b.rawValue - a.rawValue)
        .slice(0, 3),
  },
]

function PlayerAvatar({
  photo,
  jerseyNumber,
  size = 36,
}: {
  photo?: string
  jerseyNumber: number
  size?: number
}) {
  if (photo) {
    return (
      <Image
        src={photo}
        alt={`#${jerseyNumber}`}
        w={`${size}px`}
        h={`${size}px`}
        borderRadius="full"
        objectFit="cover"
        flexShrink={0}
      />
    )
  }
  return (
    <Flex
      w={`${size}px`}
      h={`${size}px`}
      borderRadius="full"
      align="center"
      justify="center"
      bg="gray.700"
      flexShrink={0}
    >
      <Text fontSize={size >= 40 ? 'sm' : 'xs'} fontWeight="black" color="gray.400">
        {jerseyNumber}
      </Text>
    </Flex>
  )
}

function RankingCard({
  category,
  ranking,
  playerPhotos,
}: {
  category: Category
  ranking: RankedPlayer[]
  playerPhotos: Record<string, string>
}) {
  const leader = ranking[0]
  const rest = ranking.slice(1)

  return (
    <Box
      bg="gray.800"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.700/60"
      borderTopWidth="3px"
      borderTopColor={category.color}
      overflow="hidden"
    >
      {/* Category header */}
      <Box px={4} pt={3} pb={2}>
        <Text
          fontSize="xs"
          fontWeight="bold"
          color="gray.400"
          textTransform="uppercase"
          letterSpacing="0.06em"
        >
          {category.label}
        </Text>
      </Box>

      {!leader ? (
        <Flex align="center" justify="center" py={6} px={4}>
          <Text color="gray.600" fontSize="xs">Sem dados</Text>
        </Flex>
      ) : (
        <>
          {/* Leader — prominent display */}
          <Box px={4} pb={3}>
            <Flex
              align="center"
              gap={3}
              bg="gray.900"
              borderRadius="lg"
              p={3}
              borderWidth="1px"
              borderColor={`${category.color}20`}
            >
              {/* Photo with rank overlay */}
              <Box position="relative" flexShrink={0}>
                <PlayerAvatar
                  photo={playerPhotos[leader.playerId]}
                  jerseyNumber={leader.jerseyNumber}
                  size={48}
                />
                <Flex
                  position="absolute"
                  bottom="-2px"
                  right="-2px"
                  w="18px"
                  h="18px"
                  borderRadius="full"
                  bg="gray.900"
                  align="center"
                  justify="center"
                  borderWidth="2px"
                  borderColor="gray.800"
                >
                  <Text fontSize="2xs" lineHeight="1">🥇</Text>
                </Flex>
              </Box>

              {/* Info */}
              <Box flex="1" minW={0}>
                <Text
                  fontSize="sm"
                  color="white"
                  fontWeight="bold"
                  noOfLines={1}
                  lineHeight="1.3"
                >
                  {leader.playerName}
                </Text>
                <Text fontSize="xs" color="gray.500">
                  #{leader.jerseyNumber}
                </Text>
              </Box>

              {/* Value */}
              <Text
                fontSize="xl"
                fontWeight="black"
                color={category.color}
                flexShrink={0}
                letterSpacing="-0.02em"
              >
                {leader.value}
              </Text>
            </Flex>
          </Box>

          {/* 2nd and 3rd — compact rows */}
          {rest.length > 0 && (
            <Box
              bg="gray.900/40"
              px={4}
              py={2}
              borderTopWidth="1px"
              borderColor="gray.700/40"
            >
              <Flex direction="column" gap={2}>
                {rest.map((player, i) => {
                  const rankIndex = i + 1
                  return (
                    <Flex key={player.playerId} align="center" gap={2.5}>
                      <Text fontSize="2xs" color="gray.600" w="16px" textAlign="center" fontWeight="bold">
                        {rankIndex + 1}º
                      </Text>

                      <PlayerAvatar
                        photo={playerPhotos[player.playerId]}
                        jerseyNumber={player.jerseyNumber}
                        size={28}
                      />

                      <Box flex="1" minW={0}>
                        <Text fontSize="xs" color="gray.300" noOfLines={1}>
                          {player.playerName}
                        </Text>
                      </Box>

                      <Text fontSize="xs" fontWeight="bold" color="gray.400" flexShrink={0}>
                        {player.value}
                      </Text>
                    </Flex>
                  )
                })}
              </Flex>
            </Box>
          )}
        </>
      )}
    </Box>
  )
}

interface TopPlayersProps {
  playerStats: PlayerStat[]
  playerPhotos: Record<string, string>
}

export default function TopPlayers({ playerStats, playerPhotos }: TopPlayersProps) {
  const rankings = useMemo(() => {
    const result: Record<string, RankedPlayer[]> = {}
    for (const cat of CATEGORIES) {
      result[cat.id] = cat.getRanking(playerStats)
    }
    return result
  }, [playerStats])

  const hasData = Object.values(rankings).some(r => r.length > 0)

  if (!hasData) {
    return (
      <Box mb={4}>
        <Box
          bg="gray.800"
          borderRadius="xl"
          p={4}
          borderWidth="1px"
          borderColor="gray.700/60"
        >
          <Text fontSize="sm" fontWeight="bold" color="white" mb={3}>
            Destaques
          </Text>
          <Flex align="center" justify="center" py={6}>
            <Text color="gray.600" fontSize="sm">Sem dados suficientes</Text>
          </Flex>
        </Box>
      </Box>
    )
  }

  return (
    <Box mb={4}>
      <Text fontSize="sm" fontWeight="bold" color="white" mb={3}>
        Destaques
      </Text>
      <Grid
        templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
        gap={3}
      >
        {CATEGORIES.map((cat) => (
          <RankingCard
            key={cat.id}
            category={cat}
            ranking={rankings[cat.id] || []}
            playerPhotos={playerPhotos}
          />
        ))}
      </Grid>
    </Box>
  )
}
