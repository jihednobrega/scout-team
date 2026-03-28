'use client'

import { Box } from '@chakra-ui/react'

const CARD_BG = 'rgba(255,255,255,0.028)'
const CARD_BR = 'rgba(255,255,255,0.07)'

export function PlayerCardLink({ children }: { children: React.ReactNode }) {
  return (
    <Box
      borderRadius="16px"
      overflow="hidden"
      h="full"
      bg={CARD_BG}
      border="1px solid"
      borderColor={CARD_BR}
      transition="background 0.15s, border-color 0.15s"
      _hover={{ bg: 'rgba(255,255,255,0.05)', borderColor: 'rgba(255,255,255,0.15)' }}
    >
      {children}
    </Box>
  )
}
