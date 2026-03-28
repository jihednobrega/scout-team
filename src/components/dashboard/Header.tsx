// app/components/dashboard/Header.tsx
'use client'

import { Box, Flex, IconButton, Text } from '@chakra-ui/react'
import { useTeamContext } from '@/contexts/TeamContext'
import { useTeams } from '@/hooks/useTeams'
import { CreateTeamModal } from '@/components/squad/CreateTeamModal'
import { TeamSelect } from './TeamSelect'
import { useState } from 'react'

interface HeaderProps {
  onMenuClick: () => void
}

export default function Header({ onMenuClick }: HeaderProps) {
  const { selectedTeam, setSelectedTeam } = useTeamContext()
  const { teams, loading } = useTeams()
  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false)

  return (
    <>
      <CreateTeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onTeamCreated={(teamId) => {
          const team = teams.find(t => t.id === teamId)
          if (team) setSelectedTeam(team)
        }}
      />

    <Box
      as="header"
      position="sticky"
      top="0"
      zIndex={100}
      bg="gray.900"
      borderBottom="1px"
      borderColor="gray.800"
      shadow="lg"
      h="90px"
      >
      <Flex
        align="center"
        justify="space-between"
        px={{ base: 4, md: 6 }}
        py={4}
        maxW="1400px"
        h="full"
        mx="auto"
      >
        {/* Botão Menu (apenas mobile/tablet) */}
        <IconButton
          aria-label="Abrir menu"
          onClick={onMenuClick}
          variant="ghost"
          colorScheme="gray"
          _hover={{ bg: 'gray.800' }}
          size="lg"
          display={{ base: 'flex', lg: 'none' }}
        >
          <Text fontSize="2xl">☰</Text>
        </IconButton>

        {/* Logo/Título (apenas mobile/tablet) */}
        <Flex align="center" gap={2} display={{ base: 'flex', lg: 'none' }}>
          <Text fontSize="xl" fontWeight="bold" color="white">
            🏐 Scout Team
          </Text>
        </Flex>

        {/* Espaçador para desktop */}
        <Box flex="1" display={{ base: 'none', lg: 'block' }} />

        {/* Ações à direita */}
        <Flex align="center" gap={3}>
          {/* Seletor de Equipe */}
          <Box display={{ base: 'none', md: 'block' }}>
            <TeamSelect
              teams={teams}
              selectedTeam={selectedTeam}
              onSelectTeam={setSelectedTeam}
              onCreateNew={() => setIsTeamModalOpen(true)}
              loading={loading}
            />
          </Box>
        </Flex>
      </Flex>
    </Box>
    </>
  )
}
