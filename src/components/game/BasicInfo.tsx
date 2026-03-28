// components/game/BasicInfo.tsx
'use client'

import { Box, Flex, Text, Input, Button } from '@chakra-ui/react'
import { MatchType } from '@/types/scout'

interface BasicInfoProps {
  tournament: string
  setTournament: (value: string) => void
  date: string
  setDate: (value: string) => void
  time: string
  setTime: (value: string) => void
  opponent: string
  setOpponent: (value: string) => void
  location: string
  setLocation: (value: string) => void
  matchType: MatchType
  setMatchType: (value: MatchType) => void
  onLoadPreviousConfig: () => void
}

export default function BasicInfo({
  tournament,
  setTournament,
  date,
  setDate,
  time,
  setTime,
  opponent,
  setOpponent,
  location,
  setLocation,
  matchType,
  setMatchType,
  onLoadPreviousConfig,
}: BasicInfoProps) {
  const matchTypes: { value: MatchType; label: string }[] = [
    { value: 'championship', label: 'Campeonato' },
    { value: 'friendly', label: 'Amistoso' },
    { value: 'training', label: 'Treino' },
  ]

  return (
    <Box
      bg="gray.800"
      borderRadius="lg"
      p={6}
      borderWidth="1px"
      borderColor="gray.700"
      mb={4}
    >
      <Flex alignItems="center" justifyContent="space-between" mb={4}>
        <Text fontSize="lg" fontWeight="bold" color="white">
          📋 Informações Básicas do Jogo
        </Text>
        <Button
          size="sm"
          bg="blue.600"
          color="white"
          _hover={{ bg: 'blue.700' }}
          onClick={onLoadPreviousConfig}
        >
          🔄 Carregar Configuração Anterior
        </Button>
      </Flex>

      <Box display="grid" gridTemplateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={4}>
        {/* Campeonato */}
        <Box>
          <Text fontSize="sm" color="gray.400" mb={1}>
            Campeonato *
          </Text>
          <select
            value={tournament}
            onChange={(e) => setTournament(e.target.value)}
            style={{
              width: '100%',
              padding: '10px',
              borderRadius: '6px',
              background: 'var(--chakra-colors-gray-900)',
              border: '1px solid var(--chakra-colors-gray-700)',
              color: 'white',
              fontSize: '14px',
            }}
          >
            <option value="">Selecione um campeonato</option>
            <option value="superliga">Superliga</option>
            <option value="estadual">Campeonato Estadual</option>
            <option value="copa">Copa Brasil</option>
            <option value="sulamericano">Sul-Americano</option>
            <option value="outro">Outro</option>
          </select>
        </Box>

        {/* Data */}
        <Box>
          <Text fontSize="sm" color="gray.400" mb={1}>
            Data *
          </Text>
          <Input
            type="date"
            value={date}
            onChange={(e) => setDate(e.target.value)}
            bg="gray.900"
            borderColor="gray.700"
            color="white"
            _hover={{ borderColor: 'gray.600' }}
            _focus={{ borderColor: 'blue.500' }}
          />
        </Box>

        {/* Hora */}
        <Box>
          <Text fontSize="sm" color="gray.400" mb={1}>
            Horário *
          </Text>
          <Input
            type="time"
            value={time}
            onChange={(e) => setTime(e.target.value)}
            bg="gray.900"
            borderColor="gray.700"
            color="white"
            _hover={{ borderColor: 'gray.600' }}
            _focus={{ borderColor: 'blue.500' }}
          />
        </Box>

        {/* Adversário */}
        <Box>
          <Text fontSize="sm" color="gray.400" mb={1}>
            Adversário *
          </Text>
          <Input
            type="text"
            value={opponent}
            onChange={(e) => setOpponent(e.target.value)}
            placeholder="Nome do time adversário"
            bg="gray.900"
            borderColor="gray.700"
            color="white"
            _hover={{ borderColor: 'gray.600' }}
            _focus={{ borderColor: 'blue.500' }}
          />
        </Box>

        {/* Local */}
        <Box>
          <Text fontSize="sm" color="gray.400" mb={1}>
            Local (opcional)
          </Text>
          <Input
            type="text"
            value={location}
            onChange={(e) => setLocation(e.target.value)}
            placeholder="Ginásio / Cidade"
            bg="gray.900"
            borderColor="gray.700"
            color="white"
            _hover={{ borderColor: 'gray.600' }}
            _focus={{ borderColor: 'blue.500' }}
          />
        </Box>

        {/* Tipo de Partida */}
        <Box>
          <Text fontSize="sm" color="gray.400" mb={1}>
            Tipo de Partida *
          </Text>
          <Flex gap={2}>
            {matchTypes.map((type) => (
              <Box
                key={type.value}
                as="button"
                flex="1"
                px={3}
                py={2}
                borderRadius="md"
                bg={matchType === type.value ? 'blue.600' : 'gray.900'}
                color="white"
                borderWidth="1px"
                borderColor={matchType === type.value ? 'blue.500' : 'gray.700'}
                cursor="pointer"
                transition="all 0.2s"
                _hover={{ borderColor: 'blue.500', bg: matchType === type.value ? 'blue.700' : 'gray.800' }}
                onClick={() => setMatchType(type.value)}
              >
                <Text fontSize="sm" fontWeight={matchType === type.value ? 'bold' : 'normal'}>
                  {type.label}
                </Text>
              </Box>
            ))}
          </Flex>
        </Box>
      </Box>
    </Box>
  )
}
