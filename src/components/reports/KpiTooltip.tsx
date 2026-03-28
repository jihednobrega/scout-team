'use client'

import { Box, Flex, Text } from '@chakra-ui/react'
import { useState, useRef, useEffect } from 'react'
import { Kpi } from '@/types/volleyball'

interface KpiTooltipProps {
  kpi: Kpi
  children: React.ReactNode
}

export default function KpiTooltip({ kpi, children }: KpiTooltipProps) {
  const [isVisible, setIsVisible] = useState(false)
  const [position, setPosition] = useState({ top: 0, left: 0 })
  const triggerRef = useRef<HTMLDivElement>(null)
  const tooltipRef = useRef<HTMLDivElement>(null)

  useEffect(() => {
    if (isVisible && triggerRef.current && tooltipRef.current) {
      const triggerRect = triggerRef.current.getBoundingClientRect()
      const tooltipRect = tooltipRef.current.getBoundingClientRect()

      // Posiciona acima do elemento
      let top = triggerRect.top - tooltipRect.height - 8
      let left = triggerRect.left + triggerRect.width / 2 - tooltipRect.width / 2

      // Ajusta se sair da tela
      if (top < 0) {
        top = triggerRect.bottom + 8
      }
      if (left < 0) {
        left = 8
      }
      if (left + tooltipRect.width > window.innerWidth) {
        left = window.innerWidth - tooltipRect.width - 8
      }

      setPosition({ top, left })
    }
  }, [isVisible])

  return (
    <>
      <Box
        ref={triggerRef}
        display="inline-flex"
        alignItems="center"
        onMouseEnter={() => setIsVisible(true)}
        onMouseLeave={() => setIsVisible(false)}
        onFocus={() => setIsVisible(true)}
        onBlur={() => setIsVisible(false)}
        tabIndex={0}
        cursor="help"
      >
        {children}
      </Box>

      {isVisible && (
        <Box
          ref={tooltipRef}
          position="fixed"
          top={`${position.top}px`}
          left={`${position.left}px`}
          zIndex={9999}
          bg="gray.900"
          borderWidth="1px"
          borderColor="gray.600"
          borderRadius="lg"
          p={4}
          maxW="320px"
          shadow="2xl"
          pointerEvents="none"
        >
          <Text fontSize="sm" fontWeight="bold" color="white" mb={2}>
            {kpi.label}
          </Text>

          <Text fontSize="xs" color="gray.300" mb={3} lineHeight="1.5">
            {kpi.explanation}
          </Text>

          <Box bg="gray.800" borderRadius="md" p={2} mb={3}>
            <Text fontSize="xs" color="gray.400" mb={1}>
              Fórmula:
            </Text>
            <Text fontSize="xs" color="blue.300" fontFamily="mono">
              {kpi.formula}
            </Text>
          </Box>

          {kpi.bounds && (
            <Box>
              <Text fontSize="xs" color="gray.400" mb={1}>
                Referência:
              </Text>
              <Flex gap={2} flexWrap="wrap">
                {kpi.bounds.min !== undefined && (
                  <Text fontSize="xs" color="gray.500">
                    Mín: {kpi.bounds.min}
                  </Text>
                )}
                {kpi.bounds.max !== undefined && (
                  <Text fontSize="xs" color="gray.500">
                    Máx: {kpi.bounds.max}
                  </Text>
                )}
                {kpi.bounds.ideal && (
                  <Text fontSize="xs" color="green.400">
                    Ideal: {kpi.bounds.ideal}
                  </Text>
                )}
              </Flex>
            </Box>
          )}

          {kpi.sampleSize === 0 && (
            <Box mt={2} p={2} bg="yellow.900/20" borderRadius="md">
              <Text fontSize="xs" color="yellow.400">
                ⚠️ Amostra insuficiente para cálculo preciso
              </Text>
            </Box>
          )}
        </Box>
      )}
    </>
  )
}
