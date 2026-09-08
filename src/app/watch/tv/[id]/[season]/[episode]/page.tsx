'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import VideoPlayer from '@/components/VideoPlayer'
import WatchProgressTracker from '@/components/WatchProgressTracker'
import { Play, ChevronLeft, ChevronRight } from 'lucide-react'
import Link from 'next/link'
import type { TVShowDetails, Episode } from '@/lib/tmdb/types'

interface SeasonDetails {
  episodes?: Episode[]
}

export default function WatchTVPage() {
  const params = useParams()
  const tvId = params.id as string
  const seasonNumber = params.season as string
  const episodeNumber = params.episode as string

  const [show, setShow] = useState<TVShowDetails | null>(null)
  const [season, setSeason] = useState<SeasonDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [startAt, setStartAt] = useState(0)

  useEffect(() => {
    async function fetchData() {
      try {
        const [showRes, seasonRes] = await Promise.all([
          fetch(`/api/tmdb/tv/${tvId}`),
          fetch(`/api/tmdb/tv/${tvId}/season/${seasonNumber}`),
        ])

        if (showRes.ok) setShow(await showRes.json())
        if (seasonRes.ok) setSeason(await seasonRes.json())
      } catch (error) {
        console.error('Error fetching data:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchData()
  }, [tvId, seasonNumber])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--primary)]" />
      </div>
    )
  }

  const epNum = parseInt(episodeNumber, 10)
  const currentEpisode = season?.episodes?.find(
    (ep) => ep.episode_number === epNum
  )
  const hasNextEpisode = epNum < (season?.episodes?.length || 0)
  const hasPreviousEpisode = epNum > 1

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {show && (
        <WatchProgressTracker
          tmdbId={show.id}
          title={`${show.name} S${seasonNumber}E${episodeNumber}`}
          posterPath={show.poster_path}
          mediaType="tv"
          seasonNumber={parseInt(seasonNumber, 10)}
          episodeNumber={epNum}
          duration={(currentEpisode?.runtime || 45) * 60}
          onResumeTime={setStartAt}
        />
      )}

      <div className="page-shell pb-16 pt-[calc(var(--nav-height)+1.25rem)]">
        <Link
          href={`/tv/${tvId}`}
          className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to show
        </Link>

        <div className="mb-2 flex flex-wrap items-baseline gap-3">
          <h1 className="font-display text-3xl tracking-wide text-white md:text-4xl">
            {show?.name || 'TV Show'}
          </h1>
          <span className="text-sm text-zinc-500">
            S{seasonNumber} · E{episodeNumber}
          </span>
        </div>
        {currentEpisode && (
          <h2 className="mb-5 text-lg text-zinc-300">{currentEpisode.name}</h2>
        )}

        <VideoPlayer
          mediaType="tv"
          tmdbId={tvId}
          season={seasonNumber}
          episode={episodeNumber}
          title={`${show?.name || 'Show'} S${seasonNumber}E${episodeNumber}`}
          startAt={startAt}
          nextHref={
            hasNextEpisode
              ? `/watch/tv/${tvId}/${seasonNumber}/${epNum + 1}`
              : undefined
          }
        />

        <div className="mt-4 flex flex-wrap gap-3">
          {hasPreviousEpisode && (
            <Link
              href={`/watch/tv/${tvId}/${seasonNumber}/${epNum - 1}`}
              className="inline-flex items-center gap-2 rounded-lg border border-white/10 bg-white/5 px-4 py-2.5 text-sm text-white hover:bg-white/10"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </Link>
          )}
          {hasNextEpisode && (
            <Link
              href={`/watch/tv/${tvId}/${seasonNumber}/${epNum + 1}`}
              className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:bg-[var(--primary-dark)]"
            >
              Next Episode
              <ChevronRight className="h-4 w-4" />
            </Link>
          )}
        </div>

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="space-y-6 lg:col-span-2">
            {currentEpisode?.overview && (
              <div>
                <h3 className="mb-2 text-lg font-semibold text-white">
                  Episode Overview
                </h3>
                <p className="leading-relaxed text-zinc-400">
                  {currentEpisode.overview}
                </p>
              </div>
            )}

            <div>
              <h3 className="mb-3 text-lg font-semibold text-white">
                Season {seasonNumber} Episodes
              </h3>
              <div className="max-h-[28rem] space-y-2 overflow-y-auto pr-1">
                {season?.episodes?.map((episode) => {
                  const active = episode.episode_number === epNum
                  return (
                    <Link
                      key={episode.id}
                      href={`/watch/tv/${tvId}/${seasonNumber}/${episode.episode_number}`}
                      className={`flex items-center gap-3 rounded-xl border px-3 py-3 transition ${
                        active
                          ? 'border-[var(--primary)]/50 bg-[var(--primary)]/10'
                          : 'border-white/5 bg-white/[0.03] hover:bg-white/[0.06]'
                      }`}
                    >
                      <span className="flex h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-black/40 text-sm font-bold text-white">
                        {episode.episode_number}
                      </span>
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {episode.name}
                        </p>
                        <p className="text-xs text-zinc-500">{episode.air_date}</p>
                      </div>
                      {active && (
                        <Play className="h-4 w-4 shrink-0 fill-[var(--primary)] text-[var(--primary)]" />
                      )}
                    </Link>
                  )
                })}
              </div>
            </div>
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-300">
                Show Info
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">First aired</dt>
                  <dd className="text-zinc-200">{show?.first_air_date || '—'}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Seasons</dt>
                  <dd className="text-zinc-200">
                    {show?.number_of_seasons ?? '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-zinc-500">Rating</dt>
                  <dd className="text-zinc-200">
                    {show?.vote_average
                      ? `${show.vote_average.toFixed(1)}/10`
                      : '—'}
                  </dd>
                </div>
              </dl>
            </div>
          </aside>
        </div>
      </div>
    </div>
  )
}
