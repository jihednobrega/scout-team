'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Box, Flex, Text, Heading, Button, Icon, Spinner,
  Badge, Grid, Collapse, useDisclosure, useToast,
  HStack, Input, Select,
} from '@chakra-ui/react'
import {
  IoSparkles, IoTrash, IoRefresh, IoChevronDown, IoChevronUp,
  IoSearchOutline, IoFilterOutline,
} from 'react-icons/io5'
import { useTeamContext } from '@/contexts/TeamContext'
import type { AIInsightType } from '@/lib/ai/types'

// ─── Tipos ────────────────────────────────────────────────────────────────────

interface InsightFull {
  id: string
  type: AIInsightType
  tier: string
  provider: string
  response: string
  tokensUsed: number | null
  costEstimate: number | null
  createdAt: string
  matchId: string | null
  playerId: string | null
  metricKey: string | null
  match: { homeTeam: string; awayTeam: string; date: string; result: string; finalScore: string } | null
  player: { name: string; position: string; jerseyNumber: number } | null
}

// ─── Helpers ──────────────────────────────────────────────────────────────────

const TYPE_LABELS: Record<string, string> = {
  match_analysis:       'Análise de Partida',
  match_summary:        'Resumo de Partida',
  athlete_insight:      'Insight do Atleta',
  team_health:          'Saúde da Equipe',
  post_game_reflection: 'Reflexão Pós-Jogo',
  metric_explainer:     'Explicador de Métricas',
  player_dev:           'Desenvolvimento do Atleta',
  tactical_brief:       'Briefing Tático',
  lineup_opt:           'Otimização de Escalação',
  pattern_insights:     'Padrões de Rotação',
}

const TYPE_ICON: Record<string, string> = {
  match_analysis:       '🔍',
  match_summary:        '📋',
  athlete_insight:      '⭐',
  team_health:          '💚',
  post_game_reflection: '🏅',
  metric_explainer:     '📐',
  player_dev:           '📈',
  tactical_brief:       '♟️',
  lineup_opt:           '🔀',
  pattern_insights:     '🔄',
}

function formatBRL(v: number | null) {
  if (v == null) return null
  return `R$ ${v.toFixed(4)}`
}

function formatDate(iso: string) {
  return new Date(iso).toLocaleDateString('pt-BR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
    hour: '2-digit', minute: '2-digit',
  })
}

function preview(text: string, chars = 180) {
  const clean = text.replace(/#{1,3} /g, '').replace(/\*\*/g, '').replace(/\n+/g, ' ')
  return clean.length > chars ? clean.slice(0, chars) + '…' : clean
}

// ─── InsightCard ──────────────────────────────────────────────────────────────

function InsightCard({
  insight,
  onDelete,
}: {
  insight: InsightFull
  onDelete: (id: string) => void
}) {
  const { isOpen, onToggle } = useDisclosure()
  const [isDeleting, setIsDeleting] = useState(false)
  const toast = useToast()

  const handleDelete = async () => {
    setIsDeleting(true)
    try {
      await fetch(`/api/ai/insights/${insight.id}`, { method: 'DELETE' })
      onDelete(insight.id)
      toast({ title: 'Insight removido', status: 'info', duration: 2000 })
    } catch {
      toast({ title: 'Erro ao remover', status: 'error', duration: 3000 })
    } finally {
      setIsDeleting(false)
    }
  }

  const isA = insight.tier === 'A'
  const accentColor = isA ? '#A78BFA' : '#34D399'

  const contextLabel = insight.match
    ? `${insight.match.homeTeam} vs ${insight.match.awayTeam}`
    : insight.player
    ? `${insight.player.name} (#${insight.player.jerseyNumber})`
    : 'Equipe'

  const contextSub = insight.match
    ? `${insight.match.finalScore} · ${new Date(insight.match.date).toLocaleDateString('pt-BR')}`
    : insight.player
    ? insight.player.position
    : null

  return (
    <Box
      bg="gray.800"
      borderRadius="xl"
      border="1px solid"
      borderColor="gray.700"
      overflow="hidden"
      transition="border-color 0.15s"
      _hover={{ borderColor: 'gray.600' }}
    >
      {/* Barra de acento */}
      <Box h="2px" style={{ background: accentColor }} />

      <Box p={4}>
        {/* Header */}
        <Flex justify="space-between" align="flex-start" gap={3}>
          <Flex align="center" gap={2} flex={1} minW={0}>
            <Text fontSize="lg" flexShrink={0}>{TYPE_ICON[insight.type] ?? '✨'}</Text>
            <Box minW={0}>
              <Flex align="center" gap={2} flexWrap="wrap">
                <Text color="white" fontWeight="700" fontSize="sm" noOfLines={1}>
                  {TYPE_LABELS[insight.type] ?? insight.type}
                </Text>
                <Badge
                  fontSize="9px"
                  px={1.5}
                  borderRadius="sm"
                  colorScheme={isA ? 'purple' : 'green'}
                  variant="subtle"
                >
                  Tier {insight.tier}
                </Badge>
                <Badge
                  fontSize="9px"
                  px={1.5}
                  borderRadius="sm"
                  colorScheme={insight.provider === 'anthropic' ? 'purple' : 'blue'}
                  variant="outline"
                >
                  {insight.provider === 'anthropic' ? 'Claude' : 'GPT-4o-mini'}
                </Badge>
              </Flex>
              <Text color="gray.500" fontSize="xs" mt={0.5}>
                {contextLabel}
                {contextSub && <Text as="span" color="gray.600"> · {contextSub}</Text>}
              </Text>
            </Box>
          </Flex>

          {/* Ações */}
          <HStack spacing={1} flexShrink={0}>
            <Button
              size="xs"
              variant="ghost"
              color="gray.500"
              onClick={onToggle}
              _hover={{ color: 'white' }}
              rightIcon={<Icon as={isOpen ? IoChevronUp : IoChevronDown} boxSize={3} />}
            >
              {isOpen ? 'Recolher' : 'Ver'}
            </Button>
            <Button
              size="xs"
              variant="ghost"
              colorScheme="red"
              isLoading={isDeleting}
              onClick={handleDelete}
              p={1.5}
              minW="auto"
            >
              <Icon as={IoTrash} boxSize={3} />
            </Button>
          </HStack>
        </Flex>

        {/* Preview */}
        {!isOpen && (
          <Text color="gray.400" fontSize="xs" mt={3} lineHeight="1.6" noOfLines={2}>
            {preview(insight.response)}
          </Text>
        )}

        {/* Conteúdo expandido */}
        <Collapse in={isOpen} animateOpacity>
          <Box
            mt={3}
            bg="gray.900"
            borderRadius="lg"
            p={4}
            maxH="500px"
            overflowY="auto"
            fontSize="sm"
            color="gray.200"
            lineHeight="1.7"
            whiteSpace="pre-wrap"
            sx={{
              'h2, h3': { color: 'white', fontWeight: 'bold', mt: 3, mb: 1 },
              strong: { color: 'white' },
              '&::-webkit-scrollbar': { width: '4px' },
              '&::-webkit-scrollbar-thumb': { bg: 'gray.600', borderRadius: '2px' },
            }}
          >
            {insight.response
              .replace(/^```markdown\n?/m, '').replace(/\n?```$/m, '')
              .replace(/^### (.+)$/gm, '▸ $1\n')
              .replace(/^## (.+)$/gm, '\n$1\n' + '─'.repeat(40) + '\n')
            }
          </Box>
        </Collapse>

        {/* Footer */}
        <Flex mt={3} align="center" justify="space-between" flexWrap="wrap" gap={1}>
          <Text color="gray.600" fontSize="10px">
            {formatDate(insight.createdAt)}
            {insight.tokensUsed && ` · ${insight.tokensUsed.toLocaleString()} tokens`}
          </Text>
          {insight.costEstimate != null && (
            <Text color="gray.600" fontSize="10px">
              {formatBRL(insight.costEstimate)}
            </Text>
          )}
        </Flex>
      </Box>
    </Box>
  )
}

// ─── Stat pill ────────────────────────────────────────────────────────────────

function StatPill({ label, value, color }: { label: string; value: string; color: string }) {
  return (
    <Box
      bg="gray.800" borderRadius="xl" border="1px solid" borderColor="gray.700"
      px={4} py={3} textAlign="center" flex={1}
    >
      <Text color={color} fontWeight="800" fontSize="lg">{value}</Text>
      <Text color="gray.500" fontSize="10px" textTransform="uppercase" letterSpacing="0.08em" mt={0.5}>
        {label}
      </Text>
    </Box>
  )
}

// ─── Page ─────────────────────────────────────────────────────────────────────

export default function AIInsightsPage() {
  const { selectedTeamId, selectedTeam } = useTeamContext()
  const [insights, setInsights] = useState<InsightFull[]>([])
  const [loading, setLoading] = useState(false)
  const [search, setSearch] = useState('')
  const [filterType, setFilterType] = useState<string>('all')
  const [filterTier, setFilterTier] = useState<string>('all')

  const load = useCallback(async () => {
    if (!selectedTeamId) return
    setLoading(true)
    try {
      const res = await fetch(`/api/ai/insights/all?teamId=${selectedTeamId}`)
      const data = await res.json()
      setInsights(Array.isArray(data) ? data : [])
    } catch {
      setInsights([])
    } finally {
      setLoading(false)
    }
  }, [selectedTeamId])

  useEffect(() => { load() }, [load])

  const handleDelete = useCallback((id: string) => {
    setInsights(prev => prev.filter(i => i.id !== id))
  }, [])

  // Filtered list
  const filtered = insights.filter(i => {
    if (filterTier !== 'all' && i.tier !== filterTier) return false
    if (filterType !== 'all' && i.type !== filterType) return false
    if (search) {
      const q = search.toLowerCase()
      const matchLabel = i.match ? `${i.match.homeTeam} ${i.match.awayTeam}`.toLowerCase() : ''
      const playerLabel = i.player ? i.player.name.toLowerCase() : ''
      const typeLabel = (TYPE_LABELS[i.type] ?? i.type).toLowerCase()
      if (!matchLabel.includes(q) && !playerLabel.includes(q) && !typeLabel.includes(q) && !i.response.toLowerCase().includes(q)) return false
    }
    return true
  })

  // Stats
  const totalTokens = insights.reduce((s, i) => s + (i.tokensUsed ?? 0), 0)
  const totalCostBRL = insights.reduce((s, i) => s + (i.costEstimate ?? 0), 0)
  const tierACount = insights.filter(i => i.tier === 'A').length
  const tierBCount = insights.filter(i => i.tier === 'B').length

  if (!selectedTeamId) {
    return (
      <Flex minH="60vh" align="center" justify="center">
        <Box textAlign="center">
          <Text fontSize="4xl" mb={3}>✨</Text>
          <Text color="gray.400">Selecione uma equipe para ver os insights.</Text>
        </Box>
      </Flex>
    )
  }

  return (
    <Box maxW="900px" mx="auto">
      {/* Header */}
      <Flex align="center" gap={3} mb={6}>
        <Flex
          w={10} h={10} borderRadius="xl"
          bg="purple.500/15" border="1px solid" borderColor="purple.500/30"
          align="center" justify="center" flexShrink={0}
        >
          <Icon as={IoSparkles} color="purple.400" boxSize={5} />
        </Flex>
        <Box flex={1}>
          <Heading size="lg" color="white">Central de Insights</Heading>
          <Text fontSize="sm" color="gray.500">
            {selectedTeam?.name} — todos os insights de IA gerados
          </Text>
        </Box>
        <Button
          size="sm"
          variant="ghost"
          color="gray.400"
          leftIcon={<Icon as={IoRefresh} />}
          onClick={load}
          isLoading={loading}
          _hover={{ color: 'white' }}
        >
          Atualizar
        </Button>
      </Flex>

      {/* Stats */}
      {insights.length > 0 && (
        <Flex gap={3} mb={6} flexWrap="wrap">
          <StatPill label="Total" value={String(insights.length)} color="white" />
          <StatPill label="Tier A (Claude)" value={String(tierACount)} color="purple.400" />
          <StatPill label="Tier B (GPT)" value={String(tierBCount)} color="green.400" />
          <StatPill
            label="Tokens"
            value={totalTokens >= 1000 ? `${(totalTokens / 1000).toFixed(1)}k` : String(totalTokens)}
            color="blue.400"
          />
          <StatPill
            label="Custo total"
            value={`R$ ${totalCostBRL.toFixed(3)}`}
            color="orange.400"
          />
        </Flex>
      )}

      {/* Filters */}
      {insights.length > 0 && (
        <Flex gap={3} mb={5} flexWrap="wrap">
          <Flex
            align="center" gap={2} flex={1} minW="200px"
            bg="gray.800" border="1px solid" borderColor="gray.700" borderRadius="lg"
            px={3}
          >
            <Icon as={IoSearchOutline} color="gray.500" boxSize={4} />
            <Input
              placeholder="Buscar insights..."
              value={search}
              onChange={e => setSearch(e.target.value)}
              variant="unstyled"
              color="white"
              fontSize="sm"
              _placeholder={{ color: 'gray.600' }}
              py={2}
            />
          </Flex>

          <Select
            value={filterTier}
            onChange={e => setFilterTier(e.target.value)}
            bg="gray.800"
            border="1px solid"
            borderColor="gray.700"
            color="gray.300"
            fontSize="sm"
            borderRadius="lg"
            w="auto"
            minW="130px"
            icon={<Icon as={IoFilterOutline} />}
          >
            <option value="all" style={{ background: '#1a202c' }}>Todos os tiers</option>
            <option value="A" style={{ background: '#1a202c' }}>Tier A — Claude</option>
            <option value="B" style={{ background: '#1a202c' }}>Tier B — GPT</option>
          </Select>

          <Select
            value={filterType}
            onChange={e => setFilterType(e.target.value)}
            bg="gray.800"
            border="1px solid"
            borderColor="gray.700"
            color="gray.300"
            fontSize="sm"
            borderRadius="lg"
            w="auto"
            minW="180px"
          >
            <option value="all" style={{ background: '#1a202c' }}>Todos os tipos</option>
            {Object.entries(TYPE_LABELS).map(([k, v]) => (
              <option key={k} value={k} style={{ background: '#1a202c' }}>{v}</option>
            ))}
          </Select>
        </Flex>
      )}

      {/* Content */}
      {loading ? (
        <Flex align="center" justify="center" py={20} gap={3}>
          <Spinner color="purple.400" />
          <Text color="gray.400">Carregando insights...</Text>
        </Flex>
      ) : insights.length === 0 ? (
        <Box textAlign="center" py={20}>
          <Text fontSize="5xl" mb={4}>✨</Text>
          <Text color="white" fontWeight="700" fontSize="lg" mb={2}>
            Nenhum insight gerado ainda
          </Text>
          <Text color="gray.500" fontSize="sm" maxW="380px" mx="auto" lineHeight="1.7">
            Use os botões "Analisar com IA" nas páginas de relatórios, histórico, estatísticas
            e portais para gerar análises. Elas aparecerão aqui automaticamente.
          </Text>
        </Box>
      ) : filtered.length === 0 ? (
        <Box textAlign="center" py={16}>
          <Text color="gray.500" fontSize="sm">Nenhum insight encontrado para esse filtro.</Text>
          <Button size="xs" variant="ghost" color="gray.500" mt={2}
            onClick={() => { setSearch(''); setFilterTier('all'); setFilterType('all') }}>
            Limpar filtros
          </Button>
        </Box>
      ) : (
        <>
          <Text color="gray.600" fontSize="xs" mb={3}>
            {filtered.length} {filtered.length === 1 ? 'insight' : 'insights'}
            {filtered.length < insights.length && ` de ${insights.length}`}
          </Text>
          <Grid templateColumns="1fr" gap={3}>
            {filtered.map(insight => (
              <InsightCard key={insight.id} insight={insight} onDelete={handleDelete} />
            ))}
          </Grid>
        </>
      )}
    </Box>
  )
}
