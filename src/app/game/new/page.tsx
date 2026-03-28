// app/game/new/page.tsx
'use client'

import { useState, useEffect } from 'react'
import { useRouter } from 'next/navigation'
import { Box, Heading, Button, Flex } from '@chakra-ui/react'
import BasicInfo from '@/components/game/BasicInfo'
import TeamSetup from '@/components/game/TeamSetup'
import ScoutParameters from '@/components/game/ScoutParameters'
import AdvancedSettings from '@/components/game/AdvancedSettings'
import GamePreview from '@/components/game/GamePreview'
import { usePlayers } from '@/hooks/usePlayers'
import { useTeamContext } from '@/contexts/TeamContext'
import {
  GameConfig,
  MatchType,
  LineupPlayer,
  ScoutModel,
  AdvancedTracking,
} from '@/types/scout'
import { validateGameSetup, checkHistoryWarning } from '@/utils/gameValidation'

// Modelos de scout padrão
const SCOUT_MODELS: ScoutModel[] = [
  {
    id: 'padrao',
    name: 'Padrão',
    description: 'Todos os fundamentos com métricas completas',
    fundamentals: {
      serve: true,
      pass: true,
      attack: true,
      block: true,
      dig: true,
      set: true,
    },
  },
  {
    id: 'simplificado',
    name: 'Simplificado',
    description: 'Apenas saque, recepção e ataque',
    fundamentals: {
      serve: true,
      pass: true,
      attack: true,
      block: false,
      dig: false,
      set: false,
    },
  },
  {
    id: 'ataque-defesa',
    name: 'Ataque/Defesa',
    description: 'Foco em ataque, bloqueio e defesa',
    fundamentals: {
      serve: false,
      pass: false,
      attack: true,
      block: true,
      dig: true,
      set: false,
    },
  },
]

export default function NewGamePage() {
  const router = useRouter()
  const { players } = usePlayers()
  const { selectedTeam } = useTeamContext()

  // Estados do formulário
  const [tournament, setTournament] = useState('')
  const [date, setDate] = useState('')
  const [time, setTime] = useState('')
  const [opponent, setOpponent] = useState('')
  const [location, setLocation] = useState('')
  const [matchType, setMatchType] = useState<MatchType>('championship')

  const [lineup, setLineup] = useState<LineupPlayer[]>([])
  const [liberoId, setLiberoId] = useState('')

  const [selectedModel, setSelectedModel] = useState('padrao')
  const [enabledFundamentos, setEnabledFundamentos] = useState<string[]>([
    'serve', 'reception', 'attack', 'block', 'dig', 'set',
  ])

  const [advanced, setAdvanced] = useState<AdvancedTracking>({
    useEPV: false,
    trackReceptionGradeAgainst: false,
    enableContextHashing: false,
    collectBlockersCount: false,
    collectChainId: false,
    enableXSR: false,
    enableEntropy: false,
  })

  const [hasHistoryWarning, setHasHistoryWarning] = useState(false)

  // Carregar jogadores no lineup ao montar
  useEffect(() => {
    if (players.length > 0) {
      const lineupPlayers: LineupPlayer[] = players.map((player) => ({
        playerId: player.id,
        jerseyNumber: player.jerseyNumber,
        playerName: player.name,
        position: player.position,
        isStarter: false,
      }))
      setLineup(lineupPlayers)
    }
  }, [players])

  // Verificar histórico do time
  useEffect(() => {
    if (selectedTeam?.id) {
      const hasWarning = checkHistoryWarning(selectedTeam.id)
      setHasHistoryWarning(hasWarning)
    }
  }, [selectedTeam])

  // Carregar configuração anterior
  const handleLoadPreviousConfig = () => {
    const saved = localStorage.getItem('last-game-config')
    if (saved) {
      try {
        const config: Partial<GameConfig> = JSON.parse(saved)
        if (config.tournament) setTournament(config.tournament)
        if (config.location) setLocation(config.location)
        if (config.matchType) setMatchType(config.matchType)
        if (config.modelId) setSelectedModel(config.modelId)
        if (config.enabledFundamentos) setEnabledFundamentos(config.enabledFundamentos)
        if (config.advanced) setAdvanced(config.advanced)
        alert('✅ Configuração anterior carregada! Atualize apenas o adversário, data e horário.')
      } catch (error) {
        alert('❌ Erro ao carregar configuração anterior')
      }
    } else {
      alert('ℹ️ Nenhuma configuração anterior encontrada')
    }
  }

  // Importar elenco ativo
  const handleImportActiveRoster = () => {
    // Por enquanto, marca os 6 primeiros como titulares
    if (lineup.length >= 6) {
      const updated = lineup.map((player, index) => ({
        ...player,
        isStarter: index < 6,
        rotationOrder: index < 6 ? index + 1 : undefined,
      }))
      setLineup(updated)

      // Definir primeiro como líbero se não houver
      if (!liberoId && lineup.length > 0) {
        setLiberoId(lineup[0].playerId)
      }

      alert('✅ Elenco ativo importado! Ajuste as posições conforme necessário.')
    }
  }

  // Validar e criar configuração
  const buildGameConfig = (): Partial<GameConfig> => {
    const starters = lineup.filter((p) => p.isStarter)
    const rotationStart = starters
      .sort((a, b) => (a.rotationOrder || 0) - (b.rotationOrder || 0))
      .map((p) => p.rotationOrder || 0)

    const model = SCOUT_MODELS.find((m) => m.id === selectedModel) || SCOUT_MODELS[0]

    return {
      gameId: `game-${Date.now()}`,
      date: date ? new Date(date) : undefined,
      time,
      teamId: selectedTeam?.id || 'default-team',
      teamName: selectedTeam?.name || 'Seu Time',
      opponentName: opponent,
      tournament,
      location,
      matchType,
      lineup,
      liberoId,
      rotationStart,
      modelId: model.id,
      modelName: model.name,
      enabledFundamentos,
      advanced,
      createdAt: new Date(),
    }
  }

  const validation = validateGameSetup(buildGameConfig())

  // Iniciar scout
  const handleStartScout = () => {
    if (!validation.isValid) {
      alert('❌ Por favor, corrija os erros antes de iniciar o scout')
      return
    }

    const config = buildGameConfig() as GameConfig

    // Salvar no localStorage
    localStorage.setItem('current-game-config', JSON.stringify(config))
    localStorage.setItem('last-game-config', JSON.stringify(config))

    // Navegar para a página de scout
    router.push('/game')
  }

  return (
    <Box p={{ base: 4, lg: 6 }}>
      {/* Header */}
      <Box mb={6}>
        <Flex alignItems="center" justifyContent="space-between" mb={2}>
          <Heading size="xl" color="white">
            🏐 Novo Jogo
          </Heading>
          <Button
            size="sm"
            variant="ghost"
            color="gray.400"
            onClick={() => router.push('/dashboard')}
          >
            ← Voltar
          </Button>
        </Flex>
        <Box h="2px" bg="blue.500" borderRadius="full" w="100px" />
      </Box>

      {/* Seções do Formulário */}
      <BasicInfo
        tournament={tournament}
        setTournament={setTournament}
        date={date}
        setDate={setDate}
        time={time}
        setTime={setTime}
        opponent={opponent}
        setOpponent={setOpponent}
        location={location}
        setLocation={setLocation}
        matchType={matchType}
        setMatchType={setMatchType}
        onLoadPreviousConfig={handleLoadPreviousConfig}
      />

      <TeamSetup
        lineup={lineup}
        setLineup={setLineup}
        liberoId={liberoId}
        setLiberoId={setLiberoId}
        onImportActiveRoster={handleImportActiveRoster}
      />

      <ScoutParameters
        selectedModel={selectedModel}
        setSelectedModel={setSelectedModel}
        models={SCOUT_MODELS}
        enabledFundamentos={enabledFundamentos}
        onEnabledFundamentosChange={setEnabledFundamentos}
      />

      <AdvancedSettings
        advanced={advanced}
        setAdvanced={setAdvanced}
        hasHistoryWarning={hasHistoryWarning}
      />

      <GamePreview
        config={buildGameConfig()}
        onStartScout={handleStartScout}
        isValid={validation.isValid}
        errors={validation.errors}
      />
    </Box>
  )
}
