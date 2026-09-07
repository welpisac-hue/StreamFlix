import type { Metadata } from 'next'
import { Bebas_Neue, Manrope } from 'next/font/google'
import './globals.css'
import SessionProvider from '@/components/providers/SessionProvider'
import VisitTracker from '@/components/VisitTracker'
import OnboardingGate from '@/components/OnboardingGate'
import SiteExperience from '@/components/SiteExperience'
import { Toaster } from 'react-hot-toast'

const display = Bebas_Neue({
  weight: '400',
  subsets: ['latin'],
  variable: '--font-display',
})

const body = Manrope({
  subsets: ['latin'],
  variable: '--font-body',
})

export const metadata: Metadata = {
  title: 'StreamFlix — Meant for Friends',
  description:
    'A private invite-only streaming space for friends. Browse titles, save your list, and watch together.',
}

export default function RootLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <html
      lang="en"
      className={`${display.variable} ${body.variable} h-full antialiased`}
    >
      <body className="min-h-full flex flex-col bg-background text-foreground">
        <SessionProvider>
          <SiteExperience>
            <VisitTracker />
            <OnboardingGate />
            {children}
            <Toaster
              position="top-center"
              toastOptions={{
                style: {
                  background: '#18181b',
                  color: '#fafafa',
                  border: '1px solid rgba(255,255,255,0.08)',
                },
              }}
            />
          </SiteExperience>
        </SessionProvider>
      </body>
    </html>
  )
}
