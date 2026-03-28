import React, { useState } from 'react';
import { 
  Box, 
  Text, 
  Badge, 
  Table, 
  Thead, 
  Tbody, 
  Tr, 
  Th, 
  Td, 
  Tabs, 
  TabList, 
  TabPanels, 
  Tab, 
  TabPanel,
  Collapse,
  VStack,
  Flex,
  Icon,
  Divider
} from '@chakra-ui/react';
import { MdExpandMore, MdExpandLess, MdSportsVolleyball } from 'react-icons/md';
import { PointHistory } from '@/utils/mockData';
import { getQualityLabel } from '@/lib/actionLabels';

interface PointHistoryLogProps {
  history: PointHistory[];
  homeTeam: string;
  awayTeam: string;
}

export function PointHistoryLog({ history, homeTeam, awayTeam }: PointHistoryLogProps) {
  const sets = Array.from(new Set(history.map(h => h.set))).sort((a, b) => a - b);
  const [expandedRow, setExpandedRow] = useState<number | null>(null);

  const toggleRow = (idx: number) => {
      setExpandedRow(expandedRow === idx ? null : idx);
  }

  return (
    <Box 
      w="full" 
      bg="gray.800" 
      borderRadius="xl" 
      borderWidth="1px" 
      borderColor="gray.700" 
      overflow="hidden"
      mt={8}
    >
      <Box p={4} borderBottomWidth="1px" borderColor="gray.700">
        <Text fontSize="lg" fontWeight="bold" color="white">Histórico Ponto-a-Ponto e Logs</Text>
        <Text fontSize="xs" color="gray.400">
          Clique em um ponto para ver a sequência completa de ações (Recepção, Levantamento, Defesa...)
        </Text>
      </Box>
      
      <Tabs isFitted variant="enclosed" colorScheme="blue" defaultIndex={0}>
        <TabList mb="1em" borderBottomColor="gray.700" bg="gray.900">
          {sets.map(setNum => (
            <Tab 
              key={setNum} 
              _selected={{ color: 'blue.300', borderColor: 'gray.700', borderBottomColor: 'gray.800', bg: 'gray.800' }}
              color="gray.400"
              borderColor="transparent"
              _hover={{ bg: 'whiteAlpha.50' }}
              fontWeight="bold"
              fontSize="sm"
            >
              Set {setNum}
            </Tab>
          ))}
        </TabList>

        <TabPanels>
          {sets.map(setNum => {
            const setPoints = history.filter(h => h.set === setNum);
            return (
              <TabPanel key={setNum} p={0}>
                <Box maxH="500px" overflowY="auto">
                  <Table variant="simple" size="sm">
                    <Thead position="sticky" top={0} bg="gray.800" zIndex={1}>
                      <Tr>
                        <Th color="gray.500" w="50px"></Th>
                        <Th color="gray.500" textAlign="center" w="80px">Placar</Th>
                        <Th color="gray.500">Descrição</Th>
                        <Th color="gray.500" textAlign="right">Ação Final</Th>
                      </Tr>
                    </Thead>
                    <Tbody>
                      {setPoints.map((point, idx) => {
                        const globalIdx = idx; // simplified for expansion logic per tab context usually but logic above uses simple index, might conflict if we switch tabs. 
                        // Actually, let's use a unique key combo for expansion or just reset.
                        // Better: Use composite key.
                        const isExpanded = expandedRow === idx; 

                        return (
                          <React.Fragment key={idx}>
                            <Tr 
                                _hover={{ bg: 'whiteAlpha.50' }} 
                                cursor="pointer"
                                onClick={() => toggleRow(idx)}
                                bg={isExpanded ? 'whiteAlpha.50' : 'transparent'}
                            >
                              <Td>
                                  <Icon as={isExpanded ? MdExpandLess : MdExpandMore} color="gray.500" />
                              </Td>
                              <Td textAlign="center">
                                <Badge 
                                  colorScheme={point.winner === 'home' ? 'green' : 'red'} 
                                  variant="subtle"
                                  fontSize="xs"
                                >
                                  {point.score.home} - {point.score.away}
                                </Badge>
                              </Td>
                              <Td color="gray.300" fontSize="sm">
                                {point.description}
                              </Td>
                              <Td textAlign="right">
                                <Badge variant="outline" colorScheme="gray" fontSize="xx-small">
                                  {point.endAction}
                                </Badge>
                              </Td>
                            </Tr>
                            {isExpanded && (
                                <Tr>
                                    <Td colSpan={4} p={0} borderBottom="none">
                                        <Box bg="gray.900" p={4} borderBottomWidth="1px" borderColor="gray.700">
                                            <VStack align="stretch" spacing={2}>
                                                <Text fontSize="xs" fontWeight="bold" color="gray.500" textTransform="uppercase">
                                                    Sequência do Rally
                                                </Text>
                                                {point.rallyActions.length === 0 ? (
                                                    <Text fontSize="xs" color="gray.500" fontStyle="italic">Sem registros detalhados para este rally.</Text>
                                                ) : (
                                                    point.rallyActions.map((action, i) => (
                                                        <Flex key={i} align="center" justify="space-between" fontSize="sm">
                                                            <Flex align="center" gap={2}>
                                                                <Badge variant="solid" colorScheme="blue" borderRadius="full" boxSize="5" display="flex" alignItems="center" justifyContent="center" fontSize="xs">
                                                                    {i + 1}
                                                                </Badge>
                                                                <Text color="gray.300">{action.action}</Text>
                                                                <Text color="gray.500" fontSize="xs">({action.playerName} #{action.playerNumber})</Text>
                                                            </Flex>
                                                            <Badge colorScheme={
                                                                action.quality === 'Perfect' || action.quality === 'Ace' || action.quality === 'Kill' ? 'green' :
                                                                action.quality === 'Error' ? 'red' : 'yellow'
                                                            }>
                                                                {getQualityLabel(action.quality)}
                                                            </Badge>
                                                        </Flex>
                                                    ))
                                                )}
                                            </VStack>
                                        </Box>
                                    </Td>
                                </Tr>
                            )}
                          </React.Fragment>
                        );
                      })}
                    </Tbody>
                  </Table>
                </Box>
              </TabPanel>
            );
          })}
        </TabPanels>
      </Tabs>
    </Box>
  );
}
