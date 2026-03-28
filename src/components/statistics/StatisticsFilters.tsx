// components/statistics/StatisticsFilters.tsx
'use client'

import { Box, Flex, Text, Button } from '@chakra-ui/react'
import { StatisticsFilters } from '@/types/statistics'

interface StatisticsFiltersProps {
  filters: StatisticsFilters
  onFilterChange: (filters: StatisticsFilters) => void
  availableMatches: { id: string; label: string }[]
  availablePlayers: { id: string; name: string; number: number }[]
  compact?: boolean
}

export default function StatsFilters({
  filters,
  onFilterChange,
  availableMatches,
  availablePlayers,
  compact,
}: StatisticsFiltersProps) {
  const handleChange = (key: keyof StatisticsFilters, value: any) => {
    onFilterChange({ ...filters, [key]: value === 'all' ? undefined : value })
  }

  const clearFilters = () => {
    onFilterChange({})
  }

  const activeFiltersCount = Object.values(filters).filter(
    (v) => v !== undefined
  ).length

  const selectStyles = {
    bg: 'gray.700',
    borderColor: 'gray.600',
    borderWidth: '1px',
    borderRadius: 'md',
    color: 'white',
    _hover: { borderColor: 'blue.500' },
    height: compact ? '36px' : '40px',
    px: 3,
    fontSize: 'sm',
  }

  return (
    <Flex
      bg="gray.800"
      borderRadius="lg"
      px={compact ? 3 : 5}
      py={compact ? 2.5 : 5}
      borderWidth="1px"
      borderColor="gray.700/60"
      mb={4}
      align="center"
      gap={3}
      flexWrap="wrap"
    >
      {!compact && (
        <Text fontSize="sm" fontWeight="bold" color="gray.300" mr={1} flexShrink={0}>
          Filtros
        </Text>
      )}

      {/* Jogador */}
      <Box flex={{ base: '1', md: 'none' }} minW="160px">
        <Box
          as="select"
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('playerId', e.target.value)}
          {...selectStyles}
          w="full"
          defaultValue={filters.playerId || 'all'}
        >
          <option value="all">Todos os jogadores</option>
          {availablePlayers.map((player) => (
            <option key={player.id} value={player.id}>
              #{player.number} {player.name}
            </option>
          ))}
        </Box>
      </Box>

      {/* Partida */}
      <Box flex={{ base: '1', md: 'none' }} minW="180px">
        <Box
          as="select"
          onChange={(e: React.ChangeEvent<HTMLSelectElement>) => handleChange('matchId', e.target.value)}
          {...selectStyles}
          w="full"
          defaultValue={filters.matchId || 'all'}
        >
          <option value="all">Todas as partidas</option>
          {availableMatches.map((match) => (
            <option key={match.id} value={match.id}>
              {match.label}
            </option>
          ))}
        </Box>
      </Box>

      {activeFiltersCount > 0 && (
        <Button
          size="sm"
          h={compact ? '36px' : '40px'}
          variant="ghost"
          color="gray.400"
          onClick={clearFilters}
          _hover={{ color: 'white', bg: 'gray.700' }}
          fontSize="xs"
          flexShrink={0}
        >
          Limpar ({activeFiltersCount})
        </Button>
      )}
    </Flex>
  )
}
