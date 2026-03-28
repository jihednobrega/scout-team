'use client'

import { useState } from 'react'
import { Box, Flex, Text, HStack, VStack, Grid } from '@chakra-ui/react'
import { PlayerMatchModal, type PlayerModalData } from './PlayerMatchModal'

const POSITION_LABELS: Record<string, string> = {
  setter: 'Levantador', opposite: 'Oposto', outside: 'Ponteiro',
  middle: 'Central', libero: 'Líbero', universal: 'Universal',
}

const FONT_NUM  = 'var(--font-barlow), sans-serif'
const FONT_BODY = 'var(--font-jakarta), sans-serif'

function ratingHex(r: number): string {
  if (r >= 7)   return '#22C55E'
  if (r >= 5.5) return '#22D3EE'
  if (r >= 4)   return '#FBBF24'
  return '#F87171'
}

const FUND_CONFIG: Record<string, { icon: string; hex: string; gradient: string }> = {
  'Saque':        { icon: '/icons/serve.svg',     hex: '#38BDF8', gradient: 'linear-gradient(90deg,#0369A1,#38BDF8)' },
  'Recepção':     { icon: '/icons/reception.svg', hex: '#4ADE80', gradient: 'linear-gradient(90deg,#166534,#4ADE80)' },
  'Ataque':       { icon: '/icons/attack.svg',    hex: '#F87171', gradient: 'linear-gradient(90deg,#9B2C2C,#F87171)' },
  'Bloqueio':     { icon: '/icons/block.svg',     hex: '#FB923C', gradient: 'linear-gradient(90deg,#9C4221,#FB923C)' },
  'Defesa':       { icon: '/icons/defense.svg',   hex: '#A78BFA', gradient: 'linear-gradient(90deg,#4C1D95,#A78BFA)' },
  'Levantamento': { icon: '/icons/set.svg',       hex: '#FCD34D', gradient: 'linear-gradient(90deg,#92400E,#FCD34D)' },
}

const FUND_ACTION_MAP: Record<string, string> = {
  serve: 'Saque', reception: 'Recepção', attack: 'Ataque',
  block: 'Bloqueio', dig: 'Defesa', set: 'Levantamento',
}

function fmt(v: number) {
  return `${Math.round(v * 100)}%`
}

export function TreinadorPlayerList({
  rows,
  matchId,
}: {
  rows: PlayerModalData[]
  matchId: string
}) {
  const [selected, setSelected] = useState<PlayerModalData | null>(null)

  return (
    <>
      <Grid templateColumns={{ base: '1fr', md: 'repeat(2, 1fr)' }} gap={2}>
        {rows.map((p) => {
          const overallRating = p.rating.friendlyRating
          const kills = p.stats.attack.kills
          const aces  = p.stats.serve.aces

          // Fundamentos com ações nesta partida
          const funds = Object.entries(FUND_ACTION_MAP)
            .map(([action, label]) => {
              const fundStats = action === 'dig' ? p.stats.defense : p.stats[action as keyof typeof p.stats]
              if (!fundStats || typeof fundStats !== 'object' || !('total' in fundStats) || (fundStats as { total: number }).total === 0) return null
              const fundRating = p.rating.ratingByFundamental[action]?.friendly ?? 0
              const cfg = FUND_CONFIG[label]

              let mainVal = ''
              if (action === 'serve')     mainVal = fmt(p.stats.serve.efficiency)
              else if (action === 'reception') mainVal = fmt(p.stats.reception.positivity)
              else if (action === 'attack')    mainVal = fmt(p.stats.attack.efficiency)
              else if (action === 'block')     mainVal = `${p.stats.block.pointsPerSet.toFixed(1)}`
              else if (action === 'dig')       mainVal = fmt(p.stats.defense.efficiency)
              else if (action === 'set')       mainVal = fmt(p.stats.set.total > 0 ? p.stats.set.perfect / p.stats.set.total : 0)

              return { label, cfg, mainVal, fundRating }
            })
            .filter(Boolean) as { label: string; cfg: typeof FUND_CONFIG[string]; mainVal: string; fundRating: number }[]

          return (
            <Box
              key={p.id}
              as="button"
              w="full"
              textAlign="left"
              borderRadius="16px"
              overflow="hidden"
              bg="rgba(255,255,255,0.028)"
              border="1px solid"
              borderColor="rgba(255,255,255,0.07)"
              cursor="pointer"
              transition="all 0.15s"
              _hover={{ bg: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.16)' }}
              onClick={() => setSelected(p)}
            >
              {/* Header do atleta */}
              <Flex align="center" gap={3} px={4} pt={3.5} pb={3}
                borderBottom="1px solid" borderColor="rgba(255,255,255,0.05)">
                {/* Foto */}
                <Box
                  w="38px" h="38px" borderRadius="10px" overflow="hidden" flexShrink={0}
                  bg="rgba(255,255,255,0.06)" border="1px solid" borderColor="rgba(255,255,255,0.1)"
                >
                  {p.photo ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={p.photo} alt={p.name}
                      style={{ width: '100%', height: '100%', objectFit: 'cover', display: 'block' }} />
                  ) : (
                    <Flex w="full" h="full" align="center" justify="center">
                      <Text style={{ fontFamily: FONT_NUM, fontSize: '11px', fontWeight: 700, color: 'rgba(255,255,255,0.3)' }}>
                        #{p.jerseyNumber}
                      </Text>
                    </Flex>
                  )}
                </Box>

                {/* Nome + posição */}
                <Box flex={1} minW={0}>
                  <Text noOfLines={1} style={{ fontFamily: FONT_NUM, fontSize: '14px', fontWeight: 700, color: 'white' }}>
                    {p.name}
                  </Text>
                  <Text fontSize="10px" style={{ color: 'rgba(255,255,255,0.3)', fontFamily: FONT_BODY }}>
                    #{p.jerseyNumber} · {POSITION_LABELS[p.position] ?? p.position}
                  </Text>
                </Box>

                {/* Stats + rating + seta */}
                <HStack spacing={2} flexShrink={0}>
                  {kills > 0 && (
                    <VStack spacing={0} align="center">
                      <Text style={{ fontFamily: FONT_NUM, fontSize: '13px', fontWeight: 700, color: '#4ADE80' }}>{kills}</Text>
                      <Text fontSize="8px" textTransform="uppercase"
                        style={{ color: 'rgba(255,255,255,0.25)', fontFamily: FONT_BODY }}>kills</Text>
                    </VStack>
                  )}
                  {aces > 0 && (
                    <VStack spacing={0} align="center">
                      <Text style={{ fontFamily: FONT_NUM, fontSize: '13px', fontWeight: 700, color: '#FB923C' }}>{aces}</Text>
                      <Text fontSize="8px" textTransform="uppercase"
                        style={{ color: 'rgba(255,255,255,0.25)', fontFamily: FONT_BODY }}>aces</Text>
                    </VStack>
                  )}
                  <Box px={2} py={0.5} borderRadius="7px"
                    bg={`${ratingHex(overallRating)}15`}
                    border="1px solid" borderColor={`${ratingHex(overallRating)}40`}>
                    <Text style={{ fontFamily: FONT_NUM, fontSize: '12px', fontWeight: 700, color: ratingHex(overallRating) }}>
                      {overallRating.toFixed(1)}
                    </Text>
                  </Box>
                  <Text fontSize="14px" style={{ color: 'rgba(255,255,255,0.2)' }}>›</Text>
                </HStack>
              </Flex>

              {/* Fundamentos mini */}
              {funds.length > 0 && (
                <Flex px={4} py={3} gap={0} flexWrap="wrap">
                  {funds.map((f, i) => (
                    <Flex
                      key={f.label} align="center" gap={2} pr={4} mr={4}
                      borderRight={i < funds.length - 1 ? '1px solid' : 'none'}
                      borderColor="rgba(255,255,255,0.06)"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src={f.cfg.icon} alt="" width={18} height={18}
                        style={{ display: 'block', objectFit: 'contain', opacity: 0.7 }} />
                      <Box>
                        <Text lineHeight={1}
                          style={{ fontFamily: FONT_NUM, fontSize: '14px', fontWeight: 700, color: f.cfg.hex }}>
                          {f.mainVal}
                        </Text>
                        <Flex align="center" gap={1} mt={0.5}>
                          <Box px={1} borderRadius="4px"
                            bg={`${ratingHex(f.fundRating)}18`}
                            border="1px solid" borderColor={`${ratingHex(f.fundRating)}35`}>
                            <Text style={{ fontFamily: FONT_NUM, fontSize: '9px', fontWeight: 700, color: ratingHex(f.fundRating) }}>
                              {f.fundRating.toFixed(1)}
                            </Text>
                          </Box>
                          <Text fontSize="8px" textTransform="uppercase"
                            style={{ color: 'rgba(255,255,255,0.2)', fontFamily: FONT_BODY }}>
                            {f.label}
                          </Text>
                        </Flex>
                      </Box>
                    </Flex>
                  ))}
                </Flex>
              )}

              {/* Barras de progresso */}
              {(p.stats.attack.total > 0 || p.stats.reception.total > 0) && (
                <Flex px={4} pb={3} gap={2}>
                  {p.stats.attack.total > 0 && (
                    <Box flex={1} h="2px" borderRadius="full" bg="rgba(255,255,255,0.06)">
                      <Box h="full" borderRadius="full" style={{
                        width: fmt(Math.max(0, p.stats.attack.efficiency + 0.5)),
                        background: FUND_CONFIG['Ataque'].gradient,
                      }} />
                    </Box>
                  )}
                  {p.stats.reception.total > 0 && (
                    <Box flex={1} h="2px" borderRadius="full" bg="rgba(255,255,255,0.06)">
                      <Box h="full" borderRadius="full" style={{
                        width: fmt(p.stats.reception.positivity),
                        background: FUND_CONFIG['Recepção'].gradient,
                      }} />
                    </Box>
                  )}
                </Flex>
              )}
            </Box>
          )
        })}
      </Grid>

      {selected && (
        <PlayerMatchModal
          player={selected}
          matchId={matchId}
          isOpen={true}
          onClose={() => setSelected(null)}
        />
      )}
    </>
  )
}
