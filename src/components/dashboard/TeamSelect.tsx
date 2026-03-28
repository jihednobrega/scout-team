'use client'

import { Box, Flex, Text, Button } from '@chakra-ui/react'
import { useState, useRef, useEffect } from 'react'
import { Team } from '@/hooks/useTeams'

interface TeamSelectProps {
  teams: Team[]
  selectedTeam: Team | null
  onSelectTeam: (team: Team | null) => void
  onCreateNew: () => void
  loading?: boolean
}

export function TeamSelect({
  teams,
  selectedTeam,
  onSelectTeam,
  onCreateNew,
  loading,
}: TeamSelectProps) {
  const [isOpen, setIsOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement>(null)

  // Fechar dropdown ao clicar fora
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        containerRef.current &&
        !containerRef.current.contains(event.target as Node)
      ) {
        setIsOpen(false)
      }
    }

    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside)
    }

    return () => {
      document.removeEventListener('mousedown', handleClickOutside)
    }
  }, [isOpen])

  if (loading) {
    return (
      <Box
        bg="gray.800"
        borderRadius="md"
        p={2}
        borderWidth="1px"
        borderColor="gray.700"
        w="200px"
      >
        <Text fontSize="sm" color="gray.400">
          Carregando...
        </Text>
      </Box>
    )
  }

  return (
    <Box position="relative" ref={containerRef} w="200px">
      <Flex
        align="center"
        gap={2}
        bg="gray.800"
        borderRadius="md"
        p={2}
        borderWidth="1px"
        borderColor={isOpen ? 'blue.500' : 'gray.700'}
        transition="all 0.2s"
        _hover={{ borderColor: 'gray.600' }}
      >
        {/* Select Button */}
        <Flex
          align="center"
          gap={2}
          flex="1"
          px={2}
          py={1}
          cursor="pointer"
          onClick={() => setIsOpen(!isOpen)}
          transition="all 0.2s"
          _hover={{ opacity: 0.8 }}
        >
          {selectedTeam ? (
            <Flex align="center" gap={2} flex="1">
              {selectedTeam.logo && (
                <Box
                  w="24px"
                  h="24px"
                  borderRadius="sm"
                  overflow="hidden"
                  bg="gray.700"
                  flexShrink={0}
                >
                  <img
                    src={selectedTeam.logo}
                    alt={selectedTeam.name}
                    style={{
                      width: '100%',
                      height: '100%',
                      objectFit: 'cover',
                    }}
                  />
                </Box>
              )}
              <Text
                fontSize="sm"
                color="white"
                fontWeight="medium"
                css={{
                  overflow: 'hidden',
                  textOverflow: 'ellipsis',
                  whiteSpace: 'nowrap',
                }}
              >
                {selectedTeam.name}
              </Text>
            </Flex>
          ) : (
            <Text fontSize="sm" color="gray.400">
              Selecione uma equipe
            </Text>
          )}
          <Text fontSize="xs" color="gray.500" ml="auto">
            {isOpen ? '▲' : '▼'}
          </Text>
        </Flex>
      </Flex>

      {/* Dropdown */}
      {isOpen && (
        <Box
          position="absolute"
          top="calc(100% + 4px)"
          left="0"
          right="0"
          bg="gray.800"
          borderRadius="md"
          borderWidth="1px"
          borderColor="gray.700"
          shadow="2xl"
          zIndex={1000}
          maxH="300px"
          overflowY="auto"
          css={{
            '&::-webkit-scrollbar': {
              width: '8px',
            },
            '&::-webkit-scrollbar-track': {
              background: 'var(--chakra-colors-gray-900)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb': {
              background: 'var(--chakra-colors-gray-600)',
              borderRadius: '4px',
            },
            '&::-webkit-scrollbar-thumb:hover': {
              background: 'var(--chakra-colors-gray-500)',
            },
          }}
        >
          <Box py={2}>
            {teams.length === 0 ? (
              <Box p={4} textAlign="center">
                <Text fontSize="sm" color="gray.400" mb={3}>
                  Nenhuma equipe cadastrada
                </Text>
              </Box>
            ) : (
              <>
                {teams.map((team) => (
                  <Flex
                    key={team.id}
                    align="center"
                    gap={2}
                    px={3}
                    py={2}
                    cursor="pointer"
                    transition="all 0.2s"
                    bg={
                      selectedTeam?.id === team.id ? 'blue.600' : 'transparent'
                    }
                    _hover={{
                      bg:
                        selectedTeam?.id === team.id ? 'blue.600' : 'gray.700',
                    }}
                    onClick={() => {
                      onSelectTeam(team)
                      setIsOpen(false)
                    }}
                  >
                    {team.logo && (
                      <Box
                        w="32px"
                        h="32px"
                        borderRadius="md"
                        overflow="hidden"
                        bg="gray.700"
                        flexShrink={0}
                      >
                        <img
                          src={team.logo}
                          alt={team.name}
                          style={{
                            width: '100%',
                            height: '100%',
                            objectFit: 'cover',
                          }}
                        />
                      </Box>
                    )}
                    <Box flex="1">
                      <Text
                        fontSize="sm"
                        color="white"
                        fontWeight={
                          selectedTeam?.id === team.id ? 'bold' : 'medium'
                        }
                      >
                        {team.name}
                      </Text>
                      {team._count && (
                        <Text fontSize="xs" color="gray.400">
                          {team._count.players} jogadores •{' '}
                          {team._count.matches} jogos
                        </Text>
                      )}
                    </Box>
                    {selectedTeam?.id === team.id && (
                      <Text color="blue.300" fontSize="lg">
                        ✓
                      </Text>
                    )}
                  </Flex>
                ))}

                {/* Separador */}
                <Box h="1px" bg="gray.700" my={1} />
              </>
            )}

            {/* Botão Nova Equipe */}
            <Flex
              align="center"
              gap={2}
              px={3}
              py={2}
              cursor="pointer"
              transition="all 0.2s"
              _hover={{ bg: 'gray.700' }}
              // bg="blue.600"
              onClick={() => {
                onCreateNew()
                setIsOpen(false)
              }}
            >
              <Flex
                align="center"
                justify="center"
                w="32px"
                h="32px"
                borderRadius="md"
                bg="blue.500"
                flexShrink={0}
              >
                <Text fontSize="xl">➕</Text>
              </Flex>
              <Text fontSize="sm" color="white" fontWeight="bold">
                {teams.length === 0 ? 'Criar primeira equipe' : 'Nova equipe'}
              </Text>
            </Flex>
          </Box>
        </Box>
      )}
    </Box>
  )
}
