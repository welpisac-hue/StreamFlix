'use client'

import { Languages } from 'lucide-react'
import { getLanguageLabel } from '@/lib/anime-language'
import { useAnimeLanguageOptional } from './AnimeLanguageContext'

export default function AnimeLanguageButton() {
  const ctx = useAnimeLanguageOptional()
  if (!ctx) return null

  return (
    <button
      type="button"
      onClick={ctx.openPrompt}
      className="inline-flex items-center gap-1.5 rounded-full border border-fuchsia-400/25 bg-fuchsia-500/10 px-3 py-1.5 text-xs font-semibold text-fuchsia-100 transition hover:bg-fuchsia-500/20 sm:text-sm"
      title="Change anime language"
    >
      <Languages className="h-3.5 w-3.5" />
      <span className="hidden sm:inline">{getLanguageLabel(ctx.language)}</span>
      <span className="sm:hidden">{ctx.language.toUpperCase()}</span>
    </button>
  )
}
