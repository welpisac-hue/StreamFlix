'use client'

import { useState, useEffect } from 'react'
import { useParams } from 'next/navigation'
import Navbar from '@/components/Navbar'
import VideoPlayer from '@/components/VideoPlayer'
import WatchProgressTracker from '@/components/WatchProgressTracker'
import CastGrid from '@/components/CastGrid'
import { ChevronLeft } from 'lucide-react'
import Link from 'next/link'
import type { MovieDetails } from '@/lib/tmdb/types'

export default function WatchMoviePage() {
  const params = useParams()
  const movieId = params.id as string
  const [movie, setMovie] = useState<MovieDetails | null>(null)
  const [loading, setLoading] = useState(true)
  const [startAt, setStartAt] = useState(0)

  useEffect(() => {
    async function fetchMovie() {
      try {
        const response = await fetch(`/api/tmdb/movie/${movieId}`)
        if (response.ok) {
          setMovie(await response.json())
        }
      } catch (error) {
        console.error('Error fetching movie:', error)
      } finally {
        setLoading(false)
      }
    }
    fetchMovie()
  }, [movieId])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-background">
        <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--primary)]" />
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      {movie && (
        <WatchProgressTracker
          tmdbId={movie.id}
          title={movie.title}
          posterPath={movie.poster_path}
          mediaType="movie"
          duration={(movie.runtime || 0) * 60}
          onResumeTime={setStartAt}
        />
      )}

      <div className="page-shell pb-16 pt-[calc(var(--nav-height)+1.25rem)]">
        <Link
          href={`/movie/${movieId}`}
          className="mb-5 inline-flex items-center gap-2 text-sm text-zinc-400 transition hover:text-white"
        >
          <ChevronLeft className="h-4 w-4" />
          Back to details
        </Link>

        <h1 className="mb-5 font-display text-3xl tracking-wide text-white md:text-4xl">
          {movie?.title || 'Movie'}
        </h1>

        <VideoPlayer
          mediaType="movie"
          tmdbId={movieId}
          title={movie?.title || 'Movie'}
          overview={movie?.overview}
          posterPath={movie?.poster_path}
          startAt={startAt}
        />

        <div className="mt-8 grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2 space-y-6">
            <div>
              <h2 className="mb-2 text-lg font-semibold text-white">Synopsis</h2>
              <p className="leading-relaxed text-zinc-400">
                {movie?.overview || 'No synopsis available.'}
              </p>
            </div>

            {movie?.credits?.cast && movie.credits.cast.length > 0 && (
              <CastGrid cast={movie.credits.cast} limit={6} />
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
              <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-300">
                Info
              </h3>
              <dl className="space-y-2 text-sm">
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Released</dt>
                  <dd className="text-zinc-200">{movie?.release_date || '—'}</dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Runtime</dt>
                  <dd className="text-zinc-200">
                    {movie?.runtime ? `${movie.runtime} min` : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-4">
                  <dt className="text-zinc-500">Rating</dt>
                  <dd className="text-zinc-200">
                    {movie?.vote_average
                      ? `${movie.vote_average.toFixed(1)}/10`
                      : '—'}
                  </dd>
                </div>
              </dl>
            </div>

            {movie?.genres && movie.genres.length > 0 && (
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4">
                <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-300">
                  Genres
                </h3>
                <div className="flex flex-wrap gap-2">
                  {movie.genres.map((genre) => (
                    <span
                      key={genre.id}
                      className="rounded-full bg-[var(--primary)]/15 px-2.5 py-1 text-xs text-red-300"
                    >
                      {genre.name}
                    </span>
                  ))}
                </div>
              </div>
            )}
          </aside>
        </div>
      </div>
    </div>
  )
}
