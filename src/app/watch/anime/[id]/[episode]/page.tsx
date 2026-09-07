'use client'

import { useCallback, useEffect, useMemo, useState } from 'react'
import { useParams } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'
import Navbar from '@/components/Navbar'
import AnimePlayer from '@/components/AnimePlayer'
import WatchProgressTracker from '@/components/WatchProgressTracker'
import type { AnimeDetails } from '@/lib/anilist/types'
import { pickTitleForLanguage } from '@/lib/anime-language'
import { useAnimeLanguageOptional } from '@/components/anime/AnimeLanguageContext'

export default function WatchAnimePage() {
  const params = useParams()
  const animeId = params.id as string
  const episode = params.episode as string
  const epNum = parseInt(episode, 10) || 1

  const [anime, setAnime] = useState<AnimeDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [startAt, setStartAt] = useState(0)
  const langCtx = useAnimeLanguageOptional()
  const language = langCtx?.language ?? 'en'

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        const res = await fetch(`/api/anime?id=${animeId}`)
        if (res.ok) {
          const data = await res.json()
          if (!cancelled) setAnime(data)
        }
      } catch (error) {
        console.error('Failed to load anime:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => {
      cancelled = true
    }
  }, [animeId])

  const onProgress = useCallback(() => {
    // Progress is handled by WatchProgressTracker via PLAYER_EVENT postMessage
  }, [])

  const title = useMemo(
    () =>
      anime
        ? pickTitleForLanguage(anime.titles, language, anime.title)
        : 'Anime',
    [anime, language]
  )

  const totalEpisodes =
    anime?.episodes && anime.episodes > 0 ? anime.episodes : Math.max(epNum, 12)

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center">
        <div className="h-8 w-8 animate-pulse rounded-full bg-fuchsia-400" />
      </div>
    )
  }

  if (!anime) {
    return (
      <div className="min-h-screen">
        <Navbar />
        <div className="page-shell pb-16 pt-[calc(var(--nav-height)+3rem)] text-center">
          <h1 className="font-[family-name:var(--font-anime-display)] text-3xl text-white">
            Anime not found
          </h1>
          <p className="mt-2 text-zinc-400">
            This title could not be loaded. Try another from the catalog.
          </p>
          <Link
            href="/anime"
            className="anime-cta-primary mt-6 inline-flex rounded-lg px-5 py-2.5 text-sm font-semibold"
          >
            Back to Anime
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen">
      <Navbar />
      {anime && (
        <WatchProgressTracker
          tmdbId={anime.id}
          title={`${title} EP ${epNum}`}
          posterPath={anime.coverImage}
          mediaType="anime"
          episodeNumber={epNum}
          duration={(anime.duration || 24) * 60}
          onResumeTime={setStartAt}
        />
      )}

      <div className="page-shell pb-16 pt-[calc(var(--nav-height)+1.25rem)]">
        <Link
          href={`/anime/${animeId}`}
          className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to details
        </Link>

        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <h1 className="font-[family-name:var(--font-anime-display)] text-3xl tracking-wide text-white md:text-4xl">
            {title}
          </h1>
          <span className="text-sm text-zinc-500">Episode {epNum}</span>
        </div>

        <AnimePlayer
          anilistId={anime?.id ?? animeId}
          episode={epNum}
          title={`${title} EP ${epNum}`}
          startAt={startAt}
          onProgress={onProgress}
        />

        <div className="mt-4 flex flex-wrap gap-3">
          {epNum > 1 && (
            <Link
              href={`/watch/anime/${animeId}/${epNum - 1}`}
              className="inline-flex items-center gap-2 rounded-lg border border-fuchsia-400/20 bg-white/5 px-4 py-2.5 text-sm text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          )}
          {epNum < totalEpisodes && (
            <Link
              href={`/watch/anime/${animeId}/${epNum + 1}`}
              className="anime-cta-primary inline-flex items-center gap-2 rounded-lg px-4 py-2.5 text-sm font-semibold"
            >
              Next Episode
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="mt-8">
          <h2 className="mb-3 text-lg font-semibold text-white">Episodes</h2>
          <div className="grid max-h-72 grid-cols-4 gap-2 overflow-y-auto pr-1 sm:grid-cols-6 md:grid-cols-8 lg:grid-cols-10">
            {Array.from({ length: Math.min(totalEpisodes, 100) }, (_, i) => {
              const ep = i + 1
              const active = ep === epNum
              return (
                <Link
                  key={ep}
                  href={`/watch/anime/${animeId}/${ep}`}
                  className={`rounded-lg border py-2 text-center text-sm font-semibold transition ${
                    active
                      ? 'border-fuchsia-400/50 bg-fuchsia-500/20 text-white'
                      : 'border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.06]'
                  }`}
                >
                  {ep}
                </Link>
              )
            })}
          </div>
        </div>
      </div>
    </div>
  )
}
