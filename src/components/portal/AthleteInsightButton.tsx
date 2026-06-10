'use client'

import { useState, useEffect, useCallback } from 'react'
import {
  Modal, ModalOverlay, ModalContent,
  Box, Flex, Text, Icon, IconButton,
} from '@chakra-ui/react'
import { IoSparkles, IoClose } from 'react-icons/io5'

const FONT_NUM  = 'var(--font-barlow), sans-serif'
const FONT_BODY = 'var(--font-jakarta), sans-serif'
const ACCENT    = '#22D3EE'

interface AthleteInsightButtonProps {
  teamId: string
  playerId: string
}

// ── Skeleton line ─────────────────────────────────────────────────────────────
function SkeletonLine({ w = '100%', delay = '0ms' }: { w?: string; delay?: string }) {
  return (
    <Box
      h="10px" borderRadius="full"
      style={{
        width: w,
        background: 'rgba(255,255,255,0.06)',
        animation: 'shimmer 1.6s ease-in-out infinite',
        animationDelay: delay,
      }}
    />
  )
}

// ── Insight text renderer ─────────────────────────────────────────────────────
function InsightText({ text }: { text: string }) {
  const lines = text
    .replace(/^```markdown\n?/m, '').replace(/\n?```$/m, '')
    .split('\n')

  return (
    <Box>
      {lines.map((line, i) => {
        if (!line.trim()) return <Box key={i} h="10px" />

        if (/^### /.test(line)) {
          return (
            <Flex key={i} align="center" gap={2} mt={i > 0 ? 5 : 0} mb={2}>
              <Box w="3px" h="14px" borderRadius="full" flexShrink={0} style={{ background: ACCENT }} />
              <Text
                fontSize="11px" fontWeight="700" letterSpacing="0.12em" textTransform="uppercase"
                style={{ color: 'rgba(255,255,255,0.4)', fontFamily: FONT_BODY }}
              >
                {line.replace(/^### /, '').replace(/\*\*/g, '')}
              </Text>
            </Flex>
          )
        }

        if (/^## /.test(line)) {
          return (
            <Text key={i} mt={i > 0 ? 6 : 0} mb={1}
              style={{ fontFamily: FONT_NUM, fontSize: '18px', fontWeight: 700, color: 'rgba(255,255,255,0.9)' }}
            >
              {line.replace(/^## /, '')}
            </Text>
          )
        }

        if (/^\*\*(.+)\*\*$/.test(line)) {
          return (
            <Text key={i} mb={1}
              style={{ fontFamily: FONT_BODY, fontSize: '13px', fontWeight: 700, color: 'rgba(255,255,255,0.85)' }}
            >
              {line.replace(/\*\*/g, '')}
            </Text>
          )
        }

        const rendered = line
          .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')

        return (
          <Text key={i} mb={1} lineHeight="1.7"
            style={{ fontFamily: FONT_BODY, fontSize: '13px', color: 'rgba(255,255,255,0.65)' }}
            dangerouslySetInnerHTML={{ __html: rendered }}
          />
        )
      })}
    </Box>
  )
}

// ── Main component ────────────────────────────────────────────────────────────
export function AthleteInsightButton({ teamId, playerId }: AthleteInsightButtonProps) {
  const [isOpen, setIsOpen]       = useState(false)
  const [text, setText]           = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [isEmpty, setIsEmpty]     = useState(false)

  const fetchInsight = useCallback(async () => {
    setIsLoading(true)
    setIsEmpty(false)
    setText(null)
    try {
      const params = new URLSearchParams({ type: 'player_dev', teamId, playerId })
      const res  = await fetch(`/api/ai/insights?${params}`)
      const data = await res.json()
      if (data.found) setText(data.insight.response)
      else setIsEmpty(true)
    } catch {
      setIsEmpty(true)
    } finally {
      setIsLoading(false)
    }
  }, [teamId, playerId])

  useEffect(() => {
    if (isOpen) fetchInsight()
  }, [isOpen, fetchInsight])

  return (
    <>
      {/* ── Trigger button ── */}
      <button
        onClick={() => setIsOpen(true)}
        style={{
          display: 'inline-flex',
          alignItems: 'center',
          gap: '6px',
          padding: '6px 12px',
          borderRadius: '8px',
          border: '1px solid rgba(34,211,238,0.25)',
          background: 'rgba(34,211,238,0.07)',
          cursor: 'pointer',
          transition: 'background 0.15s, border-color 0.15s',
          fontFamily: FONT_BODY,
          fontSize: '12px',
          fontWeight: 600,
          color: ACCENT,
          letterSpacing: '0.03em',
        }}
        onMouseEnter={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,211,238,0.13)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(34,211,238,0.4)'
        }}
        onMouseLeave={e => {
          (e.currentTarget as HTMLButtonElement).style.background = 'rgba(34,211,238,0.07)'
          ;(e.currentTarget as HTMLButtonElement).style.borderColor = 'rgba(34,211,238,0.25)'
        }}
      >
        <IoSparkles size={13} />
        Ver Insights
      </button>

      {/* ── Modal ── */}
      <Modal isOpen={isOpen} onClose={() => setIsOpen(false)} isCentered size="md">
        <ModalOverlay backdropFilter="blur(8px)" background="rgba(4,4,14,0.85)" />
        <ModalContent
          bg="transparent" boxShadow="none"
          mx={4} overflow="hidden"
          style={{ borderRadius: '24px' }}
        >
          {/* Gradient bar animado */}
          <Box
            h="2px"
            style={{
              background: 'linear-gradient(90deg, #22D3EE, #818CF8, #F472B6, #22D3EE)',
              backgroundSize: '200% 100%',
              animation: 'gradientShift 3s linear infinite',
            }}
          />

          {/* Container principal */}
          <Box
            style={{
              background: 'linear-gradient(160deg, #0E0E20 0%, #080810 100%)',
              border: '1px solid rgba(255,255,255,0.07)',
              borderTop: 'none',
              borderRadius: '0 0 24px 24px',
            }}
          >

            {/* Header */}
            <Flex align="flex-start" justify="space-between" px={5} pt={5} pb={4}>
              <Flex align="center" gap={3}>
                {/* Ícone com glow */}
                <Box
                  flexShrink={0}
                  style={{
                    width: '36px', height: '36px',
                    borderRadius: '10px',
                    background: 'rgba(34,211,238,0.1)',
                    border: '1px solid rgba(34,211,238,0.2)',
                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                    boxShadow: '0 0 16px rgba(34,211,238,0.15)',
                  }}
                >
                  <IoSparkles size={16} color={ACCENT} />
                </Box>

                <Box>
                  <Text
                    lineHeight={1} mb={0.5}
                    style={{ fontFamily: FONT_NUM, fontSize: '17px', fontWeight: 800, color: 'rgba(255,255,255,0.95)', letterSpacing: '-0.01em' }}
                  >
                    Relatório de IA
                  </Text>
                  <Text
                    style={{ fontFamily: FONT_BODY, fontSize: '11px', color: 'rgba(255,255,255,0.3)' }}
                  >
                    Análise de desempenho personalizada
                  </Text>
                </Box>
              </Flex>

              <IconButton
                aria-label="Fechar"
                icon={<Icon as={IoClose} boxSize={4} />}
                size="sm" variant="ghost"
                color="whiteAlpha.400"
                onClick={() => setIsOpen(false)}
                _hover={{ color: 'white', bg: 'whiteAlpha.100' }}
                borderRadius="full"
                mt={-1} mr={-1}
              />
            </Flex>

            {/* Separador */}
            <Box mx={5} h="1px" style={{ background: 'rgba(255,255,255,0.06)' }} />

            {/* Conteúdo */}
            <Box px={5} pt={4} pb={5} maxH="60vh" overflowY="auto"
              css={{
                '&::-webkit-scrollbar': { width: '3px' },
                '&::-webkit-scrollbar-thumb': { background: 'rgba(255,255,255,0.1)', borderRadius: '2px' },
              }}
            >
              {isLoading && (
                <Flex direction="column" gap={3} py={2}>
                  <SkeletonLine w="92%" delay="0ms" />
                  <SkeletonLine w="100%" delay="80ms" />
                  <SkeletonLine w="78%" delay="160ms" />
                  <Box h="4px" />
                  <SkeletonLine w="88%" delay="240ms" />
                  <SkeletonLine w="95%" delay="320ms" />
                  <SkeletonLine w="60%" delay="400ms" />
                </Flex>
              )}

              {isEmpty && !isLoading && (
                <Flex direction="column" align="center" py={8} gap={3}>
                  <Box
                    style={{
                      width: '48px', height: '48px', borderRadius: '14px',
                      background: 'rgba(255,255,255,0.04)',
                      border: '1px solid rgba(255,255,255,0.07)',
                      display: 'flex', alignItems: 'center', justifyContent: 'center',
                    }}
                  >
                    <IoSparkles size={20} color="rgba(255,255,255,0.15)" />
                  </Box>
                  <Text textAlign="center" style={{ fontFamily: FONT_BODY, fontSize: '13px', color: 'rgba(255,255,255,0.3)', lineHeight: 1.6 }}>
                    Nenhum relatório disponível ainda.
                    <br />Aguarde seu treinador gerar uma análise.
                  </Text>
                </Flex>
              )}

              {text && !isLoading && <InsightText text={text} />}
            </Box>

            {/* Footer */}
            <Box mx={5} h="1px" style={{ background: 'rgba(255,255,255,0.04)' }} />
            <Flex align="center" justify="center" gap={1.5} py={3}>
              <IoSparkles size={10} color="rgba(255,255,255,0.15)" />
              <Text style={{ fontFamily: FONT_BODY, fontSize: '10px', color: 'rgba(255,255,255,0.2)', letterSpacing: '0.06em' }}>
                GERADO POR IA
              </Text>
            </Flex>

          </Box>
        </ModalContent>
      </Modal>

      {/* Keyframes globais */}
      <style>{`
        @keyframes shimmer {
          0%, 100% { opacity: 0.4; }
          50% { opacity: 1; }
        }
        @keyframes gradientShift {
          0% { background-position: 0% 50%; }
          100% { background-position: 200% 50%; }
        }
      `}</style>
    </>
  )
}
