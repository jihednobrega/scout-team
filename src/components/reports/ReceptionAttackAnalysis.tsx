'use client'

import React, { useMemo } from 'react'
import {
  Box,
  Flex,
  Grid,
  Heading,
  Text,
  Progress,
  Tooltip,
} from '@chakra-ui/react'
import { SCOUT_COLORS } from '@/lib/scoutColors'
import { ScoutAction } from '@/types/scout'
import {
  analyzeReceptionAttack,
  AttackScenarioStats,
  ReceptionAttackAnalysis as AnalysisType,
} from '@/lib/kpis/receptionAttack'

// ============================================================================
// TIPOS
// ============================================================================

interface ReceptionAttackAnalysisProps {
  /** Array de ações de scout */
  actions: ScoutAction[]
  /** Filtrar por matchId específico */
  matchId?: string
}

// ============================================================================
// COMPONENTE AUXILIAR: CARD DE CENÁRIO
// ============================================================================

interface ScenarioCardProps {
  title: string
  subtitle: string
  stats: AttackScenarioStats
  colorHex: string
  colorScheme: string
  borderColorLight: string
  bgColor: string
}

function ScenarioCard({
  title,
  subtitle,
  stats,
  colorHex,
  colorScheme,
  borderColorLight,
  bgColor,
}: ScenarioCardProps) {
  const hasData = stats.total > 0
  const pctDisplay = hasData
    ? `${(stats.pointPercentage * 100).toFixed(0)}%`
    : null

  return (
    <Box
      bg={bgColor}
      borderRadius="xl"
      borderWidth="1px"
      borderColor={borderColorLight}
      p={{ base: 4, md: 5 }}
      position="relative"
      overflow="hidden"
      data-testid="reception-attack-card"
    >
      {/* Decoração lateral */}
      <Box
        position="absolute"
        left={0}
        top={0}
        bottom={0}
        w="4px"
        bg={colorHex}
        borderLeftRadius="xl"
      />

      <Text
        fontSize="xs"
        fontWeight="bold"
        textTransform="uppercase"
        letterSpacing="wider"
        color={`${colorScheme}.300`}
        mb={1}
      >
        {title}
      </Text>
      <Text fontSize="xs" color="gray.400" mb={3}>
        {subtitle}
      </Text>

      {hasData ? (
        <>
          {/* Número grande */}
          <Text
            fontSize={{ base: '2xl', md: '3xl' }}
            fontWeight="bold"
            color="white"
            lineHeight="1"
            mb={2}
          >
            {pctDisplay}
            <Text as="span" fontSize="sm" fontWeight="normal" color="gray.400" ml={1}>
              conversão
            </Text>
          </Text>

          {/* Barra de progresso */}
          <Tooltip
            label={`Eficiência: ${(stats.efficiency * 100).toFixed(1)}%`}
            placement="top"
            hasArrow
            bg="gray.700"
          >
            <Box>
              <Progress
                value={stats.pointPercentage * 100}
                size="sm"
                borderRadius="full"
                colorScheme={colorScheme}
                bg="whiteAlpha.100"
                mb={3}
              />
            </Box>
          </Tooltip>

          {/* Detalhes */}
          <Flex gap={3} flexWrap="wrap">
            <DetailBadge label="Ataques" value={stats.total} />
            <DetailBadge label="Pontos" value={stats.points} color="green.300" />
            <DetailBadge label="Erros" value={stats.errors} color="red.300" />
            <DetailBadge label="Bloqueados" value={stats.blocked} color="yellow.300" />
          </Flex>

          {/* Eficiência (hitting%) */}
          <Text fontSize="xs" color="gray.500" mt={2}>
            Hitting%: {(stats.efficiency * 100).toFixed(1)}%
          </Text>
        </>
      ) : (
        <Flex
          direction="column"
          align="center"
          justify="center"
          minH="80px"
          color="gray.500"
        >
          <Text fontSize="sm">Dados insuficientes</Text>
          <Text fontSize="xs" mt={1}>
            Nenhum ataque neste cenário
          </Text>
        </Flex>
      )}
    </Box>
  )
}

function DetailBadge({
  label,
  value,
  color = 'gray.300',
}: {
  label: string
  value: number
  color?: string
}) {
  return (
    <Box>
      <Text fontSize="xs" color="gray.500">
        {label}
      </Text>
      <Text fontSize="sm" fontWeight="semibold" color={color}>
        {value}
      </Text>
    </Box>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function ReceptionAttackAnalysis({
  actions,
  matchId,
}: ReceptionAttackAnalysisProps) {
  const analysis: AnalysisType = useMemo(
    () => analyzeReceptionAttack(actions, matchId),
    [actions, matchId]
  )

  const { afterGoodPass, afterBadPass, counterAttack, conversionDelta } = analysis
  const hasAnyData =
    afterGoodPass.total > 0 || afterBadPass.total > 0 || counterAttack.total > 0

  if (!hasAnyData) {
    return null // Não renderizar se não há dados
  }

  // Frase resumo
  const summaryText = useMemo(() => {
    if (conversionDelta === null) return null
    const deltaPercent = Math.abs(conversionDelta * 100).toFixed(0)
    if (conversionDelta > 0) {
      return `Quando recebemos bem, convertemos ${deltaPercent}% a mais do que quando recebemos mal.`
    } else if (conversionDelta < 0) {
      return `Surpreendentemente, a conversão após recepção ruim está ${deltaPercent}% acima da recepção boa. Investigue a distribuição do levantador.`
    }
    return 'A conversão é similar independente da qualidade da recepção.'
  }, [conversionDelta])

  return (
    <Box
      bg="gray.800"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.700"
      p={{ base: 4, md: 6 }}
      data-testid="reception-attack-section"
    >
      {/* Header */}
      <Flex align="center" gap={2} mb={1}>
        <Heading size="md" color="white">
          Como a recepção afeta nosso ataque
        </Heading>
      </Flex>
      <Text fontSize="sm" color="gray.400" mb={5}>
        Análise cruzada: eficiência de ataque separada pela qualidade do passe anterior
      </Text>

      {/* Cards dos 3 cenários */}
      <Grid
        templateColumns={{ base: '1fr', md: 'repeat(3, 1fr)' }}
        gap={4}
        mb={4}
      >
        <ScenarioCard
          title="Recepção boa (A/B)"
          subtitle="1° ataque após passe perfeito ou bom"
          stats={afterGoodPass}
          colorHex={SCOUT_COLORS.EXCELLENT.hex}
          colorScheme="green"
          borderColorLight="green.800"
          bgColor="rgba(34, 197, 94, 0.06)"
        />

        <ScenarioCard
          title="Recepção ruim (C)"
          subtitle="1° ataque após passe razoável ou erro"
          stats={afterBadPass}
          colorHex={SCOUT_COLORS.ERROR.hex}
          colorScheme="red"
          borderColorLight="red.900"
          bgColor="rgba(239, 68, 68, 0.06)"
        />

        <ScenarioCard
          title="Contra-ataque"
          subtitle="Ataques de transição (defesa → ataque)"
          stats={counterAttack}
          colorHex={SCOUT_COLORS.POSITIVE.hex}
          colorScheme="blue"
          borderColorLight="blue.800"
          bgColor="rgba(59, 130, 246, 0.06)"
        />
      </Grid>

      {/* Frase resumo */}
      {summaryText && (
        <Box
          bg="whiteAlpha.50"
          borderRadius="lg"
          px={4}
          py={3}
          borderLeftWidth="3px"
          borderLeftColor={
            conversionDelta !== null && conversionDelta > 0
              ? 'green.400'
              : conversionDelta !== null && conversionDelta < 0
                ? 'yellow.400'
                : 'gray.500'
          }
          data-testid="reception-attack-summary"
        >
          <Text fontSize="sm" color="gray.300" fontStyle="italic">
            {summaryText}
          </Text>
        </Box>
      )}
    </Box>
  )
}
