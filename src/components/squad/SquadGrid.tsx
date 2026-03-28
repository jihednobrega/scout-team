import { SimpleGrid, Box, Text, Flex } from '@chakra-ui/react'
import { Player } from '@/types/player'
import { PlayerCard } from './PlayerCard'
import { useMemo } from 'react'
import { PlayerStats } from '@/types/scout'
import { calculateRatingFromStats } from '@/utils/stats'

interface SquadGridProps {
  players: Player[]
  onPlayerClick?: (player: Player) => void
  playerStatsMap?: Record<string, PlayerStats>
}

export function SquadGrid({ players, onPlayerClick, playerStatsMap }: SquadGridProps) {
  // Pre-compute ratings for all players using unified 0-10 system
  const playerRatings = useMemo(() => {
    if (!playerStatsMap) return {}
    const result: Record<string, { stats: { atk: number; rec: number; blk: number; def: number; srv: number; lev: number }; overall: number }> = {}
    for (const [id, ps] of Object.entries(playerStatsMap)) {
      const rating = calculateRatingFromStats(ps)
      result[id] = {
        stats: {
          atk: rating.ratingByFundamental['attack']?.friendly ?? 0,
          rec: rating.ratingByFundamental['reception']?.friendly ?? 0,
          blk: rating.ratingByFundamental['block']?.friendly ?? 0,
          def: rating.ratingByFundamental['dig']?.friendly ?? 0,
          srv: rating.ratingByFundamental['serve']?.friendly ?? 0,
          lev: rating.ratingByFundamental['set']?.friendly ?? 0,
        },
        overall: rating.friendlyRating,
      }
    }
    return result
  }, [playerStatsMap])

  if (players.length === 0) {
    return (
      <Flex
        h="300px"
        align="center"
        justify="center"
        bg="gray.800"
        borderRadius="xl"
        border="1px dashed"
        borderColor="gray.700"
      >
        <Text color="gray.500">Nenhum jogador encontrado.</Text>
      </Flex>
    )
  }

  return (
    <SimpleGrid
      columns={{ base: 1, sm: 2, md: 3, lg: 4, xl: 5 }}
      spacing={8}
      justifyItems="center"
    >
      {players.map((player) => {
        const pr = playerRatings[player.id]
        return (
          <Box
            key={player.id}
            onClick={() => onPlayerClick?.(player)}
            transition="transform 0.2s"
            _hover={{ zIndex: 10 }}
          >
            <PlayerCard
              player={player}
              stats={pr?.stats ?? null}
              rating={pr?.overall ?? null}
            />
          </Box>
        )
      })}
    </SimpleGrid>
  )
}
