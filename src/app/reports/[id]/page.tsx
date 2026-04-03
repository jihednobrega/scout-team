'use client';

import React, { useMemo, useRef } from 'react';
import { MatchSummary } from '@/components/reports/MatchSummary';
import { PlayerStatsTable } from '@/components/reports/PlayerStatsTable';
import ReceptionAttackAnalysis from '@/components/reports/ReceptionAttackAnalysis';
import SetterDistribution from '@/components/reports/SetterDistribution';
import MacroEfficiency from '@/components/reports/MacroEfficiency';
import AttackHeatmap from '@/components/statistics/AttackHeatmap';
import ServeHeatmap from '@/components/statistics/ServeHeatmap';
import ServeTypeAnalysis from '@/components/reports/ServeTypeAnalysis';
import AIStreamingPanel from '@/components/ai/AIStreamingPanel';
import {
  Box, Button, Flex, Heading, Text, VStack, Grid, Spinner,
  useToast, Alert, AlertIcon, AlertTitle, AlertDescription,
  Drawer, DrawerOverlay, DrawerContent, DrawerHeader, DrawerBody, DrawerCloseButton,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay,
  Badge, Icon, useDisclosure,
} from '@chakra-ui/react';
import { MdArrowBack, MdPictureAsPdf } from 'react-icons/md';
import { IoSparkles } from 'react-icons/io5';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { usePlayersAPI } from '@/hooks/usePlayersAPI';
import { useMatchDetail } from '@/hooks/useMatchesAPI';
import { useTeamContext } from '@/contexts/TeamContext';
import {
  calculatePlayerStats,
  calculatePlayerVP, PlayerVP,
  calculatePlayerRating, PlayerRating,
} from '@/utils/stats';

export default function MatchReportPage() {
  const params = useParams();
  const matchId = params.id as string;

  const { selectedTeamId } = useTeamContext();
  const { players, loading: loadingPlayers } = usePlayersAPI(selectedTeamId);
  const { match, actions, loading: loadingMatch, error } = useMatchDetail(matchId);

  const [exportingPdf, setExportingPdf] = React.useState(false);
  const [hasCachedInsight, setHasCachedInsight] = React.useState(false);
  const [autoGenerate, setAutoGenerate] = React.useState(false);
  const [drawerKey, setDrawerKey] = React.useState(0);

  const { isOpen: isDrawerOpen, onOpen: onDrawerOpen, onClose: onDrawerClose } = useDisclosure();
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure();
  const confirmCancelRef = useRef<HTMLButtonElement>(null);

  const toast = useToast();

  // Verifica cache ao carregar a página
  React.useEffect(() => {
    if (!selectedTeamId || !matchId) return;
    const params = new URLSearchParams({ type: 'match_analysis', teamId: selectedTeamId, matchId });
    fetch(`/api/ai/insights?${params}`)
      .then(r => r.json())
      .then(data => setHasCachedInsight(!!data.found))
      .catch(() => {});
  }, [selectedTeamId, matchId]);

  // ─── Player info map (id → { name, number, position }) ───────────────────
  const playerInfoMap = useMemo(() => {
    const map: Record<string, { name: string; number: string; position: string }> = {};
    players.forEach((p) => {
      map[p.id] = {
        name: p.name,
        number: p.jerseyNumber.toString(),
        position: p.position,
      };
    });
    return map;
  }, [players]);

  // ─── Unique player IDs from actions ──────────────────────────────────────
  const playerIds = useMemo(
    () => [...new Set(actions.filter(a => a.action !== 'opponent_error').map((a) => a.player))],
    [actions]
  );

  // ─── PlayerStats calculadas a partir das ScoutActions reais ──────────────
  const playerStats = useMemo(
    () => playerIds.map((pid) => calculatePlayerStats(pid, actions, 1)),
    [playerIds, actions]
  );

  // ─── V-P por jogador ──────────────────────────────────────────────────────
  const vpData = useMemo(() => {
    const map: Record<string, PlayerVP> = {};
    playerIds.forEach((pid) => {
      map[pid] = calculatePlayerVP(actions, pid);
    });
    return map;
  }, [playerIds, actions]);

  // ─── Rating por jogador ───────────────────────────────────────────────────
  const ratingData = useMemo(() => {
    const map: Record<string, PlayerRating> = {};
    playerIds.forEach((pid) => {
      map[pid] = calculatePlayerRating(actions, pid);
    });
    return map;
  }, [playerIds, actions]);

  // ─── Score derivado do campo finalScore e sets ────────────────────────────
  const score = useMemo(() => {
    if (!match) return { home: 0, away: 0, sets: [] };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    const rawSets: any[] = match.sets || [];
    const setsFormatted = rawSets.map((s) => {
      if (typeof s === 'object' && 'home' in s) return { home: s.home, away: s.away };
      if (typeof s === 'object' && 'homeScore' in s) return { home: s.homeScore, away: s.awayScore };
      if (typeof s === 'object' && 'score' in s) {
        const parts = String(s.score).split('-');
        return { home: Number(parts[0]) || 0, away: Number(parts[1]) || 0 };
      }
      return { home: 0, away: 0 };
    });

    const homeSets = setsFormatted.filter((s) => s.home > s.away).length;
    const awaySets = setsFormatted.filter((s) => s.away > s.home).length;

    return { home: homeSets, away: awaySets, sets: setsFormatted };
  }, [match]);

  // ─── Exportar PDF ─────────────────────────────────────────────────────────
  const handleExportPdf = async () => {
    setExportingPdf(true);
    try {
      const res = await fetch(`/api/reports/${matchId}/pdf`);
      if (!res.ok) throw new Error('Falha ao gerar PDF');
      const blob = await res.blob();
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download =
        res.headers.get('Content-Disposition')?.match(/filename="(.+)"/)?.[1] || 'relatorio.pdf';
      document.body.appendChild(a);
      a.click();
      a.remove();
      URL.revokeObjectURL(url);
      toast({ title: 'PDF exportado com sucesso!', status: 'success', duration: 3000 });
    } catch {
      toast({ title: 'Erro ao exportar PDF', status: 'error', duration: 4000 });
    } finally {
      setExportingPdf(false);
    }
  };

  // ─── Abrir análise IA ─────────────────────────────────────────────────────
  const handleOpenAI = () => {
    if (!selectedTeamId) return;
    if (hasCachedInsight) {
      // Já sabe que tem cache — abre o drawer direto
      setAutoGenerate(false);
      setDrawerKey(k => k + 1);
      onDrawerOpen();
    } else {
      // Sem cache — pede confirmação antes de gerar
      onConfirmOpen();
    }
  };

  const handleConfirmGenerate = () => {
    onConfirmClose();
    setAutoGenerate(true);
    setDrawerKey(k => k + 1);
    setHasCachedInsight(true);
    onDrawerOpen();
  };

  // ─── Loading ──────────────────────────────────────────────────────────────
  if (loadingMatch || loadingPlayers) {
    return (
      <Flex minH="60vh" align="center" justify="center" direction="column">
        <Spinner size="xl" color="blue.500" mb={4} />
        <Text color="gray.400">Carregando relatório da partida...</Text>
      </Flex>
    );
  }

  // ─── Error / Not Found ────────────────────────────────────────────────────
  if (error || !match) {
    return (
      <Flex minH="60vh" align="center" justify="center" p={8}>
        <Alert
          status="error"
          borderRadius="xl"
          maxW="md"
          flexDirection="column"
          alignItems="center"
          textAlign="center"
        >
          <AlertIcon boxSize="40px" mr={0} mb={3} />
          <AlertTitle mb={2}>Partida não encontrada</AlertTitle>
          <AlertDescription mb={4}>
            {error || 'Não foi possível carregar os dados desta partida.'}
          </AlertDescription>
          <Link href="/reports">
            <Button colorScheme="red" size="sm">Voltar para Lista</Button>
          </Link>
        </Alert>
      </Flex>
    );
  }

  const dateFormatted =
    match.date instanceof Date
      ? match.date.toLocaleDateString('pt-BR')
      : new Date(match.date).toLocaleDateString('pt-BR');

  const durationStr = match.duration ? `${match.duration} min` : 'Duração não registrada';

  return (
    <Box>
      <Link href="/reports">
        <Button
          leftIcon={<MdArrowBack />}
          variant="ghost"
          colorScheme="gray"
          color="gray.400"
          mb={4}
          _hover={{ color: 'white', bg: 'gray.800' }}
        >
          Voltar para Lista
        </Button>
      </Link>

      <Flex direction={{ base: 'column', md: 'row' }} justify="space-between" align={{ base: 'stretch', md: 'center' }} mb={6} gap={4}>
        <Box>
          <Heading size="lg" color="white" mb={1}>
            {match.homeTeam} vs {match.awayTeam}
          </Heading>
          <Text color="gray.400" fontSize="sm">
            Relatório detalhado do jogo realizado em {dateFormatted}.
            {match.tournament && ` • ${match.tournament}`}
            {match.location && ` • ${match.location}`}
          </Text>
        </Box>
        <Flex gap={3} flexShrink={0}>
          {actions.length > 0 && selectedTeamId && (
            <Button
              leftIcon={<Icon as={IoSparkles} />}
              colorScheme="purple"
              variant={hasCachedInsight ? 'solid' : 'outline'}
              size="md"
              onClick={handleOpenAI}
            >
              {hasCachedInsight ? 'Ver análise IA' : 'Analisar com IA'}
            </Button>
          )}
          <Button
            leftIcon={<MdPictureAsPdf />}
            colorScheme="blue"
            variant="solid"
            onClick={handleExportPdf}
            isLoading={exportingPdf}
            loadingText="Gerando PDF..."
            size="md"
            data-testid="btn-export-pdf"
          >
            Exportar relatório (PDF)
          </Button>
        </Flex>
      </Flex>

      <VStack spacing={6} align="stretch">
        <MatchSummary
          homeTeam={match.homeTeam}
          awayTeam={match.awayTeam}
          score={score}
          date={dateFormatted}
          duration={durationStr}
        />

        {actions.length > 0 && (
          <MacroEfficiency
            pointHistory={[]}
            scoutActions={actions}
          />
        )}

        {playerStats.length > 0 ? (
          <PlayerStatsTable
            stats={playerStats}
            playerInfo={playerInfoMap}
            vpData={vpData}
            ratingData={ratingData}
          />
        ) : (
          <Box
            bg="gray.800"
            borderRadius="xl"
            borderWidth="1px"
            borderColor="gray.700"
            p={8}
            textAlign="center"
          >
            <Text color="gray.400">
              Nenhuma ação de scout registrada nesta partida.
            </Text>
          </Box>
        )}

        {playerStats.filter((p) => p.attack.total >= 1).length > 0 && (
          <Box>
            <Heading size="md" color="white" mb={4}>Mapa de Ataque por Jogador</Heading>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={4}>
              {playerStats
                .filter((p) => p.attack.total >= 1)
                .map((p) => {
                  const info = playerInfoMap[p.playerId];
                  return (
                    <AttackHeatmap
                      key={p.playerId}
                      matchId={matchId}
                      defaultPlayerId={p.playerId}
                      compact
                      title={info ? `#${info.number} ${info.name}` : 'Jogador'}
                    />
                  );
                })}
            </Grid>
          </Box>
        )}

        {playerStats.filter((p) => p.serve.total >= 1).length > 0 && (
          <Box>
            <Heading size="md" color="white" mb={4}>Mapa de Saque por Jogador</Heading>
            <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)', lg: 'repeat(3, 1fr)' }} gap={4}>
              {playerStats
                .filter((p) => p.serve.total >= 1)
                .map((p) => {
                  const info = playerInfoMap[p.playerId];
                  return (
                    <ServeHeatmap
                      key={p.playerId}
                      matchId={matchId}
                      defaultPlayerId={p.playerId}
                      compact
                      title={info ? `#${info.number} ${info.name}` : 'Jogador'}
                    />
                  );
                })}
            </Grid>
          </Box>
        )}

        {actions.length > 0 && (
          <ServeTypeAnalysis
            actions={actions}
            matchId={matchId}
            playerInfo={playerInfoMap}
          />
        )}

        {actions.length > 0 && (
          <ReceptionAttackAnalysis
            actions={actions}
            matchId={matchId}
          />
        )}

        {actions.length > 0 && (
          <SetterDistribution
            actions={actions}
            matchId={matchId}
          />
        )}
      </VStack>

      {/* ── Drawer — Análise com IA ─────────────────────────────────────────── */}
      <Drawer
        isOpen={isDrawerOpen}
        placement="right"
        onClose={onDrawerClose}
        size="lg"
      >
        <DrawerOverlay />
        <DrawerContent bg="gray.900" borderLeftWidth="1px" borderColor="gray.700">
          <DrawerCloseButton color="gray.400" />
          <DrawerHeader borderBottomWidth="1px" borderColor="gray.700" pb={4}>
            <Flex align="center" gap={3}>
              <Icon as={IoSparkles} color="purple.400" boxSize={5} />
              <Box>
                <Text color="white" fontWeight="700" fontSize="lg">Análise com IA</Text>
                <Text color="gray.400" fontSize="xs" fontWeight="normal">
                  {match.homeTeam} vs {match.awayTeam} · {dateFormatted}
                </Text>
              </Box>
              <Badge colorScheme="purple" variant="subtle" ml="auto" mr={8}>Claude</Badge>
            </Flex>
          </DrawerHeader>
          <DrawerBody py={5}>
            {selectedTeamId && (
              <AIStreamingPanel
                key={drawerKey}
                type="match_analysis"
                teamId={selectedTeamId}
                matchId={matchId}
                embedded
                autoGenerate={autoGenerate}
              />
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* ── AlertDialog — Confirmação antes de gerar ───────────────────────── */}
      <AlertDialog
        isOpen={isConfirmOpen}
        leastDestructiveRef={confirmCancelRef}
        onClose={onConfirmClose}
        isCentered
      >
        <AlertDialogOverlay>
          <AlertDialogContent bg="gray.800" borderWidth="1px" borderColor="gray.700">
            <AlertDialogHeader color="white" fontSize="lg" fontWeight="bold">
              <Flex align="center" gap={2}>
                <Icon as={IoSparkles} color="purple.400" />
                Gerar análise com IA?
              </Flex>
            </AlertDialogHeader>
            <AlertDialogBody color="gray.300" fontSize="sm">
              O Claude vai analisar todos os dados desta partida e gerar um relatório detalhado.
              O resultado ficará salvo — nas próximas vezes será exibido instantaneamente.
            </AlertDialogBody>
            <AlertDialogFooter gap={3}>
              <Button ref={confirmCancelRef} variant="ghost" colorScheme="gray" onClick={onConfirmClose}>
                Cancelar
              </Button>
              <Button colorScheme="purple" leftIcon={<Icon as={IoSparkles} />} onClick={handleConfirmGenerate}>
                Gerar análise
              </Button>
            </AlertDialogFooter>
          </AlertDialogContent>
        </AlertDialogOverlay>
      </AlertDialog>
    </Box>
  );
}
