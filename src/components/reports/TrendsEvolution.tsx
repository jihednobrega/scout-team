'use client'

import { Box, Flex, Grid, Text } from '@chakra-ui/react'

export default function TrendsEvolution() {
  const gamesEvolution = [
    { game: 'Jogo 1', efficiency: 65, saque: 70, ataque: 68, bloqueio: 60 },
    { game: 'Jogo 2', efficiency: 70, saque: 72, ataque: 71, bloqueio: 65 },
    { game: 'Jogo 3', efficiency: 68, saque: 68, ataque: 70, bloqueio: 64 },
    { game: 'Jogo 4', efficiency: 75, saque: 78, ataque: 76, bloqueio: 71 },
    { game: 'Jogo 5', efficiency: 73, saque: 75, ataque: 74, bloqueio: 70 },
  ]

  const maxEff = Math.max(...gamesEvolution.map(g => g.efficiency))

  return (
    <Box mb={6}>
      <Text fontSize="xl" fontWeight="bold" color="white" mb={4}>
        📈 Tendências e Evolução
      </Text>

      <Grid templateColumns={{ base: '1fr', lg: 'repeat(2, 1fr)' }} gap={4}>
        {/* Evolução Geral */}
        <Box
          bg="gray.800"
          borderRadius="xl"
          p={6}
          borderWidth="1px"
          borderColor="gray.700"
        >
          <Text fontSize="sm" color="gray.400" mb={4}>
            Evolução da Eficiência Geral
          </Text>

          <Flex align="end" justify="space-between" h="200px" gap={2}>
            {gamesEvolution.map((game, idx) => (
              <Flex key={idx} direction="column" align="center" flex="1" h="full" justify="end">
                <Text fontSize="xs" fontWeight="bold" color="blue.400" mb={2}>
                  {game.efficiency}%
                </Text>
                <Box
                  w="full"
                  h={`${(game.efficiency / maxEff) * 100}%`}
                  bg="blue.500"
                  borderRadius="md"
                  transition="all 0.3s"
                  _hover={{ bg: 'blue.400' }}
                />
                <Text fontSize="xs" color="gray.400" mt={2}>
                  {game.game}
                </Text>
              </Flex>
            ))}
          </Flex>

          <Box mt={4} p={3} bg="green.900/20" borderRadius="lg" borderWidth="1px" borderColor="green.500/30">
            <Text fontSize="xs" color="green.300">
              📊 <strong>Tendência positiva:</strong> Crescimento de 12% nos últimos 5 jogos
            </Text>
          </Box>
        </Box>

        {/* Comparativo de Fundamentos */}
        <Box
          bg="gray.800"
          borderRadius="xl"
          p={6}
          borderWidth="1px"
          borderColor="gray.700"
        >
          <Text fontSize="sm" color="gray.400" mb={4}>
            Comparativo entre Fundamentos
          </Text>

          <Flex direction="column" gap={4}>
            <Box>
              <Flex justify="space-between" mb={2}>
                <Text fontSize="sm" color="white">Saque</Text>
                <Flex align="center" gap={2}>
                  <Text fontSize="xs" color="green.400">+8%</Text>
                  <Text fontSize="sm" fontWeight="bold" color="orange.400">75%</Text>
                </Flex>
              </Flex>
              <Box h="6px" bg="gray.900" borderRadius="full" overflow="hidden">
                <Box h="full" w="75%" bg="orange.500" borderRadius="full" />
              </Box>
            </Box>

            <Box>
              <Flex justify="space-between" mb={2}>
                <Text fontSize="sm" color="white">Ataque</Text>
                <Flex align="center" gap={2}>
                  <Text fontSize="xs" color="green.400">+6%</Text>
                  <Text fontSize="sm" fontWeight="bold" color="red.400">74%</Text>
                </Flex>
              </Flex>
              <Box h="6px" bg="gray.900" borderRadius="full" overflow="hidden">
                <Box h="full" w="74%" bg="red.500" borderRadius="full" />
              </Box>
            </Box>

            <Box>
              <Flex justify="space-between" mb={2}>
                <Text fontSize="sm" color="white">Bloqueio</Text>
                <Flex align="center" gap={2}>
                  <Text fontSize="xs" color="green.400">+10%</Text>
                  <Text fontSize="sm" fontWeight="bold" color="purple.400">70%</Text>
                </Flex>
              </Flex>
              <Box h="6px" bg="gray.900" borderRadius="full" overflow="hidden">
                <Box h="full" w="70%" bg="purple.500" borderRadius="full" />
              </Box>
            </Box>

            <Box>
              <Flex justify="space-between" mb={2}>
                <Text fontSize="sm" color="white">Recepção</Text>
                <Flex align="center" gap={2}>
                  <Text fontSize="xs" color="red.400">-2%</Text>
                  <Text fontSize="sm" fontWeight="bold" color="blue.400">68%</Text>
                </Flex>
              </Flex>
              <Box h="6px" bg="gray.900" borderRadius="full" overflow="hidden">
                <Box h="full" w="68%" bg="blue.500" borderRadius="full" />
              </Box>
            </Box>
          </Flex>

          <Box mt={4} p={3} bg="yellow.900/20" borderRadius="lg" borderWidth="1px" borderColor="yellow.500/30">
            <Text fontSize="xs" color="yellow.300">
              ⚠️ <strong>Atenção:</strong> Recepção apresentou queda de 2% - requer foco no treino
            </Text>
          </Box>
        </Box>
      </Grid>
    </Box>
  )
}
