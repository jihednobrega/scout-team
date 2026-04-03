'use client'

import { useState, useEffect, useMemo, useRef } from 'react'
import {
  Box,
  Flex,
  Grid,
  Heading,
  Text,
  Button,
  Spinner,
  Badge,
  Icon,
  useDisclosure,
  Drawer, DrawerOverlay, DrawerContent, DrawerHeader, DrawerBody, DrawerCloseButton,
  AlertDialog, AlertDialogBody, AlertDialogFooter, AlertDialogHeader,
  AlertDialogContent, AlertDialogOverlay,
} from '@chakra-ui/react'
import { PlayerStatistics, StatisticsFilters } from '@/types/statistics'
import { usePlayersAPI } from '@/hooks/usePlayersAPI'
import { useTeamContext } from '@/contexts/TeamContext'
import PlayerStatsTable from '@/components/statistics/PlayerStatsTable'
import StrategicCharts from '@/components/statistics/StrategicCharts'
import PatternInsights from '@/components/statistics/PatternInsights'
import AttackHeatmap from '@/components/statistics/AttackHeatmap'
import ServeHeatmap from '@/components/statistics/ServeHeatmap'
import KPICards from '@/components/statistics/KPICards'
import { MdInsights, MdGridOn, MdMap, MdTableChart } from 'react-icons/md'
import { IoSparkles } from 'react-icons/io5'
import AIStreamingPanel from '@/components/ai/AIStreamingPanel'

interface RotationStat {
  rotation: number
  totalPoints: number
  pointsWon: number
  pointsLost: number
  winRate: number
  sideOutEfficiency: number
  breakPointEfficiency: number
  attackEfficiency: number
  receptionEfficiency: number
  atkTotal: number
  recTotal: number
}

interface APIStats {
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
  playerStats: (PlayerStatistics & { position: string })[]
  attackByPosition: { label: string; value: number; kills: number; errors: number; blocked: number; total: number }[]
  receptionByPosition: { label: string; efficiency: number; perfect: number; good: number; poor: number; errors: number; total: number }[]
  setterDistribution: { label: string; value: number }[]
  pipeAttacks: number
  rotationStats: RotationStat[]
  matches: { id: string; opponent: string; date: string; result: string; finalScore: string; actionsCount: number }[]
}

const TABS = [
  { id: 'strategy' as const, label: 'Estratégia', icon: MdInsights, color: 'blue' },
  { id: 'patterns' as const, label: 'Rotações', icon: MdGridOn, color: 'purple' },
  { id: 'heatmap' as const, label: 'Heatmaps', icon: MdMap, color: 'green' },
  { id: 'table' as const, label: 'Atletas', icon: MdTableChart, color: 'blue' },
]

export default function StatisticsPage() {
  const { selectedTeamId, selectedTeam } = useTeamContext()
  const { players, loading: playersLoading } = usePlayersAPI(selectedTeamId)

  const [filters, setFilters] = useState<StatisticsFilters>({})
  const [activeTab, setActiveTab] = useState<'strategy' | 'patterns' | 'heatmap' | 'table'>('strategy')
  const [loading, setLoading] = useState(true)
  const [apiData, setApiData] = useState<APIStats | null>(null)
  const [hasRealData, setHasRealData] = useState(false)
  const [hasCachedInsight, setHasCachedInsight] = useState(false)
  const [autoGenerate, setAutoGenerate] = useState(false)
  const [drawerKey, setDrawerKey] = useState(0)
  const { isOpen: isDrawerOpen, onOpen: onDrawerOpen, onClose: onDrawerClose } = useDisclosure()
  const { isOpen: isConfirmOpen, onOpen: onConfirmOpen, onClose: onConfirmClose } = useDisclosure()
  const confirmCancelRef = useRef<HTMLButtonElement>(null)

  // Verificar cache do insight de lineup_opt
  useEffect(() => {
    if (!selectedTeamId) return
    const params = new URLSearchParams({ type: 'stats_overview', teamId: selectedTeamId })
    fetch(`/api/ai/insights?${params}`)
      .then(r => r.json())
      .then(data => setHasCachedInsight(!!data.found))
      .catch(() => {})
  }, [selectedTeamId])

  const handleOpenAI = () => {
    if (!selectedTeamId) return
    if (hasCachedInsight) {
      setAutoGenerate(false)
      setDrawerKey(k => k + 1)
      onDrawerOpen()
    } else {
      onConfirmOpen()
    }
  }

  const handleConfirmGenerate = () => {
    onConfirmClose()
    setAutoGenerate(true)
    setDrawerKey(k => k + 1)
    setHasCachedInsight(true)
    onDrawerOpen()
  }

  // Buscar dados reais da API
  useEffect(() => {
    if (!selectedTeamId) return

    setLoading(true)
    fetch(`/api/statistics?teamId=${selectedTeamId}`)
      .then(r => r.json())
      .then((data: APIStats) => {
        setApiData(data)
        setHasRealData(data.kpis.matchesPlayed > 0)
        setLoading(false)
      })
      .catch(() => setLoading(false))
  }, [selectedTeamId])

  // Filtrar dados para aba de atletas
  const { filteredStats, availablePlayers } = useMemo(() => {
    if (!apiData) return { filteredStats: [], availablePlayers: [] }

    const playerList = players.map(p => ({
      id: p.id,
      name: p.name,
      number: p.jerseyNumber,
    }))

    let stats = apiData.playerStats as PlayerStatistics[]
    if (filters.playerId) {
      stats = stats.filter(s => s.playerId === filters.playerId)
    }

    return { filteredStats: stats, availablePlayers: playerList }
  }, [apiData, players, filters])

  if (loading || playersLoading) {
    return (
      <Flex minH="60vh" align="center" justify="center" direction="column" gap={4}>
        <Spinner size="xl" color="blue.500" thickness="3px" />
        <Text color="gray.400" fontSize="sm">Carregando estatísticas...</Text>
      </Flex>
    )
  }

  if (!hasRealData) {
    return (
      <Flex minH="60vh" align="center" justify="center" direction="column" gap={6}>
        <Box textAlign="center" maxW="480px">
          <Text fontSize="5xl" mb={4}>📊</Text>
          <Heading color="white" size="lg" mb={3}>
            Nenhum dado de scout registrado
          </Heading>
          <Text color="gray.400" fontSize="md" lineHeight="tall">
            As estatísticas serão geradas automaticamente a partir das partidas registradas pelo scout.
            Vá até a página de <Text as="span" color="blue.400" fontWeight="bold">Novo Jogo</Text> para começar.
          </Text>
        </Box>
      </Flex>
    )
  }

  const kpis = apiData!.kpis

  return (
    <>
      {/* Header */}
      <Flex
        justifyContent="space-between"
        alignItems="flex-end"
        mb={6}
        flexWrap="wrap"
        gap={4}
      >
        <Box>
          <Flex align="center" gap={3} mb={1}>
            <Heading color="white" size={{ base: 'lg', md: 'xl' }} letterSpacing="-0.02em">
              Estatísticas da Equipe
            </Heading>
            <Badge colorScheme="green" variant="subtle" fontSize="xs" px={2} py={0.5} borderRadius="full">
              {kpis.matchesPlayed} {kpis.matchesPlayed === 1 ? 'partida' : 'partidas'}
            </Badge>
          </Flex>
          <Text color="gray.500" fontSize="sm">
            {selectedTeam?.name || 'Equipe'} — Dados agregados de todas as partidas
          </Text>
        </Box>
        <Button
          leftIcon={<Icon as={IoSparkles} />}
          colorScheme="purple"
          variant={hasCachedInsight ? 'solid' : 'outline'}
          size="md"
          onClick={handleOpenAI}
        >
          {hasCachedInsight ? 'Ver análise IA' : 'Analisar com IA'}
        </Button>
      </Flex>

      {/* KPI Cards */}
      <KPICards kpis={kpis} />

      {/* Tabs */}
      <Flex
        gap={1}
        mb={4}
        bg="gray.800/60"
        p={1}
        borderRadius="xl"
        borderWidth="1px"
        borderColor="gray.700/50"
      >
        {TABS.map(tab => {
          const isActive = activeTab === tab.id
          const Icon = tab.icon
          return (
            <Button
              key={tab.id}
              flex="1"
              size="sm"
              h="40px"
              bg={isActive ? `${tab.color}.500` : 'transparent'}
              color={isActive ? 'white' : 'gray.400'}
              borderRadius="lg"
              fontWeight={isActive ? 'bold' : 'medium'}
              onClick={() => setActiveTab(tab.id)}
              _hover={{
                bg: isActive ? `${tab.color}.600` : 'gray.700/50',
                color: 'white',
              }}
              transition="all 0.15s"
              leftIcon={<Icon size={16} />}
              fontSize="sm"
            >
              {tab.label}
            </Button>
          )
        })}
      </Flex>

      {/* Content */}
      {activeTab === 'strategy' && apiData && (
        <StrategicCharts
          attackByPosition={apiData.attackByPosition}
          receptionByPosition={apiData.receptionByPosition}
          setterDistribution={apiData.setterDistribution}
          pipeAttacks={apiData.pipeAttacks}
        />
      )}

      {activeTab === 'patterns' && apiData && (
        <PatternInsights rotationStats={apiData.rotationStats} />
      )}

      {activeTab === 'heatmap' && selectedTeamId && (
        <Grid templateColumns={{ base: '1fr', lg: '1fr 1fr' }} gap={5}>
          <AttackHeatmap
            teamId={selectedTeamId}
            players={players.map(p => ({ id: p.id, name: p.name, jerseyNumber: p.jerseyNumber }))}
            title="Mapa de Ataque"
          />
          <ServeHeatmap
            teamId={selectedTeamId}
            players={players.map(p => ({ id: p.id, name: p.name, jerseyNumber: p.jerseyNumber }))}
            title="Mapa de Saque"
          />
        </Grid>
      )}

      {activeTab === 'table' && (
        <PlayerStatsTable
          stats={filteredStats}
          availablePlayers={availablePlayers}
          filters={filters}
          onFilterChange={setFilters}
        />
      )}

      {/* Drawer — Análise com IA */}
      <Drawer isOpen={isDrawerOpen} placement="right" onClose={onDrawerClose} size="lg">
        <DrawerOverlay />
        <DrawerContent bg="gray.900" borderLeftWidth="1px" borderColor="gray.700">
          <DrawerCloseButton color="gray.400" />
          <DrawerHeader borderBottomWidth="1px" borderColor="gray.700" pb={4}>
            <Flex align="center" gap={3}>
              <Icon as={IoSparkles} color="purple.400" boxSize={5} />
              <Box>
                <Text color="white" fontWeight="700" fontSize="lg">Análise Completa da Equipe</Text>
                <Text color="gray.400" fontSize="xs" fontWeight="normal">
                  {selectedTeam?.name} — análise baseada em todas as partidas
                </Text>
              </Box>
              <Badge colorScheme="purple" variant="subtle" ml="auto" mr={8}>Claude</Badge>
            </Flex>
          </DrawerHeader>
          <DrawerBody py={5}>
            {selectedTeamId && (
              <AIStreamingPanel
                key={drawerKey}
                type="stats_overview"
                teamId={selectedTeamId}
                embedded
                autoGenerate={autoGenerate}
              />
            )}
          </DrawerBody>
        </DrawerContent>
      </Drawer>

      {/* AlertDialog — Confirmação */}
      <AlertDialog isOpen={isConfirmOpen} leastDestructiveRef={confirmCancelRef} onClose={onConfirmClose} isCentered>
        <AlertDialogOverlay>
          <AlertDialogContent bg="gray.800" borderWidth="1px" borderColor="gray.700">
            <AlertDialogHeader color="white" fontSize="lg" fontWeight="bold">
              <Flex align="center" gap={2}>
                <Icon as={IoSparkles} color="purple.400" />
                Gerar análise com IA?
              </Flex>
            </AlertDialogHeader>
            <AlertDialogBody color="gray.300" fontSize="sm">
              O Claude vai analisar KPIs, desempenho individual, estratégia ofensiva e defensiva, distribuição do levantador e todas as rotações para gerar um relatório tático completo.
              O resultado ficará salvo para consultas futuras.
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
    </>
  )
}
