// components/layouts/AppLayout.tsx
'use client'

import { useState, ReactNode } from 'react'
import { Box, Container } from '@chakra-ui/react'
import Sidebar from '../dashboard/Sidebar'
import Header from '../dashboard/Header'
import MenuDrawer from '../dashboard/MenuDrawer'
import BottomNav from '../dashboard/BottomNav'

interface AppLayoutProps {
  children: ReactNode
  /**
   * Largura máxima do container
   * @default '1400px'
   */
  maxWidth?: string
}

/**
 * AppLayout - Layout principal da aplicação
 *
 * Estrutura padrão aplicada em TODAS as páginas:
 * - Sidebar fixa (desktop)
 * - Header com menu hamburger (mobile/tablet)
 * - MenuDrawer (mobile/tablet)
 * - BottomNav (mobile)
 * - Container responsivo com o conteúdo da página
 */
export default function AppLayout({
  children,
  maxWidth = '1400px'
}: AppLayoutProps) {
  const [isMenuOpen, setIsMenuOpen] = useState(false)

  return (
    <Box
      minH="100vh"
      bg="gray.950"
      color="white"
      fontFamily="system-ui, -apple-system, sans-serif"
    >
      {/* Sidebar fixa para desktop */}
      <Sidebar />

      {/* Container principal com margem para o sidebar */}
      <Box ml={{ base: 0, lg: '240px' }}>
        {/* Header com menu hamburger para mobile/tablet */}
        <Header onMenuClick={() => setIsMenuOpen(true)} />

        {/* Menu Drawer (mobile/tablet) */}
        <MenuDrawer isOpen={isMenuOpen} onClose={() => setIsMenuOpen(false)} />

        {/* Conteúdo Principal (PageContent) */}
        <Container
          maxW={maxWidth}
          px={{ base: 4, md: 6 }}
          py={{ base: 3, md: 4 }}
          pb={{ base: '100px', md: 4 }}
        >
          {children}
        </Container>

        {/* Barra de Navegação Inferior (Mobile) */}
        <BottomNav />
      </Box>
    </Box>
  )
}
