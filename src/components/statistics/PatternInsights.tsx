'use client'

import { Box, Grid, Text, Flex, Badge } from '@chakra-ui/react'
import { MdTrendingUp, MdTrendingDown } from 'react-icons/md'
import { GiPointySword } from 'react-icons/gi'
import { MdShield } from 'react-icons/md'

interface RotationStat {
  rotation: number
  totalPoints: number
  pointsWon: number
  pointsLost: number
  sideOutEfficiency: number
  breakPointEfficiency: number
  winRate: number
  attackEfficiency: number
  receptionEfficiency: number
  atkTotal: number
  recTotal: number
}

interface PatternInsightsProps {
  rotationStats: RotationStat[]
}

export default function PatternInsights({ rotationStats }: PatternInsightsProps) {
  const hasData = rotationStats.some(r => r.totalPoints > 0)

  // Find best and worst rotations
  const sortedByWin = [...rotationStats].filter(r => r.totalPoints > 0).sort((a, b) => b.winRate - a.winRate)
  const bestRotation = sortedByWin[0]
  const worstRotation = sortedByWin[sortedByWin.length - 1]

  return (
    <Box>
      {!hasData ? (
        <Box bg="gray.800" borderRadius="xl" p={8} textAlign="center" borderWidth="1px" borderColor="gray.700/60">
          <Text fontSize="3xl" mb={3}>🔄</Text>
          <Text color="white" fontSize="lg" fontWeight="bold" mb={2}>
            Dados de Rotação Indisponíveis
          </Text>
          <Text color="gray.400" fontSize="sm" maxW="400px" mx="auto">
            As análises por rotação serão disponibilizadas quando houver dados de rally com informação de rotação registrados durante o scout.
          </Text>
        </Box>
      ) : (
        <>
          {/* Highlights: Melhor e Pior */}
          <Grid templateColumns={{ base: '1fr', md: '1fr 1fr' }} gap={4} mb={6}>
            {bestRotation && (
              <Box
                bg="gray.800"
                p={5}
                borderRadius="xl"
                borderWidth="1px"
                borderColor="green.500/40"
                borderLeftWidth="4px"
                borderLeftColor="green.500"
              >
                <Flex align="center" gap={2} mb={2}>
                  <MdTrendingUp size={20} color="#22C55E" />
                  <Text fontSize="md" fontWeight="bold" color="white">
                    Melhor Rotação: P{bestRotation.rotation}
                  </Text>
                </Flex>
                <Text color="gray.300" fontSize="sm" mb={3}>
                  Aproveitamento de{' '}
                  <Text as="span" fontWeight="bold" color="green.300">
                    {bestRotation.winRate.toFixed(1)}%
                  </Text>{' '}
                  em {bestRotation.totalPoints} pontos disputados.
                </Text>
                <Flex gap={3} flexWrap="wrap">
                  <Badge colorScheme="green" variant="subtle" px={2} py={0.5} borderRadius="md">
                    Ataque: {bestRotation.attackEfficiency.toFixed(0)}%
                  </Badge>
                  <Badge colorScheme="purple" variant="subtle" px={2} py={0.5} borderRadius="md">
                    Recepção: {bestRotation.receptionEfficiency.toFixed(0)}%
                  </Badge>
                </Flex>
              </Box>
            )}

            {worstRotation && worstRotation !== bestRotation && (
              <Box
                bg="gray.800"
                p={5}
                borderRadius="xl"
                borderWidth="1px"
                borderColor="red.500/40"
                borderLeftWidth="4px"
                borderLeftColor="red.500"
              >
                <Flex align="center" gap={2} mb={2}>
                  <MdTrendingDown size={20} color="#EF4444" />
                  <Text fontSize="md" fontWeight="bold" color="white">
                    Rotação Crítica: P{worstRotation.rotation}
                  </Text>
                </Flex>
                <Text color="gray.300" fontSize="sm" mb={3}>
                  Aproveitamento de{' '}
                  <Text as="span" fontWeight="bold" color="red.300">
                    {worstRotation.winRate.toFixed(1)}%
                  </Text>{' '}
                  em {worstRotation.totalPoints} pontos disputados.
                </Text>
                <Flex gap={3} flexWrap="wrap">
                  <Badge colorScheme="red" variant="subtle" px={2} py={0.5} borderRadius="md">
                    Ataque: {worstRotation.attackEfficiency.toFixed(0)}%
                  </Badge>
                  <Badge colorScheme="orange" variant="subtle" px={2} py={0.5} borderRadius="md">
                    Recepção: {worstRotation.receptionEfficiency.toFixed(0)}%
                  </Badge>
                </Flex>
              </Box>
            )}
          </Grid>

          {/* Grid de Rotações P1-P6 */}
          <Text fontSize="md" fontWeight="bold" color="white" mb={3}>
            Análise por Rotação
          </Text>
          <Grid
            templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(6, 1fr)' }}
            gap={3}
          >
            {rotationStats.sort((a, b) => a.rotation - b.rotation).map((stat) => {
              const isBest = bestRotation && stat.rotation === bestRotation.rotation
              const isWorst = worstRotation && stat.rotation === worstRotation.rotation && worstRotation !== bestRotation
              return (
                <Box
                  key={stat.rotation}
                  bg="gray.800"
                  p={4}
                  borderRadius="xl"
                  borderWidth={isBest || isWorst ? '2px' : '1px'}
                  borderColor={isBest ? 'green.500' : isWorst ? 'red.500' : 'gray.700/60'}
                  position="relative"
                  overflow="hidden"
                  transition="all 0.2s"
                  _hover={{ borderColor: isBest ? 'green.400' : isWorst ? 'red.400' : 'gray.500' }}
                >
                  {isBest && (
                    <Box position="absolute" top={0} right={0} bg="green.500" px={1.5} py={0.5} borderBottomLeftRadius="md">
                      <Text fontSize="2xs" fontWeight="bold" color="black">TOP</Text>
                    </Box>
                  )}
                  {isWorst && (
                    <Box position="absolute" top={0} right={0} bg="red.500" px={1.5} py={0.5} borderBottomLeftRadius="md">
                      <Text fontSize="2xs" fontWeight="bold" color="white">ATENÇÃO</Text>
                    </Box>
                  )}

                  <Text fontSize="2xl" fontWeight="black" color="white" textAlign="center" mb={1}>
                    P{stat.rotation}
                  </Text>

                  {stat.totalPoints > 0 ? (
                    <Flex direction="column" gap={1.5}>
                      {/* Win rate */}
                      <Flex justify="space-between" align="center">
                        <Text fontSize="xs" color="gray.400">Vence</Text>
                        <Text
                          fontSize="sm"
                          fontWeight="bold"
                          color={stat.winRate > 50 ? 'green.300' : stat.winRate > 40 ? 'yellow.300' : 'red.300'}
                        >
                          {stat.winRate.toFixed(0)}%
                        </Text>
                      </Flex>
                      <Box w="full" h="3px" bg="gray.700" borderRadius="full" overflow="hidden">
                        <Box
                          h="full"
                          w={`${stat.winRate}%`}
                          bg={stat.winRate > 50 ? 'green.500' : stat.winRate > 40 ? 'yellow.500' : 'red.500'}
                          borderRadius="full"
                        />
                      </Box>

                      {/* Attack efficiency */}
                      <Flex justify="space-between" align="center">
                        <Flex align="center" gap={1}>
                          <GiPointySword size={10} color="#9CA3AF" />
                          <Text fontSize="2xs" color="gray.500">Ataque</Text>
                        </Flex>
                        <Text
                          fontSize="2xs"
                          fontWeight="bold"
                          color={stat.attackEfficiency >= 30 ? 'green.300' : stat.attackEfficiency >= 15 ? 'yellow.300' : 'red.300'}
                        >
                          {stat.atkTotal > 0 ? `${stat.attackEfficiency.toFixed(0)}%` : '—'}
                        </Text>
                      </Flex>

                      {/* Reception efficiency */}
                      <Flex justify="space-between" align="center">
                        <Flex align="center" gap={1}>
                          <MdShield size={10} color="#9CA3AF" />
                          <Text fontSize="2xs" color="gray.500">Recepção</Text>
                        </Flex>
                        <Text
                          fontSize="2xs"
                          fontWeight="bold"
                          color={stat.receptionEfficiency >= 60 ? 'green.300' : stat.receptionEfficiency >= 45 ? 'yellow.300' : 'red.300'}
                        >
                          {stat.recTotal > 0 ? `${stat.receptionEfficiency.toFixed(0)}%` : '—'}
                        </Text>
                      </Flex>

                      <Text fontSize="2xs" color="gray.600" textAlign="center">
                        {stat.totalPoints} pts
                      </Text>
                    </Flex>
                  ) : (
                    <Text fontSize="xs" color="gray.600" textAlign="center" mt={2}>
                      Sem dados
                    </Text>
                  )}
                </Box>
              )
            })}
          </Grid>

          {/* Insight */}
          {bestRotation && worstRotation && bestRotation !== worstRotation && (
            <Box mt={6} p={4} bg="blue.900/30" borderRadius="xl" borderWidth="1px" borderColor="blue.700/40">
              <Text fontWeight="bold" color="white" fontSize="sm" mb={1}>💡 Insight</Text>
              <Text color="gray.300" fontSize="sm" lineHeight="tall">
                A rotação <strong>P{bestRotation.rotation}</strong> é a mais eficiente com{' '}
                {bestRotation.winRate.toFixed(0)}% de aproveitamento
                {bestRotation.atkTotal > 0 && ` e ${bestRotation.attackEfficiency.toFixed(0)}% de eficiência no ataque`}.
                Considere iniciar os sets nesta rotação.
                A <strong>P{worstRotation.rotation}</strong> precisa de atenção com apenas{' '}
                {worstRotation.winRate.toFixed(0)}% de aproveitamento
                {worstRotation.atkTotal > 0 && ` e ${worstRotation.attackEfficiency.toFixed(0)}% no ataque`}.
              </Text>
            </Box>
          )}
        </>
      )}
    </Box>
  )
}
