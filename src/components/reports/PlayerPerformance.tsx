'use client'

import { Box, Flex, Grid, Text, Badge } from '@chakra-ui/react'
import Link from 'next/link'

export default function PlayerPerformance() {
  const players = [
    { id: 1, name: 'João Silva', number: 10, efficiency: 82, trend: 'up', fundaments: { saque: 85, recepcao: 78, ataque: 88, bloqueio: 75, defesa: 80, levantamento: 0 } },
    { id: 2, name: 'Pedro Costa', number: 7, efficiency: 76, trend: 'stable', fundaments: { saque: 73, recepcao: 82, ataque: 75, bloqueio: 70, defesa: 78, levantamento: 0 } },
    { id: 3, name: 'Lucas Alves', number: 15, efficiency: 71, trend: 'down', fundaments: { saque: 72, recepcao: 68, ataque: 74, bloqueio: 72, defesa: 70, levantamento: 0 } },
  ]

  return (
    <Box mb={6}>
      <Text fontSize="xl" fontWeight="bold" color="white" mb={4}>
        👤 Desempenho Individual
      </Text>

      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={4}>
        {players.map((player) => (
          <Link key={player.id} href={`/players/${player.id}`}>
            <Box
              bg="gray.800"
              borderRadius="xl"
              p={5}
              borderWidth="1px"
              borderColor="gray.700"
              cursor="pointer"
              transition="all 0.3s"
              _hover={{
                borderColor: 'blue.500',
                transform: 'translateY(-4px)',
                shadow: 'xl',
              }}
            >
              <Flex justify="space-between" align="start" mb={4}>
                <Flex align="center" gap={3}>
                  <Box
                    w="45px"
                    h="45px"
                    borderRadius="full"
                    bg="blue.600"
                    display="flex"
                    alignItems="center"
                    justifyContent="center"
                    fontSize="lg"
                    fontWeight="bold"
                    color="white"
                  >
                    #{player.number}
                  </Box>
                  <Box>
                    <Text fontSize="md" fontWeight="bold" color="white">
                      {player.name}
                    </Text>
                    <Text fontSize="xs" color="gray.400">
                      Ver perfil completo →
                    </Text>
                  </Box>
                </Flex>

                <Badge
                  colorScheme={
                    player.trend === 'up' ? 'green' :
                    player.trend === 'down' ? 'red' : 'gray'
                  }
                  fontSize="xs"
                >
                  {player.trend === 'up' ? '↗ Subindo' : player.trend === 'down' ? '↘ Caindo' : '→ Estável'}
                </Badge>
              </Flex>

              <Box mb={4}>
                <Text fontSize="xs" color="gray.400" mb={1}>
                  Eficiência Geral
                </Text>
                <Text fontSize="3xl" fontWeight="bold" color="blue.400">
                  {player.efficiency}%
                </Text>
              </Box>

              <Flex direction="column" gap={2}>
                <Text fontSize="xs" color="gray.400" mb={1}>
                  Fundamentos
                </Text>
                {Object.entries(player.fundaments).filter(([_, val]) => val > 0).map(([key, value]) => (
                  <Flex key={key} align="center" gap={2}>
                    <Text fontSize="xs" color="gray.400" minW="70px" textTransform="capitalize">
                      {key}
                    </Text>
                    <Box flex="1" h="4px" bg="gray.900" borderRadius="full" overflow="hidden">
                      <Box
                        h="full"
                        w={`${value}%`}
                        bg={value >= 80 ? 'green.500' : value >= 70 ? 'yellow.500' : 'red.500'}
                        borderRadius="full"
                      />
                    </Box>
                    <Text fontSize="xs" color="white" fontWeight="bold" minW="35px">
                      {value}%
                    </Text>
                  </Flex>
                ))}
              </Flex>
            </Box>
          </Link>
        ))}
      </Grid>
    </Box>
  )
}
