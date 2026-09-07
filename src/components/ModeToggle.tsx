'use client'

import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { Clapperboard, Sparkles } from 'lucide-react'

export default function ModeToggle() {
  const pathname = usePathname()
  const animeMode =
    pathname === '/anime' ||
    pathname.startsWith('/anime/') ||
    pathname.startsWith('/watch/anime')

  return (
    <div
      className={`inline-flex items-center rounded-full border p-1 backdrop-blur ${
        animeMode
          ? 'border-fuchsia-400/30 bg-black/50'
          : 'border-white/10 bg-black/40'
      }`}
    >
      <Link
        href="/"
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
          !animeMode
            ? 'bg-white text-black shadow'
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        <Clapperboard className="h-3.5 w-3.5" />
        Movies
      </Link>
      <Link
        href="/anime"
        className={`inline-flex items-center gap-1.5 rounded-full px-3 py-1.5 text-xs font-semibold transition sm:text-sm ${
          animeMode
            ? 'bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-black shadow'
            : 'text-zinc-400 hover:text-white'
        }`}
      >
        <Sparkles className="h-3.5 w-3.5" />
        Anime
      </Link>
    </div>
  )
}
