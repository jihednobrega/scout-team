'use client';

import React from 'react';
import {
  Box, Flex, Heading, Text, SimpleGrid, Card, CardBody, Badge,
  Spinner, Alert, AlertIcon, AlertTitle, AlertDescription, Button,
} from '@chakra-ui/react';
import { MdArrowForward, MdSportsTennis } from 'react-icons/md';
import Link from 'next/link';
import { useTeamContext } from '@/contexts/TeamContext';
import { useMatchesList } from '@/hooks/useMatchesAPI';

export default function ReportsIndexPage() {
  const { selectedTeamId } = useTeamContext();
  const { matches, loading, error, refetch } = useMatchesList(selectedTeamId);

  if (loading) {
    return (
      <Flex minH="60vh" align="center" justify="center" direction="column">
        <Spinner size="xl" color="blue.500" mb={4} />
        <Text color="gray.400">Carregando histórico de partidas...</Text>
      </Flex>
    );
  }

  if (error) {
    return (
      <Flex minH="60vh" align="center" justify="center" p={8}>
        <Alert status="error" borderRadius="xl" maxW="md" flexDirection="column" alignItems="center" textAlign="center">
          <AlertIcon boxSize="40px" mr={0} mb={3} />
          <AlertTitle mb={2}>Erro ao carregar partidas</AlertTitle>
          <AlertDescription mb={4}>{error}</AlertDescription>
          <Button onClick={refetch} colorScheme="red" size="sm">Tentar novamente</Button>
        </Alert>
      </Flex>
    );
  }

  return (
    <Box>
      <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align="center" mb={6}>
        <Box mb={{ base: 4, md: 0 }}>
          <Heading size="lg" color="white" mb={2}>Relatórios de Partidas</Heading>
          <Text color="gray.400">
            Histórico de jogos e scouts registrados.
          </Text>
        </Box>
      </Flex>

      {matches.length === 0 ? (
        <Flex
          direction="column"
          align="center"
          justify="center"
          minH="40vh"
          bg="gray.800"
          borderRadius="xl"
          borderWidth="1px"
          borderColor="gray.700"
          p={10}
        >
          <Box as={MdSportsTennis} fontSize="4xl" color="gray.600" mb={4} />
          <Heading size="md" color="gray.400" mb={2}>Nenhuma partida registrada</Heading>
          <Text color="gray.500" textAlign="center" maxW="sm">
            Registre saques, ataques e recepções durante um jogo para gerar relatórios detalhados.
          </Text>
          <Link href="/game">
            <Button mt={6} colorScheme="blue" variant="solid">
              Iniciar Scout
            </Button>
          </Link>
        </Flex>
      ) : (
        <SimpleGrid columns={{ base: 1, md: 2, lg: 3 }} spacing={6}>
          {matches.map((match) => {
            const isVictory = match.result === 'vitoria';
            const dateFormatted = match.date instanceof Date
              ? match.date.toLocaleDateString('pt-BR')
              : new Date(match.date).toLocaleDateString('pt-BR');

            return (
              <Link href={`/reports/${match.id}`} key={match.id}>
                <Card
                  bg="gray.800"
                  borderColor="gray.700"
                  borderWidth="1px"
                  borderRadius="xl"
                  _hover={{ bg: 'gray.700', transform: 'translateY(-2px)', transition: 'all 0.2s' }}
                  transition="all 0.2s"
                  cursor="pointer"
                >
                  <CardBody>
                    <Flex justify="space-between" align="center" mb={4}>
                      <Badge
                        colorScheme={isVictory ? 'green' : 'red'}
                        variant="solid"
                        px={2}
                        borderRadius="full"
                      >
                        {isVictory ? 'Vitória' : 'Derrota'}
                      </Badge>
                      <Text fontSize="xs" color="gray.400">{dateFormatted}</Text>
                    </Flex>

                    <Flex justify="center" align="center" mb={4} gap={3}>
                      <Text fontWeight="bold" color="white" fontSize="lg" textAlign="center">
                        {match.score}
                      </Text>
                    </Flex>

                    <Text color="gray.300" fontSize="sm" textAlign="center" mb={4}>
                      vs <Text as="span" fontWeight="semibold" color="white">{match.opponent}</Text>
                    </Text>

                    {match.tournament && (
                      <Text fontSize="xs" color="gray.500" textAlign="center" mb={3}>
                        {match.tournament}
                      </Text>
                    )}

                    <Flex justify="space-between" align="center" borderTopWidth="1px" borderColor="gray.700" pt={4}>
                      <Text fontSize="xs" color="gray.500">
                        {match.location || 'Local não informado'}
                      </Text>
                      <Flex align="center" color="blue.400" fontSize="sm" fontWeight="semibold">
                        Ver Detalhes <Box as={MdArrowForward} ml={1} />
                      </Flex>
                    </Flex>
                  </CardBody>
                </Card>
              </Link>
            );
          })}
        </SimpleGrid>
      )}
    </Box>
  );
}
