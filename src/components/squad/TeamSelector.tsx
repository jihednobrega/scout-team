'use client'

import { Box, Button, Flex, Text } from '@chakra-ui/react'
import { useTeams } from '@/hooks/useTeams'

interface TeamSelectorProps {
  selectedTeamId: string | null
  onTeamChange: (teamId: string | null) => void
  onCreateTeam: () => void
}

export function TeamSelector({ selectedTeamId, onTeamChange, onCreateTeam }: TeamSelectorProps) {
  const { teams, loading } = useTeams()

  if (loading) {
    return (
      <Box p={4} bg="gray.800" borderRadius="md">
        <Text color="gray.400">Carregando equipes...</Text>
      </Box>
    )
  }

  const selectedTeam = teams.find(t => t.id === selectedTeamId)

  return (
    <Box p={4} bg="gray.800" borderRadius="md" mb={6}>
      <Flex gap={4} alignItems="center" flexWrap="wrap">
        <Box flex="1" minW="200px">
          <Text fontSize="sm" color="gray.400" mb={2}>
            Equipe Ativa
          </Text>
          <select
            value={selectedTeamId || ''}
            onChange={(e) => onTeamChange(e.target.value || null)}
            style={{
              padding: '10px',
              borderRadius: '6px',
              background: 'var(--chakra-colors-gray-700)',
              border: '1px solid var(--chakra-colors-gray-600)',
              color: 'white',
              width: '100%',
              fontSize: '14px'
            }}
          >
            <option value="">Selecione uma equipe</option>
            {teams.map(team => (
              <option key={team.id} value={team.id}>
                {team.name}
              </option>
            ))}
          </select>
        </Box>

        <Box>
          <Text fontSize="sm" color="transparent" mb={2}>
            .
          </Text>
          <Button
            onClick={onCreateTeam}
            colorScheme="blue"
            size="md"
          >
            <Text mr={2}>➕</Text>
            Nova Equipe
          </Button>
        </Box>
      </Flex>

      {selectedTeam && (
        <Flex mt={4} gap={4} alignItems="center">
          {selectedTeam.logo && (
            <Box
              w="50px"
              h="50px"
              borderRadius="md"
              overflow="hidden"
              bg="gray.700"
            >
              <img
                src={selectedTeam.logo}
                alt={selectedTeam.name}
                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
              />
            </Box>
          )}
          <Box>
            <Text fontWeight="bold" fontSize="lg">
              {selectedTeam.name}
            </Text>
            <Text fontSize="sm" color="gray.400">
              {selectedTeam._count?.players || 0} jogadores cadastrados
            </Text>
          </Box>
        </Flex>
      )}
    </Box>
  )
}
