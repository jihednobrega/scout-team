'use client'

import { Box, Flex, Text, Grid } from '@chakra-ui/react'
import Link from 'next/link'
import { MdArrowForward } from 'react-icons/md'

interface MatchSummary {
  id: string
  opponent: string
  date: string
  result: string
  finalScore: string
  actionsCount: number
}

function formatDate(dateStr: string): { day: string; month: string; full: string } {
  const d = new Date(dateStr)
  const day = d.toLocaleDateString('pt-BR', { day: '2-digit' })
  const month = d.toLocaleDateString('pt-BR', { month: 'short' }).replace('.', '')
  const full = d.toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
  return { day, month, full }
}

function MatchCard({ match }: { match: MatchSummary }) {
  const isWin = match.result === 'vitoria'
  const date = formatDate(match.date)
  const score = match.finalScore && match.finalScore !== '0 x 0' ? match.finalScore : '—'

  return (
    <Link href={`/reports/${match.id}`}>
      <Box
        bg="gray.800"
        borderRadius="xl"
        borderWidth="1px"
        borderColor="gray.700/60"
        borderLeftWidth="3px"
        borderLeftColor={isWin ? '#22C55E' : '#EF4444'}
        p={4}
        cursor="pointer"
        transition="all 0.2s"
        _hover={{
          borderColor: isWin ? 'green.500/50' : 'red.500/50',
          transform: 'translateY(-1px)',
          shadow: 'md',
        }}
        h="full"
        display="flex"
        flexDirection="column"
        justifyContent="space-between"
      >
        {/* Top: date + result badge */}
        <Flex justify="space-between" align="flex-start" mb={3}>
          <Text fontSize="xs" color="gray.500">
            {date.full}
          </Text>
          <Flex
            px={2}
            py={0.5}
            borderRadius="md"
            bg={isWin ? 'green.500/15' : 'red.500/15'}
          >
            <Text
              fontSize="xs"
              fontWeight="black"
              color={isWin ? 'green.300' : 'red.300'}
            >
              {isWin ? 'Vitória' : 'Derrota'}
            </Text>
          </Flex>
        </Flex>

        {/* Middle: opponent + score */}
        <Box mb={3}>
          <Text
            fontSize="sm"
            fontWeight="bold"
            color="white"
            noOfLines={1}
            mb={1}
          >
            {match.opponent}
          </Text>
          <Text
            fontSize="xl"
            fontWeight="black"
            color={isWin ? 'green.300' : 'red.300'}
            letterSpacing="-0.02em"
          >
            {score}
          </Text>
        </Box>

        {/* Bottom: actions count + CTA */}
        <Flex justify="space-between" align="center">
          <Text fontSize="2xs" color="gray.600">
            {match.actionsCount > 0 ? `${match.actionsCount} ações` : 'Sem scout'}
          </Text>
          {match.actionsCount > 0 && (
            <Flex align="center" gap={1} color="gray.500">
              <Text fontSize="2xs" fontWeight="medium">
                Ver relatório
              </Text>
              <MdArrowForward size={12} />
            </Flex>
          )}
        </Flex>
      </Box>
    </Link>
  )
}

export default function RecentGames({ matches }: { matches: MatchSummary[] }) {
  // Prioritize matches with scout data, then fill with rest
  const withActions = matches.filter(m => m.actionsCount > 0)
  const withoutActions = matches.filter(m => m.actionsCount === 0)
  const recent = [...withActions, ...withoutActions].slice(0, 6)

  if (recent.length === 0) {
    return null
  }

  return (
    <Box mb={4}>
      <Flex justify="space-between" align="center" mb={3}>
        <Text fontSize="sm" fontWeight="bold" color="white">
          Últimos Jogos
        </Text>
        <Link href="/history">
          <Flex
            align="center"
            gap={1}
            cursor="pointer"
            _hover={{ color: 'blue.400' }}
            transition="all 0.15s"
          >
            <Text fontSize="xs" color="gray.500" fontWeight="medium">
              Ver todos
            </Text>
            <MdArrowForward size={14} color="currentColor" />
          </Flex>
        </Link>
      </Flex>

      <Grid
        templateColumns={{ base: '1fr', sm: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }}
        gap={3}
      >
        {recent.map((match) => (
          <MatchCard key={match.id} match={match} />
        ))}
      </Grid>
    </Box>
  )
}
