'use client'

import { Box, Flex, Text, Grid, Button } from '@chakra-ui/react'
import { useState } from 'react'
import { Action, ActionType } from '@/types/volleyball'
import { analyzeFundamental, FUNDAMENTALS } from '@/lib/kpis'
import KpiCard from './KpiCard'

interface PlayerDrillDownProps {
  playerId: string
  playerName: string
  actions: Action[]
  onClose: () => void
}

export default function PlayerDrillDown({
  playerId,
  playerName,
  actions,
  onClose,
}: PlayerDrillDownProps) {
  const [selectedFundament, setSelectedFundament] = useState<ActionType | 'all'>('all')

  // Filtra ações do jogador
  const playerActions = actions.filter((a) => a.playerId === playerId)

  // Análise por fundamento ou global
  const analysis =
    selectedFundament === 'all'
      ? null
      : analyzeFundamental(playerActions, selectedFundament)

  // Calcula resumo geral
  const summary = {
    totalActions: playerActions.length,
    avgEfficiency:
      playerActions.length > 0
        ? playerActions.reduce((sum, a) => sum + a.efficiencyValue, 0) / playerActions.length
        : 0,
    byFundament: Object.keys(FUNDAMENTALS).reduce(
      (acc, fund) => {
        const fundActions = playerActions.filter((a) => a.actionType === fund)
        acc[fund as ActionType] = fundActions.length
        return acc
      },
      {} as Record<ActionType, number>
    ),
  }

  const fundaments = [
    { id: 'all' as const, name: 'Geral', icon: '📊', color: 'gray' },
    { id: ActionType.SERVE, name: 'Saque', icon: '🏐', color: 'orange' },
    { id: ActionType.PASS, name: 'Recepção', icon: '🤲', color: 'blue' },
    { id: ActionType.ATTACK, name: 'Ataque', icon: '⚡', color: 'red' },
    { id: ActionType.BLOCK, name: 'Bloqueio', icon: '🛡️', color: 'purple' },
    { id: ActionType.DIG, name: 'Defesa', icon: '🔄', color: 'green' },
    { id: ActionType.SET, name: 'Levantamento', icon: '🙌', color: 'yellow' },
  ]

  return (
    <Box
      position="fixed"
      top="0"
      left="0"
      right="0"
      bottom="0"
      bg="rgba(0, 0, 0, 0.8)"
      zIndex={9999}
      display="flex"
      alignItems="center"
      justifyContent="center"
      p={4}
      onClick={onClose}
    >
      <Box
        bg="gray.900"
        borderRadius="xl"
        maxW="1200px"
        w="full"
        maxH="90vh"
        overflowY="auto"
        onClick={(e) => e.stopPropagation()}
        borderWidth="1px"
        borderColor="gray.700"
      >
        {/* Header */}
        <Flex
          justify="space-between"
          align="center"
          p={6}
          borderBottom="1px"
          borderColor="gray.800"
          position="sticky"
          top="0"
          bg="gray.900"
          zIndex={1}
        >
          <Box>
            <Text fontSize="2xl" fontWeight="bold" color="white">
              {playerName}
            </Text>
            <Text fontSize="sm" color="gray.400">
              Análise Detalhada de Performance
            </Text>
          </Box>
          <Button onClick={onClose} variant="ghost" colorScheme="gray" size="sm">
            <Text fontSize="lg">✕</Text>
          </Button>
        </Flex>

        {/* Content */}
        <Box p={6}>
          {/* Resumo Geral */}
          <Box bg="gray.800" borderRadius="lg" p={5} mb={6} borderWidth="1px" borderColor="gray.700">
            <Text fontSize="lg" fontWeight="bold" color="white" mb={4}>
              📊 Resumo Geral
            </Text>

            <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={4}>
              <Box>
                <Text fontSize="xs" color="gray.400" mb={1}>
                  Total de Ações
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="white">
                  {summary.totalActions}
                </Text>
              </Box>

              <Box>
                <Text fontSize="xs" color="gray.400" mb={1}>
                  Eficiência Média
                </Text>
                <Text
                  fontSize="2xl"
                  fontWeight="bold"
                  color={
                    summary.avgEfficiency > 0.3
                      ? 'green.400'
                      : summary.avgEfficiency > 0
                        ? 'yellow.400'
                        : 'red.400'
                  }
                >
                  {summary.avgEfficiency.toFixed(2)}
                </Text>
              </Box>

              <Box>
                <Text fontSize="xs" color="gray.400" mb={1}>
                  Fundamentos Ativos
                </Text>
                <Text fontSize="2xl" fontWeight="bold" color="white">
                  {Object.values(summary.byFundament).filter((v) => v > 0).length} / 6
                </Text>
              </Box>
            </Grid>
          </Box>

          {/* Seletor de Fundamento */}
          <Flex gap={2} mb={6} overflowX="auto" pb={2}>
            {fundaments.map((fund) => {
              const count = fund.id === 'all' ? summary.totalActions : summary.byFundament[fund.id as ActionType] || 0

              const isDisabled = fund.id !== 'all' && count === 0

              return (
                <Box
                  key={fund.id}
                  as="button"
                  onClick={() => !isDisabled && setSelectedFundament(fund.id)}
                  px={4}
                  py={3}
                  borderRadius="lg"
                  bg={selectedFundament === fund.id ? `${fund.color}.600` : 'gray.800'}
                  borderWidth="1px"
                  borderColor={selectedFundament === fund.id ? `${fund.color}.500` : 'gray.700'}
                  cursor={isDisabled ? 'not-allowed' : 'pointer'}
                  transition="all 0.2s"
                  _hover={{
                    bg: selectedFundament === fund.id ? `${fund.color}.600` : 'gray.750',
                  }}
                  minW="fit-content"
                  opacity={isDisabled ? 0.5 : 1}
                >
                  <Flex align="center" gap={2}>
                    <Text fontSize="lg">{fund.icon}</Text>
                    <Box textAlign="left">
                      <Text fontSize="sm" fontWeight="medium" color="white">
                        {fund.name}
                      </Text>
                      <Text fontSize="xs" color="gray.400">
                        {count} ações
                      </Text>
                    </Box>
                  </Flex>
                </Box>
              )
            })}
          </Flex>

          {/* KPIs do Fundamento Selecionado */}
          {selectedFundament === 'all' ? (
            <Box bg="gray.800" borderRadius="lg" p={5} borderWidth="1px" borderColor="gray.700">
              <Text fontSize="lg" fontWeight="bold" color="white" mb={4}>
                📈 Distribuição por Fundamento
              </Text>

              <Grid templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)' }} gap={4}>
                {Object.entries(summary.byFundament).map(([fund, count]) => {
                  const fundConfig = FUNDAMENTALS[fund as ActionType]
                  const percentage = (count / summary.totalActions) * 100

                  return (
                    <Box
                      key={fund}
                      bg="gray.900"
                      borderRadius="lg"
                      p={4}
                      borderWidth="1px"
                      borderColor="gray.700"
                    >
                      <Flex align="center" gap={2} mb={2}>
                        <Text fontSize="lg">{fundConfig.icon}</Text>
                        <Text fontSize="sm" fontWeight="medium" color="white">
                          {fundConfig.label}
                        </Text>
                      </Flex>

                      <Text fontSize="2xl" fontWeight="bold" color="white" mb={1}>
                        {count}
                      </Text>

                      <Text fontSize="xs" color="gray.400">
                        {percentage.toFixed(1)}% do total
                      </Text>

                      {/* Barra de progresso */}
                      <Box mt={3} w="full" h="6px" bg="gray.700" borderRadius="full" overflow="hidden">
                        <Box
                          h="full"
                          bg={`${fundConfig.label === 'Saque' ? 'orange' : fundConfig.label === 'Recepção' ? 'blue' : fundConfig.label === 'Ataque' ? 'red' : fundConfig.label === 'Bloqueio' ? 'purple' : fundConfig.label === 'Defesa' ? 'green' : 'yellow'}.500`}
                          w={`${percentage}%`}
                          transition="width 0.3s"
                        />
                      </Box>
                    </Box>
                  )
                })}
              </Grid>
            </Box>
          ) : analysis ? (
            <Box>
              <Box bg="gray.800" borderRadius="lg" p={5} mb={4} borderWidth="1px" borderColor="gray.700">
                <Text fontSize="lg" fontWeight="bold" color="white" mb={4}>
                  📊 KPIs de {FUNDAMENTALS[selectedFundament].label}
                </Text>

                <Grid
                  templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
                  gap={4}
                >
                  {analysis.kpis.map((kpi) => (
                    <KpiCard key={kpi.key} kpi={kpi} size="sm" />
                  ))}
                </Grid>
              </Box>

              {/* Totais */}
              <Box bg="gray.800" borderRadius="lg" p={5} borderWidth="1px" borderColor="gray.700">
                <Text fontSize="md" fontWeight="bold" color="white" mb={3}>
                  Distribuição Detalhada
                </Text>

                <Grid templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }} gap={3}>
                  {Object.entries(analysis.totals).map(([key, value]) => (
                    <Flex key={key} justify="space-between" align="center">
                      <Text fontSize="xs" color="gray.400" textTransform="capitalize">
                        {key.replace(/([A-Z])/g, ' $1').trim()}:
                      </Text>
                      <Text fontSize="sm" fontWeight="bold" color="white">
                        {value}
                      </Text>
                    </Flex>
                  ))}
                </Grid>
              </Box>
            </Box>
          ) : null}
        </Box>
      </Box>
    </Box>
  )
}
