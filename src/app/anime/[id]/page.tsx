'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import SiteFooter from '@/components/SiteFooter'
import LocalizedAnimeDetail from '@/components/anime/LocalizedAnimeDetail'
import type { AnimeDetails } from '@/lib/anilist/types'

export default function AnimeDetailPage() {
  const params = useParams()
  const rawId = String(params?.id ?? '')
  const animeId = parseInt(rawId, 10)

  const [anime, setAnime] = useState<AnimeDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    if (!Number.isFinite(animeId) || animeId <= 0) {
      setLoading(false)
      setError('Invalid anime link')
      return
    }

    let cancelled = false
    const load = async (attempt = 0) => {
      setLoading(true)
      setError(null)
      try {
        const res = await fetch(`/api/anime?id=${animeId}`, {
          cache: 'no-store',
        })
        if (!res.ok) {
          if (attempt < 2) {
            await new Promise((r) => setTimeout(r, 500 * (attempt + 1)))
            if (!cancelled) return load(attempt + 1)
          }
          throw new Error(`Failed (${res.status})`)
        }
        const data = (await res.json()) as AnimeDetails
        if (!cancelled) setAnime(data)
      } catch (err) {
        if (!cancelled) {
          setAnime(null)
          setError(
            err instanceof Error ? err.message : 'Unable to load this title'
          )
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [animeId])

  if (loading) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="flex flex-1 items-center justify-center pt-[var(--nav-height)]">
          <div className="h-8 w-8 animate-pulse rounded-full bg-fuchsia-400" />
        </div>
      </div>
    )
  }

  if (!anime) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="page-shell flex flex-1 flex-col items-center justify-center pb-16 pt-[calc(var(--nav-height)+3rem)] text-center">
          <h1 className="font-[family-name:var(--font-anime-display)] text-3xl text-white">
            {error === 'Invalid anime link'
              ? 'Invalid anime link'
              : 'Anime unavailable'}
          </h1>
          <p className="mt-2 max-w-md text-zinc-400">
            We couldn&apos;t load this title right now. Try again in a moment —
            the anime catalog source may be busy.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => window.location.reload()}
              className="anime-cta-primary inline-flex rounded-lg px-5 py-2.5 text-sm font-semibold"
            >
              Retry
            </button>
            <Link
              href="/anime"
              className="inline-flex rounded-lg border border-fuchsia-400/20 bg-white/5 px-5 py-2.5 text-sm text-white hover:bg-white/10"
            >
              Back to Anime
            </Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <LocalizedAnimeDetail anime={anime} />
      <SiteFooter />
    </div>
  )
}
