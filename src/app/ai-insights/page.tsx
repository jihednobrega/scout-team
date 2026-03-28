'use client'

import React, { useState, useMemo, useEffect, useCallback } from 'react'
import {
  Box, Flex, Text, Heading, Button, Textarea, Select,
  Tabs, TabList, Tab, TabPanels, TabPanel,
  Accordion, AccordionItem, AccordionButton, AccordionPanel, AccordionIcon,
  Badge, Spinner, Alert, AlertIcon, AlertTitle, AlertDescription,
  useToast, VStack, HStack, Divider, Code,
  IconButton, Tooltip,
} from '@chakra-ui/react'
import { MdContentCopy, MdSave, MdRefresh, MdSmartToy, MdAutoGraph, MdEdit } from 'react-icons/md'
import { useTeamContext } from '@/contexts/TeamContext'
import { useMatchesList, useMatchDetail } from '@/hooks/useMatchesAPI'
import { usePlayersAPI } from '@/hooks/usePlayersAPI'
import { calculatePlayerStats } from '@/utils/stats'
import { generateAIPromptText, generateFullPrompt, AGENT_SYSTEM_PROMPT } from '@/lib/generateAIPrompt'

// ─── localStorage key helper ──────────────────────────────────────────────────
const storageKey = (matchId: string) => `ai-insights-response-${matchId}`

// ─── Formatted AI Response Display ────────────────────────────────────────────
function AIResponseDisplay({ text }: { text: string }) {
  const sections = text.split(/^(##\s+.+)$/m).filter(Boolean)

  return (
    <VStack align="stretch" spacing={4}>
      {sections.map((section, i) => {
        if (section.startsWith('## ')) {
          return (
            <Text key={i} fontSize="md" fontWeight="bold" color="blue.300" pt={i > 0 ? 2 : 0}>
              {section.replace('## ', '')}
            </Text>
          )
        }
        // Parse bold markers and render as plain text with emphasis
        const lines = section.trim().split('\n').filter((l) => l.trim())
        return (
          <VStack key={i} align="stretch" spacing={1} pl={2} borderLeft="2px" borderColor="gray.700">
            {lines.map((line, j) => {
              const isListItem = line.trimStart().startsWith('-') || line.trimStart().startsWith('•') || /^\d+\./.test(line.trim())
              return (
                <Text
                  key={j}
                  fontSize="sm"
                  color={isListItem ? 'gray.200' : 'gray.300'}
                  lineHeight="1.7"
                  pl={isListItem ? 2 : 0}
                >
                  {line}
                </Text>
              )
            })}
          </VStack>
        )
      })}
    </VStack>
  )
}

// ─── Section: Report Preview ───────────────────────────────────────────────────
function ReportPreview({ text }: { text: string }) {
  const [expanded, setExpanded] = useState(false)
  const PREVIEW_LINES = 40
  const lines = text.split('\n')
  const preview = expanded ? lines : lines.slice(0, PREVIEW_LINES)

  return (
    <Box
      bg="gray.950"
      borderRadius="lg"
      borderWidth="1px"
      borderColor="gray.700"
      overflow="hidden"
    >
      <Flex
        align="center"
        justify="space-between"
        px={4}
        py={2}
        bg="gray.800"
        borderBottom="1px"
        borderColor="gray.700"
      >
        <HStack spacing={2}>
          <Box w={3} h={3} bg="red.500" borderRadius="full" />
          <Box w={3} h={3} bg="yellow.500" borderRadius="full" />
          <Box w={3} h={3} bg="green.500" borderRadius="full" />
        </HStack>
        <Text fontSize="xs" color="gray.500" fontFamily="mono">
          relatorio_partida.txt
        </Text>
        <Box />
      </Flex>

      <Box
        p={4}
        overflowX="auto"
        maxH={expanded ? '600px' : '340px'}
        overflowY="auto"
        transition="max-height 0.3s"
      >
        <Text
          as="pre"
          fontSize="xs"
          color="green.300"
          fontFamily="mono"
          whiteSpace="pre"
          lineHeight="1.6"
        >
          {preview.join('\n')}
          {!expanded && lines.length > PREVIEW_LINES && (
            <>
              {'\n'}
              <Text as="span" color="gray.600">
                {'... '}({lines.length - PREVIEW_LINES} linhas adicionais)
              </Text>
            </>
          )}
        </Text>
      </Box>

      {lines.length > PREVIEW_LINES && (
        <Flex
          justify="center"
          py={2}
          bg="gray.800"
          borderTop="1px"
          borderColor="gray.700"
        >
          <Button
            size="xs"
            variant="ghost"
            color="gray.400"
            onClick={() => setExpanded(!expanded)}
          >
            {expanded ? 'Recolher' : `Ver tudo (${lines.length} linhas)`}
          </Button>
        </Flex>
      )}
    </Box>
  )
}

// ─── Step Indicator ────────────────────────────────────────────────────────────
function Step({ num, label, active, done }: { num: number; label: string; active: boolean; done: boolean }) {
  return (
    <Flex align="center" gap={2} opacity={active || done ? 1 : 0.4}>
      <Flex
        w={7} h={7}
        borderRadius="full"
        align="center"
        justify="center"
        fontSize="xs"
        fontWeight="bold"
        bg={done ? 'green.500' : active ? 'blue.500' : 'gray.700'}
        color="white"
        flexShrink={0}
      >
        {done ? '✓' : num}
      </Flex>
      <Text fontSize="xs" color={active ? 'white' : 'gray.400'} fontWeight={active ? 'bold' : 'normal'}>
        {label}
      </Text>
    </Flex>
  )
}

// ─── Main Page ─────────────────────────────────────────────────────────────────
export default function AIInsightsPage() {
  const toast = useToast()
  const { selectedTeamId } = useTeamContext()

  const { matches, loading: loadingMatches } = useMatchesList(selectedTeamId)
  const [selectedMatchId, setSelectedMatchId] = useState<string>('')
  const { match, actions, loading: loadingMatch } = useMatchDetail(selectedMatchId || null)
  const { players } = usePlayersAPI(selectedTeamId)

  const [aiResponse, setAiResponse] = useState('')
  const [savedResponse, setSavedResponse] = useState('')
  const [isEditing, setIsEditing] = useState(false)

  // Player info map
  const playerInfoMap = useMemo(() => {
    const map: Record<string, { name: string; number: string; position: string }> = {}
    players.forEach((p) => {
      map[p.id] = { name: p.name, number: p.jerseyNumber.toString(), position: p.position }
    })
    return map
  }, [players])

  // Auto-select most recent match
  useEffect(() => {
    if (matches.length > 0 && !selectedMatchId) {
      setSelectedMatchId(matches[0].id)
    }
  }, [matches, selectedMatchId])

  // Load saved AI response from localStorage
  useEffect(() => {
    if (!selectedMatchId) return
    const saved = localStorage.getItem(storageKey(selectedMatchId))
    setSavedResponse(saved ?? '')
    setAiResponse(saved ?? '')
    setIsEditing(!saved)
  }, [selectedMatchId])

  // Generate report text
  const reportText = useMemo(() => {
    if (!match || !actions.length) return ''
    return generateAIPromptText(match, actions, playerInfoMap)
  }, [match, actions, playerInfoMap])

  const fullPromptText = useMemo(() => {
    if (!match || !actions.length) return ''
    return generateFullPrompt(match, actions, playerInfoMap)
  }, [match, actions, playerInfoMap])

  const handleCopyData = useCallback(async (withSystem = false) => {
    const text = withSystem ? fullPromptText : reportText
    if (!text) return
    await navigator.clipboard.writeText(text)
    toast({
      title: withSystem ? 'Prompt completo copiado!' : 'Dados copiados!',
      description: withSystem
        ? 'Inclui o prompt do agente + dados da partida'
        : 'Apenas os dados da partida foram copiados',
      status: 'success',
      duration: 3000,
      isClosable: true,
    })
  }, [reportText, fullPromptText, toast])

  const handleCopySystemPrompt = useCallback(async () => {
    await navigator.clipboard.writeText(AGENT_SYSTEM_PROMPT)
    toast({ title: 'Prompt do agente copiado!', status: 'success', duration: 2500 })
  }, [toast])

  const handleSaveResponse = useCallback(() => {
    if (!selectedMatchId || !aiResponse.trim()) return
    localStorage.setItem(storageKey(selectedMatchId), aiResponse.trim())
    setSavedResponse(aiResponse.trim())
    setIsEditing(false)
    toast({ title: 'Análise salva!', status: 'success', duration: 2500 })
  }, [selectedMatchId, aiResponse, toast])

  const handleClearResponse = useCallback(() => {
    if (!selectedMatchId) return
    localStorage.removeItem(storageKey(selectedMatchId))
    setSavedResponse('')
    setAiResponse('')
    setIsEditing(true)
    toast({ title: 'Análise removida', status: 'info', duration: 2000 })
  }, [selectedMatchId, toast])

  // ── No team selected ──
  if (!selectedTeamId) {
    return (
      <Flex minH="60vh" align="center" justify="center" p={8}>
        <Alert status="info" borderRadius="xl" maxW="md" flexDirection="column" alignItems="center" textAlign="center">
          <AlertIcon boxSize="40px" mr={0} mb={3} />
          <AlertTitle mb={2}>Nenhuma equipe selecionada</AlertTitle>
          <AlertDescription>Selecione uma equipe no menu superior para acessar os insights com IA.</AlertDescription>
        </Alert>
      </Flex>
    )
  }

  return (
    <Box>
      {/* ── Header ── */}
      <Flex align="center" gap={3} mb={2}>
        <Flex
          w={10} h={10} borderRadius="xl"
          bg="purple.500/15" borderWidth="1px" borderColor="purple.500/30"
          align="center" justify="center" fontSize="xl" flexShrink={0}
        >
          🤖
        </Flex>
        <Box>
          <Heading size="lg" color="white">Análise com IA</Heading>
          <Text fontSize="sm" color="gray.400">
            Exporte dados de partidas para análise externa e registre os insights recebidos
          </Text>
        </Box>
      </Flex>

      {/* ── Steps guide ── */}
      <Box
        bg="gray.800" borderRadius="xl" borderWidth="1px" borderColor="gray.700"
        px={5} py={4} mb={6}
      >
        <Text fontSize="xs" color="gray.500" mb={3} fontWeight="bold" textTransform="uppercase" letterSpacing="wider">
          Como usar
        </Text>
        <Flex gap={4} wrap="wrap">
          <Step num={1} label="Selecione uma partida" active={!selectedMatchId} done={!!selectedMatchId} />
          <Step num={2} label="Copie os dados para IA" active={!!selectedMatchId && !savedResponse} done={!!savedResponse} />
          <Step num={3} label="Cole a resposta da IA" active={!!selectedMatchId && !savedResponse} done={!!savedResponse} />
          <Step num={4} label="Visualize os insights" active={!!savedResponse} done={false} />
        </Flex>
      </Box>

      {/* ── Match selector ── */}
      <Box mb={6}>
        <Text fontSize="sm" color="gray.400" mb={2} fontWeight="medium">Selecionar Partida</Text>
        {loadingMatches ? (
          <Flex align="center" gap={2}>
            <Spinner size="sm" color="blue.400" />
            <Text fontSize="sm" color="gray.500">Carregando partidas...</Text>
          </Flex>
        ) : matches.length === 0 ? (
          <Alert status="warning" borderRadius="lg" size="sm">
            <AlertIcon />
            <AlertDescription fontSize="sm">
              Nenhuma partida encontrada. Registre jogos primeiro.
            </AlertDescription>
          </Alert>
        ) : (
          <Select
            value={selectedMatchId}
            onChange={(e) => setSelectedMatchId(e.target.value)}
            bg="gray.800"
            borderColor="gray.600"
            color="white"
            size="md"
            borderRadius="lg"
            _hover={{ borderColor: 'gray.500' }}
            _focus={{ borderColor: 'blue.400' }}
          >
            <option value="" style={{ background: '#1a202c' }}>— Escolha uma partida —</option>
            {matches.map((m) => {
              const date = new Date(m.date).toLocaleDateString('pt-BR', { day: '2-digit', month: '2-digit', year: '2-digit' })
              const result = m.result === 'vitoria' ? '✓' : '✗'
              return (
                <option key={m.id} value={m.id} style={{ background: '#1a202c' }}>
                  {result} {m.opponent} — {m.score || 'N/A'} — {date}
                  {m.tournament ? ` (${m.tournament})` : ''}
                </option>
              )
            })}
          </Select>
        )}
      </Box>

      {/* ── Main content ── */}
      {selectedMatchId && (
        <>
          {loadingMatch ? (
            <Flex align="center" justify="center" py={12} gap={3}>
              <Spinner color="purple.400" />
              <Text color="gray.400">Carregando dados da partida...</Text>
            </Flex>
          ) : !match ? (
            <Alert status="error" borderRadius="xl">
              <AlertIcon />
              <AlertDescription>Não foi possível carregar esta partida.</AlertDescription>
            </Alert>
          ) : actions.length === 0 ? (
            <Alert status="warning" borderRadius="xl">
              <AlertIcon />
              <AlertTitle mr={2}>Sem dados de scout</AlertTitle>
              <AlertDescription>Esta partida não possui ações registradas para análise.</AlertDescription>
            </Alert>
          ) : (
            <Tabs colorScheme="purple" variant="enclosed" isLazy>
              <TabList borderColor="gray.700" mb={0}>
                <Tab
                  color="gray.400"
                  _selected={{ color: 'white', bg: 'gray.800', borderColor: 'gray.700', borderBottomColor: 'gray.800' }}
                  fontSize="sm"
                >
                  📋 Dados para IA
                </Tab>
                <Tab
                  color="gray.400"
                  _selected={{ color: 'white', bg: 'gray.800', borderColor: 'gray.700', borderBottomColor: 'gray.800' }}
                  fontSize="sm"
                >
                  🤖 Análise da IA
                  {savedResponse && (
                    <Badge ml={2} colorScheme="green" variant="solid" fontSize="2xs">salvo</Badge>
                  )}
                </Tab>
                <Tab
                  color="gray.400"
                  _selected={{ color: 'white', bg: 'gray.800', borderColor: 'gray.700', borderBottomColor: 'gray.800' }}
                  fontSize="sm"
                >
                  🧠 Prompt do Agente
                </Tab>
              </TabList>

              <Box
                bg="gray.800"
                borderWidth="1px"
                borderColor="gray.700"
                borderTopWidth={0}
                borderRadius="0 0 xl xl"
                p={{ base: 4, md: 6 }}
              >
                <TabPanels>

                  {/* ──────────── Tab 1: Dados para IA ──────────── */}
                  <TabPanel p={0}>
                    <VStack align="stretch" spacing={5}>

                      {/* Match badge */}
                      <Flex align="center" justify="space-between" wrap="wrap" gap={3}>
                        <Box>
                          <Text fontSize="lg" fontWeight="bold" color="white">
                            {match.homeTeam} <Text as="span" color="gray.500">vs</Text> {match.awayTeam}
                          </Text>
                          <Text fontSize="sm" color="gray.400">
                            {new Date(match.date).toLocaleDateString('pt-BR', {
                              weekday: 'long', day: '2-digit', month: 'long', year: 'numeric'
                            })}
                            {match.tournament && ` • ${match.tournament}`}
                          </Text>
                        </Box>
                        <HStack>
                          <Badge
                            colorScheme={match.result === 'vitoria' ? 'green' : 'red'}
                            fontSize="sm" px={3} py={1} borderRadius="full"
                          >
                            {match.result === 'vitoria' ? '✓ Vitória' : '✗ Derrota'}
                          </Badge>
                          <Badge colorScheme="blue" fontSize="sm" px={3} py={1} borderRadius="full">
                            {actions.length} ações
                          </Badge>
                        </HStack>
                      </Flex>

                      <Divider borderColor="gray.700" />

                      {/* Preview */}
                      <Box>
                        <Text fontSize="sm" color="gray.400" mb={3} fontWeight="medium">
                          Pré-visualização do relatório que será enviado à IA:
                        </Text>
                        <ReportPreview text={reportText} />
                      </Box>

                      {/* Copy buttons */}
                      <Box
                        bg="purple.900/20"
                        borderRadius="xl"
                        borderWidth="1px"
                        borderColor="purple.500/30"
                        p={5}
                      >
                        <Flex align="center" gap={2} mb={3}>
                          <Text fontSize="md">🚀</Text>
                          <Text fontSize="sm" fontWeight="bold" color="purple.300">
                            Enviar para IA
                          </Text>
                        </Flex>
                        <Text fontSize="sm" color="gray.400" mb={4} lineHeight="1.6">
                          Copie os dados abaixo e cole em um chat com IA (ChatGPT, Claude, Gemini).
                          Use <strong>Copiar tudo</strong> para incluir o prompt do agente configurado.
                        </Text>
                        <HStack spacing={3} wrap="wrap">
                          <Button
                            leftIcon={<MdContentCopy />}
                            colorScheme="purple"
                            size="md"
                            onClick={() => handleCopyData(true)}
                            isDisabled={!reportText}
                          >
                            Copiar tudo (recomendado)
                          </Button>
                          <Button
                            leftIcon={<MdContentCopy />}
                            variant="outline"
                            colorScheme="gray"
                            size="md"
                            onClick={() => handleCopyData(false)}
                            isDisabled={!reportText}
                          >
                            Só os dados
                          </Button>
                        </HStack>
                        <Text fontSize="xs" color="gray.600" mt={3}>
                          💡 Dica: "Copiar tudo" já inclui as instruções para o modelo de IA — sem precisar configurar manualmente.
                        </Text>
                      </Box>

                    </VStack>
                  </TabPanel>

                  {/* ──────────── Tab 2: Análise da IA ──────────── */}
                  <TabPanel p={0}>
                    <VStack align="stretch" spacing={5}>

                      {savedResponse && !isEditing ? (
                        <>
                          {/* Header */}
                          <Flex align="center" justify="space-between">
                            <Flex align="center" gap={2}>
                              <Text fontSize="xl">✅</Text>
                              <Box>
                                <Text fontSize="sm" fontWeight="bold" color="green.300">Análise registrada</Text>
                                <Text fontSize="xs" color="gray.500">
                                  {match.homeTeam} vs {match.awayTeam}
                                </Text>
                              </Box>
                            </Flex>
                            <HStack>
                              <Tooltip label="Editar análise">
                                <IconButton
                                  icon={<MdEdit />}
                                  aria-label="Editar"
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="blue"
                                  onClick={() => setIsEditing(true)}
                                />
                              </Tooltip>
                              <Tooltip label="Remover análise">
                                <IconButton
                                  icon={<MdRefresh />}
                                  aria-label="Limpar"
                                  size="sm"
                                  variant="ghost"
                                  colorScheme="red"
                                  onClick={handleClearResponse}
                                />
                              </Tooltip>
                            </HStack>
                          </Flex>

                          <Divider borderColor="gray.700" />

                          {/* Display */}
                          <Box
                            bg="gray.900"
                            borderRadius="xl"
                            borderWidth="1px"
                            borderColor="gray.700"
                            p={5}
                          >
                            <AIResponseDisplay text={savedResponse} />
                          </Box>
                        </>
                      ) : (
                        <>
                          {/* Input area */}
                          <Box>
                            <Flex align="center" gap={2} mb={2}>
                              <Text fontSize="xl">📥</Text>
                              <Text fontSize="sm" fontWeight="bold" color="white">
                                {savedResponse ? 'Editar análise' : 'Cole aqui a resposta da IA'}
                              </Text>
                            </Flex>
                            <Text fontSize="sm" color="gray.400" mb={4} lineHeight="1.6">
                              Após obter a análise do modelo de IA, cole o texto abaixo e clique em Salvar.
                              A análise ficará vinculada a esta partida.
                            </Text>
                            <Textarea
                              value={aiResponse}
                              onChange={(e) => setAiResponse(e.target.value)}
                              placeholder="## DIAGNÓSTICO GERAL&#10;Cole aqui a análise completa gerada pela IA..."
                              bg="gray.900"
                              borderColor="gray.600"
                              color="white"
                              fontSize="sm"
                              fontFamily="mono"
                              _placeholder={{ color: 'gray.600' }}
                              _hover={{ borderColor: 'gray.500' }}
                              _focus={{ borderColor: 'purple.400' }}
                              rows={18}
                              resize="vertical"
                              borderRadius="lg"
                            />
                          </Box>

                          <HStack>
                            <Button
                              leftIcon={<MdSave />}
                              colorScheme="purple"
                              onClick={handleSaveResponse}
                              isDisabled={!aiResponse.trim()}
                            >
                              Salvar análise
                            </Button>
                            {isEditing && savedResponse && (
                              <Button
                                variant="ghost"
                                colorScheme="gray"
                                color="gray.400"
                                onClick={() => {
                                  setAiResponse(savedResponse)
                                  setIsEditing(false)
                                }}
                              >
                                Cancelar
                              </Button>
                            )}
                          </HStack>
                        </>
                      )}
                    </VStack>
                  </TabPanel>

                  {/* ──────────── Tab 3: Prompt do Agente ──────────── */}
                  <TabPanel p={0}>
                    <VStack align="stretch" spacing={5}>

                      {/* Explanation */}
                      <Box
                        bg="blue.900/20" borderRadius="xl"
                        borderWidth="1px" borderColor="blue.500/30" p={5}
                      >
                        <Flex align="center" gap={2} mb={2}>
                          <Text fontSize="xl">🧠</Text>
                          <Text fontSize="sm" fontWeight="bold" color="blue.300">O que é este prompt?</Text>
                        </Flex>
                        <Text fontSize="sm" color="gray.300" lineHeight="1.7">
                          Este é o <strong>System Prompt</strong> que define o comportamento do agente de IA como
                          um analista especialista em voleibol. Configure este prompt como instrução de sistema
                          em qualquer plataforma (ChatGPT, Claude, etc.) para obter análises mais precisas e padronizadas.
                        </Text>
                        <Text fontSize="sm" color="gray.400" mt={2} lineHeight="1.6">
                          Ao usar <strong>"Copiar tudo"</strong> na aba Dados, este prompt já é incluído automaticamente.
                        </Text>
                      </Box>

                      {/* How to use */}
                      <Box>
                        <Text fontSize="sm" fontWeight="bold" color="white" mb={3}>Como configurar o agente:</Text>
                        <VStack align="stretch" spacing={2}>
                          {[
                            { step: '1', platform: 'ChatGPT', desc: 'Configure → Instruções personalizadas → Cole o prompt abaixo' },
                            { step: '2', platform: 'Claude (claude.ai)', desc: 'Projetos → Criar projeto → Instrução do projeto → Cole o prompt' },
                            { step: '3', platform: 'Qualquer chat IA', desc: 'Inicie a conversa colando o prompt + os dados gerados na aba anterior' },
                          ].map((item) => (
                            <Flex key={item.step} align="flex-start" gap={3} p={3} bg="gray.900" borderRadius="lg">
                              <Flex
                                w={6} h={6} borderRadius="full" bg="blue.500"
                                align="center" justify="center" fontSize="xs" fontWeight="bold"
                                color="white" flexShrink={0} mt="1px"
                              >
                                {item.step}
                              </Flex>
                              <Box>
                                <Text fontSize="sm" fontWeight="bold" color="blue.200">{item.platform}</Text>
                                <Text fontSize="xs" color="gray.400">{item.desc}</Text>
                              </Box>
                            </Flex>
                          ))}
                        </VStack>
                      </Box>

                      <Divider borderColor="gray.700" />

                      {/* System prompt text */}
                      <Box>
                        <Flex align="center" justify="space-between" mb={3}>
                          <Text fontSize="sm" fontWeight="bold" color="white">Prompt do Agente Analista</Text>
                          <Button
                            leftIcon={<MdContentCopy />}
                            size="sm"
                            colorScheme="blue"
                            variant="outline"
                            onClick={handleCopySystemPrompt}
                          >
                            Copiar prompt
                          </Button>
                        </Flex>
                        <Box
                          bg="gray.950"
                          borderRadius="lg"
                          borderWidth="1px"
                          borderColor="gray.700"
                          overflow="hidden"
                        >
                          <Flex
                            align="center"
                            justify="space-between"
                            px={4}
                            py={2}
                            bg="gray.800"
                            borderBottom="1px"
                            borderColor="gray.700"
                          >
                            <Badge colorScheme="blue" variant="subtle">System Prompt</Badge>
                            <Text fontSize="xs" color="gray.500">agente_analista_volei.txt</Text>
                          </Flex>
                          <Box p={4} maxH="400px" overflowY="auto">
                            <Text
                              as="pre"
                              fontSize="xs"
                              color="cyan.300"
                              fontFamily="mono"
                              whiteSpace="pre-wrap"
                              lineHeight="1.7"
                            >
                              {AGENT_SYSTEM_PROMPT}
                            </Text>
                          </Box>
                        </Box>
                      </Box>

                    </VStack>
                  </TabPanel>

                </TabPanels>
              </Box>
            </Tabs>
          )}
        </>
      )}

      {/* ── Empty state (no match selected) ── */}
      {!selectedMatchId && !loadingMatches && matches.length > 0 && (
        <Flex
          direction="column"
          align="center"
          justify="center"
          py={16}
          gap={3}
          color="gray.600"
        >
          <Text fontSize="5xl">🏐</Text>
          <Text fontSize="lg" fontWeight="medium" color="gray.500">Selecione uma partida acima</Text>
          <Text fontSize="sm" color="gray.600">para gerar o relatório de análise com IA</Text>
        </Flex>
      )}
    </Box>
  )
}
