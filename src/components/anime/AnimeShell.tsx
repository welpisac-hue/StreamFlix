'use client'

import type { ReactNode } from 'react'
import AnimeEntrance from './AnimeEntrance'
import AnimeLanguagePrompt from './AnimeLanguagePrompt'
import { AnimeLanguageProvider } from './AnimeLanguageContext'

export default function AnimeShell({ children }: { children: ReactNode }) {
  return (
    <AnimeLanguageProvider>
      <div className="anime-theme relative min-h-screen">
        <div className="anime-bg-layer" aria-hidden />
        <div className="anime-bg-overlay" aria-hidden />
        <div className="anime-scanlines pointer-events-none" aria-hidden />
        <AnimeEntrance />
        <AnimeLanguagePrompt />
        <div className="relative z-10">{children}</div>
      </div>
    </AnimeLanguageProvider>
  )
}
