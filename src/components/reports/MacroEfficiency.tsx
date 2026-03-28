'use client'

import React, { useMemo } from 'react'
import { Box, Flex, Grid, Heading, Text, Tooltip } from '@chakra-ui/react'
import { PointHistory } from '@/utils/mockData'
import { ScoutAction } from '@/types/scout'
import {
  calculateMacroEfficiency,
  MacroEfficiency as MacroEfficiencyType,
  RatedMetric,
  RatioMetric,
  SIDE_OUT_THRESHOLDS,
  BREAK_THRESHOLDS,
} from '@/lib/kpis/macroEfficiency'

// ============================================================================
// TIPOS
// ============================================================================

interface MacroEfficiencyProps {
  pointHistory: PointHistory[]
  scoutActions?: ScoutAction[]
}

// ============================================================================
// COMPONENTE: BARRA DE REFERÊNCIA
// ============================================================================

function ReferenceBar({
  value,
  thresholds,
}: {
  value: number
  thresholds: { label: string; max: number; color: string }[]
}) {
  // Posição do indicador (clamp 0-100)
  const position = Math.min(Math.max(value, 0), 100)

  return (
    <Box position="relative" mt={2} mb={1}>
      {/* Barra de faixas */}
      <Flex h="8px" borderRadius="full" overflow="hidden">
        {thresholds.map((t, i) => {
          const prevMax = i > 0 ? thresholds[i - 1].max : 0
          const width = t.max - prevMax
          return (
            <Tooltip
              key={t.label}
              label={`${t.label}: ${prevMax}–${t.max}%`}
              hasArrow
              bg="gray.700"
              placement="top"
            >
              <Box w={`${width}%`} h="full" bg={t.color} opacity={0.3} />
            </Tooltip>
          )
        })}
      </Flex>

      {/* Indicador */}
      <Box
        position="absolute"
        top="-2px"
        left={`${position}%`}
        transform="translateX(-50%)"
        w="4px"
        h="12px"
        bg="white"
        borderRadius="full"
        boxShadow="0 0 4px rgba(255,255,255,0.5)"
      />

      {/* Labels das faixas */}
      <Flex justify="space-between" mt={1}>
        {thresholds.map((t, i) => {
          const prevMax = i > 0 ? thresholds[i - 1].max : 0
          return (
            <Text
              key={t.label}
              fontSize="9px"
              color="gray.500"
              w={`${t.max - prevMax}%`}
              textAlign="center"
            >
              {t.label}
            </Text>
          )
        })}
      </Flex>
    </Box>
  )
}

// ============================================================================
// COMPONENTE: CARD DE MÉTRICA COM RATING
// ============================================================================

function RatedCard({
  title,
  subtitle,
  metric,
  thresholds,
  tooltipText,
}: {
  title: string
  subtitle: string
  metric: RatedMetric
  thresholds: { label: string; max: number; color: string }[]
  tooltipText: string
}) {
  return (
    <Box bg="gray.900" borderRadius="xl" p={4} borderWidth="1px" borderColor="gray.700" data-testid={`macro-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <Flex justify="space-between" align="start" mb={2}>
        <Box>
          <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.400">
            {title}
          </Text>
          <Text fontSize="xs" color="gray.500">{subtitle}</Text>
        </Box>
        <Text
          fontSize="xs"
          fontWeight="bold"
          px={2}
          py={0.5}
          borderRadius="md"
          bg={`${metric.ratingColor}20`}
          color={metric.ratingColor}
          textTransform="capitalize"
        >
          {metric.rating}
        </Text>
      </Flex>

      {/* Número grande */}
      <Tooltip label={tooltipText} hasArrow bg="gray.700" placement="top">
        <Text
          fontSize="3xl"
          fontWeight="bold"
          color="white"
          lineHeight="1"
          mb={1}
          cursor="default"
        >
          {metric.percentage.toFixed(1)}
          <Text as="span" fontSize="lg" color="gray.400">%</Text>
        </Text>
      </Tooltip>

      {/* Barra de referência */}
      <ReferenceBar value={metric.percentage} thresholds={thresholds} />
    </Box>
  )
}

// ============================================================================
// COMPONENTE: CARD DE RAZÃO
// ============================================================================

function RatioCard({
  title,
  subtitle,
  ratio,
  unitLabel,
}: {
  title: string
  subtitle: string
  ratio: RatioMetric
  unitLabel: string
}) {
  const hasValue = ratio.value !== null

  return (
    <Box bg="gray.900" borderRadius="xl" p={4} borderWidth="1px" borderColor="gray.700" data-testid={`macro-card-${title.toLowerCase().replace(/\s+/g, '-')}`}>
      <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.400" mb={1}>
        {title}
      </Text>

      {hasValue ? (
        <>
          <Flex align="baseline" gap={1} mb={1}>
            <Text fontSize="3xl" fontWeight="bold" color="white" lineHeight="1">
              {ratio.value!.toFixed(1)}
            </Text>
            <Text fontSize="xs" color="gray.400">{unitLabel}</Text>
          </Flex>

          <Text fontSize="xs" color="gray.500" mb={2}>
            {subtitle}
          </Text>

          {/* Indicador bom/ruim */}
          <Flex align="center" gap={1.5}>
            <Box
              w="8px"
              h="8px"
              borderRadius="full"
              bg={ratio.isGood ? '#22C55E' : '#EAB308'}
            />
            <Text fontSize="xs" color={ratio.isGood ? 'green.300' : 'yellow.300'}>
              {ratio.isGood ? 'Dentro da referência' : 'Acima da referência'}
            </Text>
          </Flex>

          <Text fontSize="10px" color="gray.600" mt={1}>
            {ratio.numerator} total → {ratio.denominator} convertidos
          </Text>
        </>
      ) : (
        <Flex direction="column" align="center" justify="center" minH="60px" color="gray.500">
          <Text fontSize="sm">Dados insuficientes</Text>
        </Flex>
      )}
    </Box>
  )
}

// ============================================================================
// COMPONENTE PRINCIPAL
// ============================================================================

export default function MacroEfficiency({ pointHistory, scoutActions }: MacroEfficiencyProps) {
  const data: MacroEfficiencyType = useMemo(
    () => calculateMacroEfficiency(pointHistory, scoutActions),
    [pointHistory, scoutActions]
  )

  const opponentErrors = useMemo(
    () => (scoutActions ?? []).filter(a => a.action === 'opponent_error').length,
    [scoutActions]
  )

  if (!data.hasData) return null

  const { sideOut, breakPoint, serveToBreakRatio, receptionToSideOutRatio } = data

  // Frase resumo
  const summaryText = useMemo(() => {
    const parts: string[] = []
    parts.push(`Nosso side-out está ${sideOut.rating} (${sideOut.percentage.toFixed(1)}%)`)
    parts.push(`e nosso break está ${breakPoint.rating} (${breakPoint.percentage.toFixed(1)}%).`)
    if (serveToBreakRatio.value !== null) {
      parts.push(`Precisamos de ${serveToBreakRatio.value.toFixed(1)} saques para cada break point.`)
    }
    return parts.join(' ')
  }, [sideOut, breakPoint, serveToBreakRatio])

  return (
    <Box bg="gray.800" borderRadius="xl" borderWidth="1px" borderColor="gray.700" p={{ base: 4, md: 6 }} data-testid="macro-efficiency-section">
      <Heading size="md" color="white" mb={1}>
        Eficiência do time
      </Heading>
      <Text fontSize="sm" color="gray.400" mb={5}>
        Métricas macro com referências profissionais
      </Text>

      <Grid
        templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(4, 1fr)' }}
        gap={4}
        mb={4}
      >
        <RatedCard
          title="Side-Out"
          subtitle="Quando recebemos"
          metric={sideOut}
          thresholds={SIDE_OUT_THRESHOLDS}
          tooltipText={`Marcamos ${sideOut.pointsWon} pontos em ${sideOut.totalRallies} rallies recebendo`}
        />

        <RatedCard
          title="Break Point"
          subtitle="Quando sacamos"
          metric={breakPoint}
          thresholds={BREAK_THRESHOLDS}
          tooltipText={`Marcamos ${breakPoint.pointsWon} pontos em ${breakPoint.totalRallies} rallies sacando`}
        />

        <RatioCard
          title="Saques por Break"
          subtitle={`A cada ${serveToBreakRatio.value?.toFixed(1) ?? '–'} saques, 1 break point`}
          ratio={serveToBreakRatio}
          unitLabel="saques/break"
        />

        <RatioCard
          title="Recepções por Side-Out"
          subtitle={`A cada ${receptionToSideOutRatio.value?.toFixed(1) ?? '–'} recepções, 1 ponto`}
          ratio={receptionToSideOutRatio}
          unitLabel="rec/side-out"
        />

        {opponentErrors > 0 && (
          <Box bg="gray.900" borderRadius="xl" p={4} borderWidth="1px" borderColor="gray.700">
            <Text fontSize="xs" fontWeight="bold" textTransform="uppercase" letterSpacing="wider" color="gray.400" mb={1}>
              Erros do Adversário
            </Text>
            <Text fontSize="3xl" fontWeight="bold" color="yellow.300" lineHeight="1" mb={1}>
              {opponentErrors}
            </Text>
            <Text fontSize="xs" color="gray.500">
              Pontos ganhos por erros não-forçados do adversário
            </Text>
          </Box>
        )}
      </Grid>

      {/* Frase resumo */}
      <Box
        bg="whiteAlpha.50"
        borderRadius="lg"
        px={4}
        py={3}
        borderLeftWidth="3px"
        borderLeftColor={sideOut.ratingColor}
      >
        <Text fontSize="sm" color="gray.300" fontStyle="italic">
          {summaryText}
        </Text>
      </Box>
    </Box>
  )
}
