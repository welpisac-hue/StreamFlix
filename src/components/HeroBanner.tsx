'use client'

import { useEffect, useState } from 'react'
import Link from 'next/link'
import { Play, Info } from 'lucide-react'
import { useSession } from 'next-auth/react'
import { getImageUrl } from '@/lib/tmdb/images'

export type HeroBannerItem = {
  id: number
  title: string
  overview?: string | null
  backdrop_path?: string | null
  mediaType: string
  badgeText?: string
  trailerKey?: string | null
}

function defaultPlayHref(item: HeroBannerItem) {
  if (item.mediaType === 'tv') return `/watch/tv/${item.id}/1/1`
  if (item.mediaType === 'anime') return `/watch/anime/${item.id}/1`
  return `/watch/movie/${item.id}`
}

export default function HeroBanner({ item }: { item: HeroBannerItem | null }) {
  const { status } = useSession()
  const [showTrailer, setShowTrailer] = useState(false)
  const [playHref, setPlayHref] = useState(() =>
    item ? defaultPlayHref(item) : '/'
  )

  useEffect(() => {
    setShowTrailer(false)
    if (!item?.trailerKey) return
    const t = window.setTimeout(() => setShowTrailer(true), 2500)
    return () => window.clearTimeout(t)
  }, [item?.id, item?.trailerKey])

  useEffect(() => {
    if (!item) return
    setPlayHref(defaultPlayHref(item))

    if (status !== 'authenticated') return
    if (item.mediaType !== 'tv' && item.mediaType !== 'anime') return

    let cancelled = false
    ;(async () => {
      try {
        const params = new URLSearchParams({
          tmdbId: String(item.id),
          mediaType: item.mediaType,
        })
        const res = await fetch(`/api/watch-history/resume?${params}`)
        if (!res.ok || cancelled) return
        const json = await res.json()
        const resume = json?.resume
        if (!resume || cancelled) return

        if (item.mediaType === 'tv') {
          const season = resume.seasonNumber || 1
          const episode = resume.episodeNumber || 1
          setPlayHref(`/watch/tv/${item.id}/${season}/${episode}`)
        } else if (item.mediaType === 'anime') {
          const episode = resume.episodeNumber || 1
          setPlayHref(`/watch/anime/${item.id}/${episode}`)
        }
      } catch {
        // keep default play href
      }
    })()

    return () => {
      cancelled = true
    }
  }, [item, status])

  const backdrop =
    item?.backdrop_path?.startsWith('http')
      ? item.backdrop_path
      : item?.backdrop_path
        ? getImageUrl(item.backdrop_path, 'original')
        : null

  return (
    <section className="relative min-h-[78vh] w-full overflow-hidden">
      <div className="absolute inset-0">
        {backdrop ? (
          <img
            src={backdrop}
            alt=""
            className={`h-full w-full object-cover transition-opacity duration-1000 ${
              showTrailer && item?.trailerKey ? 'opacity-0' : 'opacity-100'
            }`}
          />
        ) : (
          <div className="h-full w-full bg-[radial-gradient(ellipse_at_top,_#2a0a0c_0%,_#070708_55%)]" />
        )}

        {item?.trailerKey && (
          <div
            className={`absolute inset-0 transition-opacity duration-1000 ${
              showTrailer ? 'opacity-100' : 'opacity-0'
            }`}
          >
            <iframe
              key={item.trailerKey}
              src={`https://www.youtube.com/embed/${item.trailerKey}?autoplay=1&mute=1&controls=0&rel=0&loop=1&playlist=${item.trailerKey}&modestbranding=1&playsinline=1&start=5`}
              className="pointer-events-none absolute left-1/2 top-1/2 h-[56.25vw] min-h-full w-[177.78vh] min-w-full -translate-x-1/2 -translate-y-1/2 scale-110 border-0"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
              title={`${item.title} trailer`}
            />
          </div>
        )}

        <div className="hero-scrim absolute inset-0" />
      </div>

      <div className="relative page-shell flex min-h-[78vh] items-end pb-16 pt-[calc(var(--nav-height)+2rem)] md:items-center md:pb-24">
        <div className="animate-fade-up max-w-xl">
          <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
            {item?.badgeText || 'Now Streaming'}
          </p>
          <h1 className="font-display text-5xl leading-none text-white sm:text-6xl md:text-7xl">
            {item?.title || 'STREAMFLIX'}
          </h1>
          <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-300 md:text-lg">
            {item?.overview ||
              'Watch movies and TV shows free. Stream powered by VidKing.'}
          </p>
          {item && (
            <div className="mt-7 flex flex-wrap gap-3">
              <Link
                href={playHref}
                className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-zinc-200"
              >
                <Play className="h-4 w-4 fill-black" />
                Play
              </Link>
              <Link
                href={
                  item.mediaType === 'tv'
                    ? `/tv/${item.id}`
                    : item.mediaType === 'anime'
                      ? `/anime/${item.id}`
                      : `/movie/${item.id}`
                }
                className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
              >
                <Info className="h-4 w-4" />
                More Info
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  )
}
