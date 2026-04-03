'use client'

/**
 * AIStreamingPanel — Painel que renderiza respostas de IA
 * Suporta streaming SSE (Tier A) e respostas completas (Tier B)
 * Mostra badge de cache + botão regenerar
 *
 * Props extras:
 *   embedded    — omite o header colapsável (para uso dentro de Drawer/Modal)
 *   autoGenerate — dispara geração automaticamente se não houver cache
 */

import React, { useState, useCallback, useRef, useEffect } from 'react'
import {
  Box, Button, Flex, Text, Badge, Icon, Collapse,
  useDisclosure, Spinner, useToast,
} from '@chakra-ui/react'
import { IoSparkles, IoRefresh, IoChevronDown, IoChevronUp, IoTrash } from 'react-icons/io5'
import type { AIInsightType } from '@/lib/ai/types'

interface AIStreamingPanelProps {
  type: AIInsightType
  teamId: string
  matchId?: string
  playerId?: string
  metricKey?: string
  label?: string
  /** Se true, inicia aberto */
  defaultOpen?: boolean
  /** Omite o header colapsável — para uso dentro de Drawer ou Modal */
  embedded?: boolean
  /** Dispara geração automaticamente se não houver cache */
  autoGenerate?: boolean
}

interface InsightData {
  id: string
  response: string
  cached: boolean
  createdAt: string
  provider: string
  tokensUsed?: number | null
  costEstimate?: number | null
}

export default function AIStreamingPanel({
  type,
  teamId,
  matchId,
  playerId,
  metricKey,
  label = 'Análise com IA',
  defaultOpen = false,
  embedded = false,
  autoGenerate = false,
}: AIStreamingPanelProps) {
  const { isOpen, onToggle } = useDisclosure({ defaultIsOpen: embedded || defaultOpen })
  const [insight, setInsight] = useState<InsightData | null>(null)
  const [streamingText, setStreamingText] = useState('')
  const [isLoading, setIsLoading] = useState(false)
  const [isStreaming, setIsStreaming] = useState(false)
  const [hasCheckedCache, setHasCheckedCache] = useState(false)
  const [errorMsg, setErrorMsg] = useState<string | null>(null)
  const [confirmingRegenerate, setConfirmingRegenerate] = useState(false)
  const toast = useToast()
  const abortRef = useRef<AbortController | null>(null)
  const contentRef = useRef<HTMLDivElement>(null)

  // Auto-scroll durante streaming
  useEffect(() => {
    if (isStreaming && contentRef.current) {
      contentRef.current.scrollTop = contentRef.current.scrollHeight
    }
  }, [streamingText, isStreaming])

  // Checar cache ao abrir
  useEffect(() => {
    if (isOpen && !hasCheckedCache && !insight && !isLoading) {
      checkCache()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [isOpen])

  // Auto-generate após cache check se não há insight
  useEffect(() => {
    if (autoGenerate && hasCheckedCache && !insight && !isLoading && !isStreaming && !streamingText) {
      generate(false)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [autoGenerate, hasCheckedCache])

  const checkCache = useCallback(async () => {
    try {
      const params = new URLSearchParams({ type, teamId })
      if (matchId) params.set('matchId', matchId)
      if (playerId) params.set('playerId', playerId)
      if (metricKey) params.set('metricKey', metricKey)

      const res = await fetch(`/api/ai/insights?${params}`)
      const data = await res.json()
      if (data.found) {
        setInsight(data.insight)
      }
      setHasCheckedCache(true)
    } catch {
      setHasCheckedCache(true)
    }
  }, [type, teamId, matchId, playerId, metricKey])

  const generate = useCallback(async (forceRegenerate = false) => {
    setIsLoading(true)
    setStreamingText('')
    setErrorMsg(null)
    abortRef.current = new AbortController()

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, teamId, matchId, playerId, metricKey, forceRegenerate }),
        signal: abortRef.current.signal,
      })

      if (!res.ok) {
        const err = await res.json()
        const msg = err.error || 'Erro ao gerar análise'
        if (res.status === 503) {
          setErrorMsg(msg)
          setIsLoading(false)
          return
        }
        if (res.status === 429) {
          setErrorMsg('Aguarde alguns segundos antes de tentar novamente.')
          setIsLoading(false)
          return
        }
        throw new Error(msg)
      }

      const contentType = res.headers.get('Content-Type') || ''

      if (contentType.includes('text/event-stream')) {
        // Streaming (Tier A)
        setIsStreaming(true)
        setIsLoading(false)
        const reader = res.body!.getReader()
        const decoder = new TextDecoder()
        let fullText = ''

        try {
          while (true) {
            const { done, value } = await reader.read()
            if (done) break

            const chunk = decoder.decode(value, { stream: true })
            const lines = chunk.split('\n')

            for (const line of lines) {
              if (line.startsWith('data: ')) {
                const data = line.slice(6)
                if (data === '[DONE]') continue
                try {
                  const parsed = JSON.parse(data)
                  if (parsed.text) {
                    fullText += parsed.text
                    setStreamingText(fullText)
                  }
                } catch {
                  // ignore parse errors
                }
              }
            }
          }
        } catch (streamErr: any) {
          if (!fullText) throw streamErr
        }

        setIsStreaming(false)
        await checkCache()
      } else {
        // JSON completo (Tier B ou cache)
        const data = await res.json()
        setInsight(data.insight)
        setIsLoading(false)
      }
    } catch (err: any) {
      if (err.name !== 'AbortError') {
        toast({
          title: 'Erro ao gerar análise',
          description: err.message,
          status: 'error',
          duration: 5000,
        })
      }
      setIsLoading(false)
      setIsStreaming(false)
    }
  }, [type, teamId, matchId, playerId, metricKey, toast, checkCache])

  const handleDelete = useCallback(async () => {
    if (!insight) return
    try {
      await fetch(`/api/ai/insights/${insight.id}`, { method: 'DELETE' })
      setInsight(null)
      setStreamingText('')
      setHasCheckedCache(false)
      toast({ title: 'Análise removida', status: 'info', duration: 2000 })
    } catch {
      toast({ title: 'Erro ao remover', status: 'error', duration: 3000 })
    }
  }, [insight, toast])

  const displayText = insight?.response || streamingText
  const showGenerateButton = !insight && !isLoading && !isStreaming && !streamingText
  const createdAt = insight?.createdAt
    ? new Date(insight.createdAt).toLocaleDateString('pt-BR', {
        day: '2-digit', month: '2-digit', year: 'numeric',
        hour: '2-digit', minute: '2-digit',
      })
    : null

  // ── Conteúdo interno (reutilizado em ambos os modos) ─────────────────────────
  const content = (
    <Box px={embedded ? 0 : 5} pb={embedded ? 0 : 5}>
      {/* Botão de gerar */}
      {showGenerateButton && (
        <Button
          leftIcon={<IoSparkles />}
          colorScheme="purple"
          size="md"
          onClick={() => generate(false)}
          w="full"
        >
          Analisar com IA
        </Button>
      )}

      {/* Error message */}
      {errorMsg && (
        <Box bg="red.900/30" border="1px solid" borderColor="red.700/50" borderRadius="lg" p={4} mt={2}>
          <Text color="red.300" fontSize="sm">{errorMsg}</Text>
          <Button size="xs" variant="ghost" color="red.300" mt={2} onClick={() => setErrorMsg(null)}>
            Fechar
          </Button>
        </Box>
      )}

      {/* Loading */}
      {isLoading && (
        <Flex align="center" justify="center" py={8} gap={3}>
          <Spinner size="md" color="purple.400" />
          <Text color="gray.400">Gerando análise...</Text>
        </Flex>
      )}

      {/* Streaming indicator */}
      {isStreaming && !displayText && (
        <Flex align="center" justify="center" py={8} gap={3}>
          <Spinner size="md" color="purple.400" />
          <Text color="gray.400">Conectando com a IA...</Text>
        </Flex>
      )}

      {/* Conteúdo da análise */}
      {displayText && (
        <>
          <Box
            ref={contentRef}
            overflowY="auto"
            bg={embedded ? 'transparent' : 'gray.900'}
            borderRadius="lg"
            p={embedded ? 0 : 4}
            fontSize="sm"
            color="gray.200"
            lineHeight="1.7"
            whiteSpace="pre-wrap"
            sx={{
              'h2': { color: 'white', fontWeight: 'bold', fontSize: 'md', mt: 4, mb: 2 },
              'h3': { color: 'gray.100', fontWeight: 'semibold', fontSize: 'sm', mt: 3, mb: 1 },
              'strong': { color: 'white' },
              '&::-webkit-scrollbar': { width: '6px' },
              '&::-webkit-scrollbar-track': { bg: 'gray.800' },
              '&::-webkit-scrollbar-thumb': { bg: 'gray.600', borderRadius: '3px' },
            }}
            dangerouslySetInnerHTML={{
              __html: formatMarkdown(displayText),
            }}
          />

          {/* Rodapé com meta info e ações */}
          <Flex mt={3} align="center" justify="space-between" flexWrap="wrap" gap={2}>
            <Flex align="center" gap={2} flexWrap="wrap">
              {createdAt && (
                <Text color="gray.500" fontSize="xs">
                  Gerado em {createdAt}
                </Text>
              )}
              {insight?.costEstimate != null && (
                <Text color="gray.600" fontSize="xs">
                  ~ R$ {insight.costEstimate.toFixed(4)}
                </Text>
              )}
              {isStreaming && (
                <Badge colorScheme="purple" variant="subtle" fontSize="2xs">
                  Streaming...
                </Badge>
              )}
            </Flex>
            {(insight || streamingText) && !isStreaming && (
              <Flex gap={2} align="center">
                {confirmingRegenerate ? (
                  <>
                    <Text color="gray.400" fontSize="xs">Substituir análise atual?</Text>
                    <Button size="xs" colorScheme="purple" onClick={() => { setConfirmingRegenerate(false); generate(true) }}>
                      Confirmar
                    </Button>
                    <Button size="xs" variant="ghost" colorScheme="gray" onClick={() => setConfirmingRegenerate(false)}>
                      Cancelar
                    </Button>
                  </>
                ) : (
                  <>
                    <Button
                      leftIcon={<IoRefresh />}
                      size="xs"
                      variant="ghost"
                      colorScheme="purple"
                      onClick={() => setConfirmingRegenerate(true)}
                    >
                      Novo insight
                    </Button>
                    {insight && (
                      <Button
                        leftIcon={<IoTrash />}
                        size="xs"
                        variant="ghost"
                        colorScheme="red"
                        onClick={handleDelete}
                      >
                        Remover
                      </Button>
                    )}
                  </>
                )}
              </Flex>
            )}
          </Flex>
        </>
      )}
    </Box>
  )

  // ── Modo embedded: sem header colapsável ──────────────────────────────────────
  if (embedded) {
    return content
  }

  // ── Modo padrão: card colapsável ──────────────────────────────────────────────
  return (
    <Box
      bg="gray.800"
      borderRadius="xl"
      borderWidth="1px"
      borderColor="gray.700"
      overflow="hidden"
    >
      {/* Header clicável */}
      <Flex
        as="button"
        w="full"
        px={5}
        py={4}
        align="center"
        justify="space-between"
        onClick={onToggle}
        _hover={{ bg: 'gray.750' }}
        transition="background 0.15s"
      >
        <Flex align="center" gap={3}>
          <Icon as={IoSparkles} color="purple.400" boxSize={5} />
          <Text color="white" fontWeight="600" fontSize="md">
            {label}
          </Text>
          {insight?.cached && (
            <Badge colorScheme="purple" variant="subtle" fontSize="xs">
              Em cache
            </Badge>
          )}
          {insight?.provider && (
            <Badge
              colorScheme={insight.provider === 'anthropic' ? 'blue' : 'green'}
              variant="outline"
              fontSize="2xs"
            >
              {insight.provider === 'anthropic' ? 'Claude' : 'GPT-4o-mini'}
            </Badge>
          )}
        </Flex>
        <Icon as={isOpen ? IoChevronUp : IoChevronDown} color="gray.400" />
      </Flex>

      {/* Conteúdo colapsável */}
      <Collapse in={isOpen} animateOpacity>
        {content}
      </Collapse>
    </Box>
  )
}

/** Converte markdown básico em HTML para renderização */
function formatMarkdown(text: string): string {
  return text
    .replace(/^```markdown\n?/m, '')
    .replace(/\n?```$/m, '')
    .replace(/^### (.+)$/gm, '<h3>$1</h3>')
    .replace(/^## (.+)$/gm, '<h2>$1</h2>')
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^[-•] (.+)$/gm, '&nbsp;&nbsp;• $1')
    .replace(/\n/g, '<br/>')
}
