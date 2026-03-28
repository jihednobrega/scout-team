import type { Metadata } from 'next'
import { Barlow_Condensed, Plus_Jakarta_Sans } from 'next/font/google'

const barlow = Barlow_Condensed({
  subsets: ['latin'],
  weight: ['500', '600', '700', '800'],
  variable: '--font-barlow',
  display: 'swap',
})

const jakarta = Plus_Jakarta_Sans({
  subsets: ['latin'],
  weight: ['400', '500', '600', '700'],
  variable: '--font-jakarta',
  display: 'swap',
})

export const metadata: Metadata = {
  title: 'Portal — Scout Team',
  description: 'Portal de acesso para atletas e treinadores',
}

export default function PortalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div
      className={`${barlow.variable} ${jakarta.variable}`}
      style={{
        minHeight: '100vh',
        background: '#080810',
        fontFamily: 'var(--font-jakarta), system-ui, sans-serif',
      }}
    >
      {children}
    </div>
  )
}
