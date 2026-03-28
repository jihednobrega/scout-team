'use client'

import { Box, Grid, Text, Flex } from '@chakra-ui/react'
import {
  MdGpsFixed,
  MdShield,
  MdSportsVolleyball,
  MdPercent,
} from 'react-icons/md'
import { GiPointySword } from 'react-icons/gi'

interface KPICardsProps {
  kpis: {
    matchesPlayed: number
    wins: number
    losses: number
    totalActions: number
    attackEfficiency: number
    killPercentage: number
    acePercentage: number
    receptionEfficiency: number
    blockKillsPerMatch: number
    totalPoints: number
  }
}

function getEffColor(value: number, thresholds: [number, number, number] = [50, 30, 15]): string {
  if (value >= thresholds[0]) return 'green.400'
  if (value >= thresholds[1]) return 'yellow.400'
  if (value >= thresholds[2]) return 'orange.400'
  return 'red.400'
}

function getEffBg(value: number, thresholds: [number, number, number] = [50, 30, 15]): string {
  if (value >= thresholds[0]) return 'green.500'
  if (value >= thresholds[1]) return 'yellow.500'
  if (value >= thresholds[2]) return 'orange.500'
  return 'red.500'
}

interface KPIItemProps {
  label: string
  value: string
  subtitle?: string
  icon: React.ElementType
  color: string
  accentBg: string
  barValue?: number
  barThresholds?: [number, number, number]
}

function KPIItem({ label, value, subtitle, icon: Icon, color, accentBg, barValue, barThresholds }: KPIItemProps) {
  return (
    <Box
      bg="gray.800"
      borderRadius="xl"
      p={4}
      borderWidth="1px"
      borderColor="gray.700/60"
      position="relative"
      overflow="hidden"
      transition="all 0.2s"
      _hover={{ borderColor: 'gray.600', transform: 'translateY(-1px)' }}
    >
      {/* Accent bar top */}
      <Box
        position="absolute"
        top={0}
        left={0}
        right={0}
        h="3px"
        bg={accentBg}
        opacity={0.8}
      />

      <Flex align="center" gap={3} mb={2}>
        <Flex
          w="36px"
          h="36px"
          align="center"
          justify="center"
          borderRadius="lg"
          bg={`${color.replace('.400', '.900')}/30`}
        >
          <Icon size={18} color="var(--chakra-colors-gray-300)" />
        </Flex>
        <Text fontSize="xs" color="gray.400" fontWeight="medium" textTransform="uppercase" letterSpacing="0.05em">
          {label}
        </Text>
      </Flex>

      <Text fontSize="2xl" fontWeight="black" color="white" lineHeight="1" mb={1}>
        {value}
      </Text>

      {subtitle && (
        <Text fontSize="xs" color="gray.500">
          {subtitle}
        </Text>
      )}

      {/* Progress bar */}
      {barValue !== undefined && (
        <Box mt={2} w="full" h="4px" bg="gray.700" borderRadius="full" overflow="hidden">
          <Box
            h="full"
            w={`${Math.min(Math.max(barValue, 0), 100)}%`}
            bg={getEffBg(barValue, barThresholds)}
            borderRadius="full"
            transition="width 0.5s ease"
          />
        </Box>
      )}
    </Box>
  )
}

export default function KPICards({ kpis }: KPICardsProps) {
  const winRate = kpis.matchesPlayed > 0 ? (kpis.wins / kpis.matchesPlayed) * 100 : 0

  return (
    <Grid
      templateColumns={{ base: 'repeat(2, 1fr)', md: 'repeat(3, 1fr)', lg: 'repeat(5, 1fr)' }}
      gap={3}
      mb={4}
    >
      <KPIItem
        label="Aproveitamento"
        value={`${winRate.toFixed(0)}%`}
        subtitle={`${kpis.wins}V · ${kpis.losses}D`}
        icon={MdPercent}
        color="green.400"
        accentBg="green.500"
        barValue={winRate}
        barThresholds={[60, 40, 25]}
      />
      <KPIItem
        label="Ef. Ataque"
        value={`${kpis.attackEfficiency.toFixed(1)}%`}
        subtitle={`${kpis.killPercentage.toFixed(0)}% kill`}
        icon={GiPointySword}
        color="blue.400"
        accentBg="blue.500"
        barValue={kpis.attackEfficiency}
        barThresholds={[40, 25, 10]}
      />
      <KPIItem
        label="Ef. Recepção"
        value={`${kpis.receptionEfficiency.toFixed(1)}%`}
        subtitle="positiva"
        icon={MdSportsVolleyball}
        color="purple.400"
        accentBg="purple.500"
        barValue={kpis.receptionEfficiency}
        barThresholds={[60, 45, 30]}
      />
      <KPIItem
        label="Ace %"
        value={`${kpis.acePercentage.toFixed(1)}%`}
        subtitle="pontos diretos de saque"
        icon={MdGpsFixed}
        color="orange.400"
        accentBg="orange.500"
        barValue={kpis.acePercentage}
        barThresholds={[10, 6, 3]}
      />
      <KPIItem
        label="Bloqueios / Jogo"
        value={kpis.blockKillsPerMatch.toFixed(1)}
        subtitle={`${kpis.totalPoints} pontos totais`}
        icon={MdShield}
        color="red.400"
        accentBg="red.500"
      />
    </Grid>
  )
}
