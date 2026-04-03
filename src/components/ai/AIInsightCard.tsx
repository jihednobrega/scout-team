'use client'

/**
 * AIInsightCard — Card compacto para insights Tier B (GPT-4o-mini)
 * Usado nos portais e páginas de histórico
 * Client component que pode ser embeddado em server components
 */

import React, { useState, useCallback, useEffect } from 'react'
import { Box, Flex, Text, Button, Spinner, Icon } from '@chakra-ui/react'
import { IoSparkles, IoRefresh } from 'react-icons/io5'
import type { AIInsightType } from '@/lib/ai/types'

interface AIInsightCardProps {
  type: AIInsightType
  teamId: string
  matchId?: string
  playerId?: string
  metricKey?: string
  accent?: string
}

export default function AIInsightCard({
  type,
  teamId,
  matchId,
  playerId,
  metricKey,
  accent = '#A78BFA',
}: AIInsightCardProps) {
  const [text, setText] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [error, setError] = useState<string | null>(null)
  const [cached, setCached] = useState(false)

  // Checar cache ao montar
  useEffect(() => {
    checkCache()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type, matchId, playerId, teamId])

  const checkCache = useCallback(async () => {
    try {
      const params = new URLSearchParams({ type, teamId })
      if (matchId) params.set('matchId', matchId)
      if (playerId) params.set('playerId', playerId)
      if (metricKey) params.set('metricKey', metricKey)

      const res = await fetch(`/api/ai/insights?${params}`)
      const data = await res.json()
      if (data.found) {
        setText(data.insight.response)
        setCached(true)
      }
    } catch {
      // silently fail cache check
    }
  }, [type, teamId, matchId, playerId, metricKey])

  const generate = useCallback(async (forceRegenerate = false) => {
    setIsLoading(true)
    setError(null)

    try {
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ type, teamId, matchId, playerId, metricKey, forceRegenerate }),
      })

      if (!res.ok) {
        const err = await res.json()
        const msg = err.error || 'Erro ao gerar insight'
        if (res.status === 429) {
          setError('Aguarde alguns segundos antes de tentar novamente.')
          setIsLoading(false)
          return
        }
        throw new Error(msg)
      }

      const data = await res.json()
      setText(data.insight.response)
      setCached(data.cached)
    } catch (err: any) {
      setError(err.message)
    } finally {
      setIsLoading(false)
    }
  }, [type, teamId, matchId, playerId, metricKey])

  // Sem texto e sem loading → mostra botão
  if (!text && !isLoading && !error) {
    return (
      <Box
        borderRadius="14px"
        overflow="hidden"
        style={{
          background: 'rgba(255,255,255,0.028)',
          border: '1px solid rgba(255,255,255,0.07)',
        }}
      >
        <Button
          w="full"
          variant="ghost"
          color="whiteAlpha.600"
          py={6}
          onClick={() => generate(false)}
          _hover={{ bg: 'whiteAlpha.50', color: 'white' }}
          leftIcon={<Icon as={IoSparkles} color={accent} />}
          fontSize="sm"
        >
          Gerar insight com IA
        </Button>
      </Box>
    )
  }

  return (
    <Box
      position="relative"
      borderRadius="14px"
      overflow="hidden"
      style={{
        background: 'rgba(255,255,255,0.028)',
        border: '1px solid rgba(255,255,255,0.07)',
      }}
    >
      {/* Barra de acento */}
      <Box position="absolute" left={0} top={0} bottom={0} w="3px" style={{ background: accent }} />

      <Box pl={5} pr={4} py={3.5}>
        {/* Header */}
        <Flex align="center" justify="space-between" mb={2}>
          <Flex align="center" gap={1.5}>
            <Icon as={IoSparkles} boxSize={3.5} style={{ color: accent }} />
            <Text fontSize="9px" fontWeight="700" letterSpacing="0.12em" textTransform="uppercase" color="whiteAlpha.400">
              Insight IA
            </Text>
          </Flex>
          {text && !isLoading && (
            <Button
              size="xs"
              variant="ghost"
              color="whiteAlpha.400"
              onClick={() => generate(true)}
              _hover={{ color: 'white' }}
              p={1}
              minW="auto"
              h="auto"
            >
              <Icon as={IoRefresh} boxSize={3} />
            </Button>
          )}
        </Flex>

        {/* Loading */}
        {isLoading && (
          <Flex align="center" gap={2} py={2}>
            <Spinner size="xs" color={accent} />
            <Text fontSize="xs" color="whiteAlpha.500">Gerando insight...</Text>
          </Flex>
        )}

        {/* Error */}
        {error && (
          <Text fontSize="xs" color="red.400" py={1}>
            {error}
          </Text>
        )}

        {/* Texto do insight */}
        {text && !isLoading && (
          <Text fontSize="13px" color="whiteAlpha.800" lineHeight="1.65">
            {text}
          </Text>
        )}
      </Box>
    </Box>
  )
}
