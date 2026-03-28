// app/providers.tsx
'use client'

import { ChakraProvider } from '@chakra-ui/react'
import theme from './theme'
import AppLayout from '@/components/layouts/AppLayout'
import { TeamProvider } from '@/contexts/TeamContext'

export function Providers({ children }: { children: React.ReactNode }) {
  return (
    <ChakraProvider theme={theme}>
      <TeamProvider>
        <AppLayout>
          {children}
        </AppLayout>
      </TeamProvider>
    </ChakraProvider>
  )
}
