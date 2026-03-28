'use client';
import React, { useState, useMemo } from 'react';
import {
  Box,
  Table,
  Thead,
  Tbody,
  Tr,
  Th,
  Td,
  Text,
  Flex,
  Heading,
  Tooltip,
  Badge,
  Grid,
  useBreakpointValue,
} from '@chakra-ui/react';
import { PlayerStats } from '@/types/scout';
import { PlayerVP, formatVP, PlayerRating, getRatingChakraColor } from '@/utils/stats';
import { ACTION_NAMES, METRIC_LABELS } from '@/lib/actionLabels';

interface PlayerInfo {
  name: string;
  number: string;
  position: string;
}

type SortField = 'vp' | 'points' | 'name' | 'rating';
type SortDir = 'asc' | 'desc';

interface PlayerStatsTableProps {
  stats: PlayerStats[];
  playerInfo: Record<string, PlayerInfo>;
  /** Dados V-P por playerId. Se ausente, coluna V-P não aparece. */
  vpData?: Record<string, PlayerVP>;
  /** Dados de rating por playerId. Se ausente, coluna Nota não aparece. */
  ratingData?: Record<string, PlayerRating>;
}

function vpColor(balance: number): string {
  if (balance > 0) return 'green.300';
  if (balance < 0) return 'red.300';
  return 'gray.400';
}

function buildVPTooltip(vp: PlayerVP): string {
  const won = [];
  if (vp.breakdown.kills > 0) won.push(`${vp.breakdown.kills} ataques`);
  if (vp.breakdown.aces > 0) won.push(`${vp.breakdown.aces} ptos diretos`);
  if (vp.breakdown.blockPoints > 0) won.push(`${vp.breakdown.blockPoints} bloqueios`);

  const lost = [];
  if (vp.breakdown.serveErrors > 0) lost.push(`${vp.breakdown.serveErrors} erro saque`);
  if (vp.breakdown.attackErrors > 0) lost.push(`${vp.breakdown.attackErrors} erro ataque`);
  if (vp.breakdown.attackBlocked > 0) lost.push(`${vp.breakdown.attackBlocked} bloqueado`);
  if (vp.breakdown.receptionErrors > 0) lost.push(`${vp.breakdown.receptionErrors} erro recepção`);
  if (vp.breakdown.blockErrors > 0) lost.push(`${vp.breakdown.blockErrors} erro bloqueio`);

  const wonStr = won.length > 0 ? won.join(', ') : 'nenhum';
  const lostStr = lost.length > 0 ? lost.join(', ') : 'nenhum';

  return `Ganhos: ${vp.pointsWon} (${wonStr})\nPerdidos: ${vp.pointsLost} (${lostStr})`;
}

function buildRatingTooltip(rating: PlayerRating): string {
  const lines = [`Nota: ${rating.friendlyRating.toFixed(1)} (${rating.technicalRating >= 0 ? '+' : ''}${rating.technicalRating.toFixed(2)})`];
  for (const [fund, data] of Object.entries(rating.ratingByFundamental)) {
    const name = ACTION_NAMES[fund] || fund;
    lines.push(`${name}: ${data.friendly.toFixed(1)} (${data.count})`);
  }
  return lines.join('\n');
}

export function PlayerStatsTable({ stats, playerInfo, vpData, ratingData }: PlayerStatsTableProps) {
  const hasVP = !!vpData && Object.keys(vpData).length > 0;
  const hasRating = !!ratingData && Object.keys(ratingData).length > 0;
  const isMobile = useBreakpointValue({ base: true, md: false });

  const defaultSort: SortField = hasRating ? 'rating' : hasVP ? 'vp' : 'points';
  const [sortField, setSortField] = useState<SortField>(defaultSort);
  const [sortDir, setSortDir] = useState<SortDir>('desc');

  const handleSort = (field: SortField) => {
    if (sortField === field) {
      setSortDir(sortDir === 'desc' ? 'asc' : 'desc');
    } else {
      setSortField(field);
      setSortDir('desc');
    }
  };

  // Encontrar MVP (maior nota)
  const mvpPlayerId = useMemo(() => {
    if (!hasRating) return null;
    let bestId: string | null = null;
    let bestRating = -Infinity;
    for (const [pid, r] of Object.entries(ratingData!)) {
      if (r.friendlyRating > bestRating) {
        bestRating = r.friendlyRating;
        bestId = pid;
      }
    }
    return bestId;
  }, [ratingData, hasRating]);

  const sortedStats = useMemo(() => {
    const sorted = [...stats];
    const dir = sortDir === 'desc' ? -1 : 1;
    sorted.sort((a, b) => {
      switch (sortField) {
        case 'rating': {
          const rA = ratingData?.[a.playerId]?.friendlyRating ?? 0;
          const rB = ratingData?.[b.playerId]?.friendlyRating ?? 0;
          return (rA - rB) * dir;
        }
        case 'vp': {
          const vpA = vpData?.[a.playerId]?.balance ?? 0;
          const vpB = vpData?.[b.playerId]?.balance ?? 0;
          return (vpA - vpB) * dir;
        }
        case 'points':
          return (a.points - b.points) * dir;
        case 'name': {
          const nameA = playerInfo[a.playerId]?.name ?? '';
          const nameB = playerInfo[b.playerId]?.name ?? '';
          return nameA.localeCompare(nameB) * dir;
        }
        default:
          return 0;
      }
    });
    return sorted;
  }, [stats, sortField, sortDir, vpData, ratingData, playerInfo]);

  const sortIndicator = (field: SortField) => {
    if (sortField !== field) return '';
    return sortDir === 'desc' ? ' ▼' : ' ▲';
  };

  return (
    <Box
      w="full"
      bg="gray.800"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.700"
      overflow="hidden"
    >
      <Box p={4} borderBottomWidth="1px" borderColor="gray.700">
        <Heading size="md" color="white">Estatísticas dos Atletas</Heading>
      </Box>

      {isMobile ? (
        <Grid templateColumns="1fr" gap={3} p={4}>
          {sortedStats.map((stat) => {
            const info = playerInfo[stat.playerId] || { name: METRIC_LABELS.unknown_player, number: '?', position: '?' };
            const vp = vpData?.[stat.playerId];
            const rating = ratingData?.[stat.playerId];
            const isMVP = mvpPlayerId === stat.playerId;
            return (
              <Box key={stat.playerId} bg="gray.900" borderRadius="xl" borderWidth="1px" borderColor="gray.700/60" overflow="hidden">
                {/* Header do card */}
                <Flex align="center" gap={3} px={4} py={3} borderBottomWidth="1px" borderColor="gray.700/60">
                  <Text color="gray.400" fontWeight="bold" fontSize="sm" minW="28px">#{info.number}</Text>
                  <Box flex="1" minW={0}>
                    <Flex align="center" gap={2}>
                      <Text color="white" fontWeight="bold" fontSize="sm" noOfLines={1}>{info.name}</Text>
                      {isMVP && <Badge colorScheme="yellow" fontSize="2xs" variant="solid">MVP</Badge>}
                    </Flex>
                    <Text color="gray.500" fontSize="2xs">{info.position} · {stat.setsPlayed} sets</Text>
                  </Box>
                  {hasRating && rating && (
                    <Text fontSize="xl" fontWeight="black" color={getRatingChakraColor(rating.friendlyRating)}>
                      {rating.friendlyRating.toFixed(1)}
                    </Text>
                  )}
                </Flex>
                {/* Métricas em grid 3 colunas */}
                <Grid templateColumns="repeat(3, 1fr)" gap={0}>
                  {hasVP && vp && (
                    <Flex direction="column" align="center" py={3} borderRightWidth="1px" borderColor="gray.700/60">
                      <Text fontSize="lg" fontWeight="black" color={vpColor(vp.balance)}>{formatVP(vp.balance)}</Text>
                      <Text fontSize="2xs" color="gray.500" textTransform="uppercase">V-P</Text>
                    </Flex>
                  )}
                  <Flex direction="column" align="center" py={3} borderRightWidth="1px" borderColor="gray.700/60">
                    <Text fontSize="lg" fontWeight="black" color="yellow.300">{stat.points}</Text>
                    <Text fontSize="2xs" color="gray.500" textTransform="uppercase">Pts</Text>
                  </Flex>
                  <Flex direction="column" align="center" py={3} borderRightWidth="1px" borderColor="gray.700/60">
                    <Text fontSize="lg" fontWeight="black" color="green.300">{stat.attack.kills}</Text>
                    <Text fontSize="2xs" color="gray.500" textTransform="uppercase">Kills</Text>
                  </Flex>
                  <Flex direction="column" align="center" py={3}>
                    <Text fontSize="sm" fontWeight="bold" color={stat.attack.efficiency > 0.3 ? 'green.300' : stat.attack.efficiency < 0 ? 'red.300' : 'gray.400'}>
                      {(stat.attack.efficiency * 100).toFixed(0)}%
                    </Text>
                    <Text fontSize="2xs" color="gray.500" textTransform="uppercase">Ef. ATK</Text>
                  </Flex>
                  <Flex direction="column" align="center" py={3} borderLeftWidth="1px" borderColor="gray.700/60">
                    <Text fontSize="sm" fontWeight="bold" color="green.300">{stat.serve.aces}</Text>
                    <Text fontSize="2xs" color="gray.500" textTransform="uppercase">Aces</Text>
                  </Flex>
                  {stat.reception.total > 0 && (
                    <Flex direction="column" align="center" py={3} borderLeftWidth="1px" borderColor="gray.700/60">
                      <Text fontSize="sm" fontWeight="bold" color="gray.300">
                        {(stat.reception.positivity * 100).toFixed(0)}%
                      </Text>
                      <Text fontSize="2xs" color="gray.500" textTransform="uppercase">Rec+</Text>
                    </Flex>
                  )}
                </Grid>
              </Box>
            );
          })}
        </Grid>
      ) : (
      <Box overflowX="auto">
        <Table variant="simple" size="sm">
          <Thead bg="gray.900">
            <Tr>
              <Th
                color="gray.400"
                position="sticky"
                left={0}
                bg="gray.900"
                zIndex={1}
                cursor="pointer"
                onClick={() => handleSort('name')}
                _hover={{ color: 'white' }}
              >
                Atleta{sortIndicator('name')}
              </Th>
              <Th color="gray.400" textAlign="center">Sets</Th>
              <Th
                color="gray.400"
                textAlign="center"
                borderLeftWidth="1px"
                borderColor="gray.700"
                cursor="pointer"
                onClick={() => handleSort('points')}
                _hover={{ color: 'white' }}
              >
                Pts{sortIndicator('points')}
              </Th>

              {/* Coluna V-P */}
              {hasVP && (
                <Th
                  color="gray.400"
                  textAlign="center"
                  borderLeftWidth="1px"
                  borderColor="gray.700"
                  cursor="pointer"
                  onClick={() => handleSort('vp')}
                  _hover={{ color: 'white' }}
                  bg="whiteAlpha.50"
                >
                  V-P{sortIndicator('vp')}
                </Th>
              )}

              {/* Coluna Nota */}
              {hasRating && (
                <Th
                  color="gray.400"
                  textAlign="center"
                  borderLeftWidth="1px"
                  borderColor="gray.700"
                  cursor="pointer"
                  onClick={() => handleSort('rating')}
                  _hover={{ color: 'white' }}
                  bg="whiteAlpha.50"
                >
                  Nota{sortIndicator('rating')}
                </Th>
              )}

              <Th colSpan={4} color="gray.400" textAlign="center" borderLeftWidth="1px" borderColor="gray.700" bg="whiteAlpha.50">Ataque</Th>
              <Th colSpan={3} color="gray.400" textAlign="center" borderLeftWidth="1px" borderColor="gray.700" bg="whiteAlpha.50">Levantamento</Th>
              <Th color="gray.400" textAlign="center" borderLeftWidth="1px" borderColor="gray.700" bg="whiteAlpha.50">Bloqueio</Th>
              <Th colSpan={2} color="gray.400" textAlign="center" borderLeftWidth="1px" borderColor="gray.700" bg="whiteAlpha.50">Saque</Th>
              <Th colSpan={2} color="gray.400" textAlign="center" borderLeftWidth="1px" borderColor="gray.700" bg="whiteAlpha.50">Recepção</Th>
            </Tr>
            <Tr>
              <Th position="sticky" left={0} bg="gray.900"></Th>
              <Th></Th>
              <Th textAlign="center" borderLeftWidth="1px" borderColor="gray.700" fontSize="xs" color="gray.500">Tot</Th>

              {/* Sub-header V-P */}
              {hasVP && (
                <Th textAlign="center" borderLeftWidth="1px" borderColor="gray.700" fontSize="xs" color="gray.500">Saldo</Th>
              )}

              {/* Sub-header Nota */}
              {hasRating && (
                <Th textAlign="center" borderLeftWidth="1px" borderColor="gray.700" fontSize="xs" color="gray.500">0-10</Th>
              )}

              {/*  Attack */}
              <Th textAlign="center" borderLeftWidth="1px" borderColor="gray.700" fontSize="xs" color="gray.500">Tot</Th>
              <Th textAlign="center" fontSize="xs" color="gray.500">{METRIC_LABELS.attack_wins}</Th>
              <Th textAlign="center" fontSize="xs" color="gray.500">{METRIC_LABELS.attack_errors}</Th>
              <Th textAlign="center" fontSize="xs" color="gray.500">{METRIC_LABELS.attack_percent}</Th>

              {/* Set */}
              <Th textAlign="center" borderLeftWidth="1px" borderColor="gray.700" fontSize="xs" color="gray.500">{METRIC_LABELS.total}</Th>
              <Th textAlign="center" fontSize="xs" color="gray.500">{METRIC_LABELS.set_excellent}</Th>
              <Th textAlign="center" fontSize="xs" color="gray.500">{METRIC_LABELS.set_errors}</Th>

              {/* Block */}
              <Th textAlign="center" borderLeftWidth="1px" borderColor="gray.700" fontSize="xs" color="gray.500">{METRIC_LABELS.block_points}</Th>

              {/* Serve */}
              <Th textAlign="center" borderLeftWidth="1px" borderColor="gray.700" fontSize="xs" color="gray.500">{METRIC_LABELS.serve_ace}</Th>
              <Th textAlign="center" fontSize="xs" color="gray.500">{METRIC_LABELS.serve_errors}</Th>

              {/* Reception */}
              <Th textAlign="center" borderLeftWidth="1px" borderColor="gray.700" fontSize="xs" color="gray.500">Pos%</Th>
              <Th textAlign="center" fontSize="xs" color="gray.500">Prf%</Th>
            </Tr>
          </Thead>
          <Tbody>
            {sortedStats.map((stat) => {
              const info = playerInfo[stat.playerId] || { name: METRIC_LABELS.unknown_player, number: '?', position: '?' };
              const vp = vpData?.[stat.playerId];
              const rating = ratingData?.[stat.playerId];
              const isMVP = mvpPlayerId === stat.playerId;
              return (
                <Tr key={stat.playerId} _hover={{ bg: 'whiteAlpha.50' }}>
                  <Td position="sticky" left={0} bg="gray.800" _groupHover={{ bg: 'gray.700' }} borderRightWidth="1px" borderColor="gray.700">
                    <Flex direction="column">
                      <Flex align="center" gap={2}>
                        <Text color="white" fontWeight="bold">#{info.number} {info.name}</Text>
                        {isMVP && (
                          <Badge colorScheme="yellow" fontSize="2xs" variant="solid">MVP</Badge>
                        )}
                      </Flex>
                      <Text fontSize="xs" color="gray.500">{info.position}</Text>
                    </Flex>
                  </Td>
                  <Td textAlign="center" color="gray.300">{stat.setsPlayed}</Td>
                  <Td textAlign="center" fontWeight="bold" color="yellow.300" borderLeftWidth="1px" borderColor="gray.700">{stat.points}</Td>

                  {/* Célula V-P */}
                  {hasVP && vp && (
                    <Td
                      textAlign="center"
                      fontWeight="bold"
                      fontSize="md"
                      color={vpColor(vp.balance)}
                      borderLeftWidth="1px"
                      borderColor="gray.700"
                      cursor="default"
                    >
                      <Tooltip
                        label={buildVPTooltip(vp)}
                        placement="top"
                        bg="gray.900"
                        color="gray.200"
                        fontSize="xs"
                        px={3}
                        py={2}
                        borderRadius="lg"
                        whiteSpace="pre-line"
                        hasArrow
                      >
                        <span>{formatVP(vp.balance)}</span>
                      </Tooltip>
                    </Td>
                  )}
                  {hasVP && !vp && (
                    <Td textAlign="center" borderLeftWidth="1px" borderColor="gray.700" color="gray.500">-</Td>
                  )}

                  {/* Célula Nota */}
                  {hasRating && rating && (
                    <Td
                      textAlign="center"
                      fontWeight="bold"
                      fontSize="md"
                      color={getRatingChakraColor(rating.friendlyRating)}
                      borderLeftWidth="1px"
                      borderColor="gray.700"
                      cursor="default"
                    >
                      <Tooltip
                        label={buildRatingTooltip(rating)}
                        placement="top"
                        bg="gray.900"
                        color="gray.200"
                        fontSize="xs"
                        px={3}
                        py={2}
                        borderRadius="lg"
                        whiteSpace="pre-line"
                        hasArrow
                      >
                        <span>{rating.friendlyRating.toFixed(1)}</span>
                      </Tooltip>
                    </Td>
                  )}
                  {hasRating && !rating && (
                    <Td textAlign="center" borderLeftWidth="1px" borderColor="gray.700" color="gray.500">-</Td>
                  )}

                  {/* Attack */}
                  <Td textAlign="center" borderLeftWidth="1px" borderColor="gray.700" color="gray.300">{stat.attack.total}</Td>
                  <Td textAlign="center" color="green.300" fontWeight="bold">{stat.attack.kills}</Td>
                  <Td textAlign="center" color="red.300">{stat.attack.errors + stat.attack.blocked}</Td>
                  <Td textAlign="center" fontWeight="mono" color={stat.attack.efficiency > 0.3 ? 'green.300' : stat.attack.efficiency < 0 ? 'red.300' : 'gray.400'}>
                    {(stat.attack.efficiency * 100).toFixed(0)}%
                  </Td>

                  {/* Set */}
                  <Td textAlign="center" borderLeftWidth="1px" borderColor="gray.700" color="gray.300">
                    {stat.set.total > 0 ? stat.set.total : '-'}
                  </Td>
                  <Td textAlign="center" color="green.300">
                     {stat.set.total > 0 ? stat.set.perfect : '-'}
                  </Td>
                  <Td textAlign="center" color="red.300">
                     {stat.set.total > 0 && stat.set.errors > 0 ? stat.set.errors : '-'}
                  </Td>

                  {/* Block */}
                  <Td textAlign="center" borderLeftWidth="1px" borderColor="gray.700" color="white">{stat.block.points}</Td>

                  {/* Serve */}
                  <Td textAlign="center" borderLeftWidth="1px" borderColor="gray.700" color="green.300">{stat.serve.aces}</Td>
                  <Td textAlign="center" color="red.300">{stat.serve.errors}</Td>

                  {/* Reception */}
                  <Td textAlign="center" borderLeftWidth="1px" borderColor="gray.700" color="gray.300">
                    {stat.reception.total > 0 ? (stat.reception.positivity * 100).toFixed(0) + '%' : '-'}
                  </Td>
                  <Td textAlign="center" color="gray.300">
                    {stat.reception.total > 0 ? (stat.reception.perfectRate * 100).toFixed(0) + '%' : '-'}
                  </Td>
                </Tr>
              );
            })}
          </Tbody>
        </Table>
      </Box>
      )}
    </Box>
  );
}
