'use client'

import { Box, Grid, Flex, Text } from '@chakra-ui/react'
import Link from 'next/link'
import { MdSportsVolleyball, MdPeople, MdBarChart, MdHistory } from 'react-icons/md'
import type { IconType } from 'react-icons'

interface QuickAction {
  icon: IconType
  label: string
  description: string
  href: string
  accentColor: string
  accentBg: string
}

const actions: QuickAction[] = [
  {
    icon: MdSportsVolleyball,
    label: 'Novo Scout',
    description: 'Registre ações em tempo real durante a partida',
    href: '/game/new',
    accentColor: '#F97316',
    accentBg: 'rgba(249, 115, 22, 0.12)',
  },
  {
    icon: MdPeople,
    label: 'Elenco',
    description: 'Gerencie jogadores, posições e escalações da equipe',
    href: '/squad',
    accentColor: '#3B82F6',
    accentBg: 'rgba(59, 130, 246, 0.12)',
  },
  {
    icon: MdBarChart,
    label: 'Estatísticas',
    description: 'Analise KPIs, heatmaps e eficiência por rotação',
    href: '/statistics',
    accentColor: '#22C55E',
    accentBg: 'rgba(34, 197, 94, 0.12)',
  },
  {
    icon: MdHistory,
    label: 'Histórico',
    description: 'Acesse partidas anteriores e relatórios detalhados',
    href: '/history',
    accentColor: '#A855F7',
    accentBg: 'rgba(168, 85, 247, 0.12)',
  },
]

export default function QuickActions() {
  return (
    <Box mb={4}>
      <Grid
        templateColumns={{
          base: '1fr',
          sm: 'repeat(2, 1fr)',
          lg: 'repeat(4, 1fr)',
        }}
        gap={3}
      >
        {actions.map((action) => {
          const Icon = action.icon
          return (
            <Link key={action.href} href={action.href}>
              <Box
                bg="transparent"
                borderRadius="xl"
                p={4}
                cursor="pointer"
                transition="all 0.2s"
                borderWidth="1px"
                borderColor="gray.700/40"
                borderLeftWidth="3px"
                borderLeftColor={action.accentColor}
                _hover={{
                  transform: 'translateY(-2px)',
                  shadow: 'lg',
                  borderColor: `${action.accentColor}60`,
                  bg: 'gray.800/50',
                }}
                h="full"
              >
                <Flex direction="column" gap={2.5}>
                  {/* Icon + Title */}
                  <Flex align="center" gap={2.5}>
                    <Flex
                      w="36px"
                      h="36px"
                      borderRadius="lg"
                      align="center"
                      justify="center"
                      bg={action.accentBg}
                      flexShrink={0}
                    >
                      <Icon size={20} color={action.accentColor} />
                    </Flex>
                    <Text fontSize="sm" fontWeight="bold" color="white">
                      {action.label}
                    </Text>
                  </Flex>

                  {/* Description */}
                  <Text fontSize="xs" color="gray.500" lineHeight="1.5">
                    {action.description}
                  </Text>
                </Flex>
              </Box>
            </Link>
          )
        })}
      </Grid>
    </Box>
  )
}
