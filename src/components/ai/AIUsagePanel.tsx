'use client'

import { useState, useEffect } from 'react'
import {
  Box, Flex, Text, Spinner, Grid, HStack, Badge, Icon,
} from '@chakra-ui/react'
import { IoSparklesOutline } from 'react-icons/io5'

interface UsageData {
  totalCalls: number
  totalTokens: number
  totalCostBRL: number
  recentCalls: number
  recentCostBRL: number
  byProvider: Record<string, { calls: number; tokens: number; costBRL: number }>
  byType: Record<string, { calls: number; tokens: number; costBRL: number; tier: string }>
}

const TYPE_LABELS: Record<string, string> = {
  match_analysis: 'Análise de Partida',
  match_summary: 'Resumo de Partida',
  athlete_insight: 'Insight do Atleta',
  team_health: 'Saúde da Equipe',
  post_game_reflection: 'Reflexão Pós-Jogo',
  metric_explainer: 'Explicador de Métricas',
  player_dev: 'Desenvolvimento do Atleta',
  tactical_brief: 'Briefing Tático',
  lineup_opt: 'Otimização de Escalação',
  pattern_insights: 'Padrões de Rotação',
}

function formatBRL(value: number): string {
  return `R$ ${value.toFixed(2).replace('.', ',')}`
}

function formatTokens(n: number): string {
  if (n >= 1_000_000) return `${(n / 1_000_000).toFixed(1)}M`
  if (n >= 1_000) return `${(n / 1_000).toFixed(1)}k`
  return String(n)
}

interface AIUsagePanelProps {
  teamId?: string | null
}

export default function AIUsagePanel({ teamId }: AIUsagePanelProps) {
  const [data, setData] = useState<UsageData | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const params = new URLSearchParams()
    if (teamId) params.set('teamId', teamId)
    fetch(`/api/ai/usage?${params}`)
      .then(r => r.json())
      .then(setData)
      .catch(() => {})
      .finally(() => setLoading(false))
  }, [teamId])

  if (loading) {
    return (
      <Box bg="gray.900/60" borderRadius="xl" border="1px solid" borderColor="gray.700" p={6}>
        <Flex align="center" justify="center" gap={2}>
          <Spinner size="sm" color="purple.400" />
          <Text color="gray.500" fontSize="sm">Carregando dados de uso...</Text>
        </Flex>
      </Box>
    )
  }

  if (!data || data.totalCalls === 0) {
    return (
      <Box bg="gray.900/60" borderRadius="xl" border="1px solid" borderColor="gray.700" p={6} textAlign="center">
        <Icon as={IoSparklesOutline} color="gray.600" boxSize={8} mb={2} />
        <Text color="gray.500" fontSize="sm">Nenhuma chamada de IA registrada ainda.</Text>
        <Text color="gray.600" fontSize="xs" mt={1}>
          Os custos aparecerão aqui conforme você usar os insights de IA.
        </Text>
      </Box>
    )
  }

  const typeEntries = Object.entries(data.byType).sort((a, b) => b[1].costBRL - a[1].costBRL)

  return (
    <Box bg="gray.900/60" borderRadius="xl" border="1px solid" borderColor="gray.700" overflow="hidden">
      {/* Summary KPIs */}
      <Grid templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(4, 1fr)' }} gap={0}>
        {[
          { label: 'Total chamadas', value: String(data.totalCalls), color: 'purple.400' },
          { label: 'Tokens usados', value: formatTokens(data.totalTokens), color: 'blue.400' },
          { label: 'Custo total', value: formatBRL(data.totalCostBRL), color: 'green.400' },
          { label: 'Últimos 7 dias', value: `${data.recentCalls} chamadas · ${formatBRL(data.recentCostBRL)}`, color: 'orange.400' },
        ].map((kpi, i) => (
          <Box
            key={kpi.label}
            p={4}
            borderRight={i < 3 ? '1px solid' : 'none'}
            borderRightColor="gray.700/50"
            borderBottom={{ base: i < 2 ? '1px solid' : 'none', md: 'none' }}
            borderBottomColor="gray.700/50"
          >
            <Text color="gray.500" fontSize="10px" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" mb={1}>
              {kpi.label}
            </Text>
            <Text color={kpi.color} fontSize="sm" fontWeight="800">
              {kpi.value}
            </Text>
          </Box>
        ))}
      </Grid>

      {/* Provider breakdown */}
      <Box px={4} py={3} borderTop="1px solid" borderTopColor="gray.700/50">
        <Text color="gray.500" fontSize="10px" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" mb={2}>
          Por provider
        </Text>
        <HStack spacing={3} flexWrap="wrap">
          {Object.entries(data.byProvider).map(([provider, stats]) => (
            <Flex
              key={provider}
              align="center"
              gap={2}
              bg="whiteAlpha.50"
              px={3}
              py={1.5}
              borderRadius="lg"
            >
              <Badge
                colorScheme={provider === 'anthropic' ? 'purple' : 'green'}
                variant="subtle"
                fontSize="9px"
                px={1.5}
                borderRadius="md"
              >
                {provider === 'anthropic' ? 'Claude' : 'GPT-4o-mini'}
              </Badge>
              <Text color="gray.300" fontSize="xs">
                {stats.calls}x · {formatTokens(stats.tokens)} tokens · {formatBRL(stats.costBRL)}
              </Text>
            </Flex>
          ))}
        </HStack>
      </Box>

      {/* Type breakdown */}
      <Box px={4} py={3} borderTop="1px solid" borderTopColor="gray.700/50">
        <Text color="gray.500" fontSize="10px" fontWeight="700" textTransform="uppercase" letterSpacing="0.08em" mb={2}>
          Por tipo de insight
        </Text>
        <Flex direction="column" gap={1}>
          {typeEntries.map(([type, stats]) => (
            <Flex
              key={type}
              align="center"
              justify="space-between"
              py={1}
              px={1}
              _hover={{ bg: 'whiteAlpha.50' }}
              borderRadius="md"
            >
              <HStack spacing={2}>
                <Badge
                  fontSize="8px"
                  px={1}
                  borderRadius="sm"
                  colorScheme={stats.tier === 'A' ? 'purple' : 'blue'}
                  variant="outline"
                >
                  {stats.tier}
                </Badge>
                <Text color="gray.300" fontSize="xs">
                  {TYPE_LABELS[type] || type}
                </Text>
              </HStack>
              <Text color="gray.500" fontSize="xs">
                {stats.calls}x · {formatBRL(stats.costBRL)}
              </Text>
            </Flex>
          ))}
        </Flex>
      </Box>
    </Box>
  )
}
