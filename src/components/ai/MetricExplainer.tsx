'use client'

import { useState } from 'react'
import {
  IconButton,
  Popover,
  PopoverTrigger,
  PopoverContent,
  PopoverBody,
  PopoverArrow,
  Text,
  Spinner,
  HStack,
} from '@chakra-ui/react'
import { FiHelpCircle } from 'react-icons/fi'

interface MetricExplainerProps {
  metricKey: string
  teamId: string
  value?: string
  size?: 'xs' | 'sm'
}

export default function MetricExplainer({ metricKey, teamId, value, size = 'xs' }: MetricExplainerProps) {
  const [explanation, setExplanation] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState(false)

  async function handleOpen() {
    if (explanation || loading) return

    setLoading(true)
    setError(false)

    try {
      // Check cache first
      const params = new URLSearchParams({ type: 'metric_explainer', teamId, metricKey })
      const cacheRes = await fetch(`/api/ai/insights?${params}`)
      if (cacheRes.ok) {
        const cached = await cacheRes.json()
        if (cached) {
          setExplanation(cached.response)
          setLoading(false)
          return
        }
      }

      // Generate
      const res = await fetch('/api/ai/generate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          type: 'metric_explainer',
          teamId,
          metricKey,
          value,
        }),
      })

      if (!res.ok) throw new Error('Falha ao gerar')

      const data = await res.json()
      setExplanation(data.insight?.response ?? 'Sem explicação disponível.')
    } catch {
      setError(true)
    } finally {
      setLoading(false)
    }
  }

  return (
    <Popover trigger="click" placement="top" onOpen={handleOpen}>
      <PopoverTrigger>
        <IconButton
          aria-label="Explicar métrica"
          icon={<FiHelpCircle />}
          size={size}
          variant="ghost"
          opacity={0.4}
          _hover={{ opacity: 0.8 }}
          minW="auto"
          h="auto"
          p={0.5}
        />
      </PopoverTrigger>
      <PopoverContent bg="gray.800" borderColor="gray.600" maxW="280px">
        <PopoverArrow bg="gray.800" />
        <PopoverBody p={3}>
          {loading && (
            <HStack justify="center" py={2}>
              <Spinner size="sm" color="blue.300" />
              <Text fontSize="12px" color="gray.400">Gerando explicação...</Text>
            </HStack>
          )}
          {error && (
            <Text fontSize="12px" color="red.300">Não foi possível gerar a explicação.</Text>
          )}
          {explanation && (
            <Text fontSize="12px" color="gray.200" lineHeight="1.5">
              {explanation}
            </Text>
          )}
        </PopoverBody>
      </PopoverContent>
    </Popover>
  )
}
