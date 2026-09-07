'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Play, Star, Clock, Calendar, Tv } from 'lucide-react'
import type { AnimeDetails } from '@/lib/anilist/types'
import { pickTitleForLanguage } from '@/lib/anime-language'
import TrailerButton from '@/components/TrailerButton'
import CastGrid from '@/components/CastGrid'
import MovieCard from '@/components/MovieCard'
import WatchLaterButton from '@/components/WatchLaterButton'
import { useAnimeLanguage } from './AnimeLanguageContext'

export default function LocalizedAnimeDetail({ anime }: { anime: AnimeDetails }) {
  const { language } = useAnimeLanguage()

  const title = useMemo(
    () => pickTitleForLanguage(anime.titles, language, anime.title),
    [anime, language]
  )

  const recommendations = useMemo(
    () =>
      anime.recommendations.map((rec) => ({
        ...rec,
        title: pickTitleForLanguage(rec.titles, language, rec.title),
      })),
    [anime.recommendations, language]
  )

  const episodeCount = anime.episodes && anime.episodes > 0 ? anime.episodes : 12

  return (
    <>
      <section className="relative min-h-[70vh]">
        <div className="absolute inset-0">
          <img
            src={anime.bannerImage || anime.coverImage || '/placeholder.svg'}
            alt=""
            className="h-full w-full object-cover opacity-70"
          />
          <div className="anime-hero-scrim absolute inset-0" />
        </div>

        <div className="relative page-shell flex min-h-[70vh] items-end pb-10 pt-[calc(var(--nav-height)+1.5rem)]">
          <div className="flex w-full gap-8">
            {anime.coverImage && (
              <img
                src={anime.coverImage}
                alt={title}
                className="hidden w-44 shrink-0 rounded-xl shadow-2xl ring-1 ring-fuchsia-300/20 md:block lg:w-52"
              />
            )}
            <div className="min-w-0 max-w-2xl pb-2">
              <p className="mb-2 text-xs font-semibold uppercase tracking-[0.2em] text-cyan-300">
                Anime
              </p>
              <h1 className="font-[family-name:var(--font-anime-display)] text-4xl leading-none text-white sm:text-5xl md:text-6xl">
                {title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-300">
                {anime.averageScore != null && (
                  <span className="inline-flex items-center gap-1 font-semibold text-white">
                    <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                    {anime.averageScore.toFixed(1)}
                  </span>
                )}
                {anime.seasonYear && (
                  <>
                    <span className="text-zinc-600">·</span>
                    <span>{anime.seasonYear}</span>
                  </>
                )}
                {anime.episodes && (
                  <>
                    <span className="text-zinc-600">·</span>
                    <span>{anime.episodes} EPs</span>
                  </>
                )}
                {anime.format && (
                  <span className="rounded bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-1.5 py-0.5 text-xs font-bold text-black">
                    {anime.format}
                  </span>
                )}
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {anime.genres.map((genre) => (
                  <span
                    key={genre}
                    className="rounded-full border border-fuchsia-400/20 bg-white/5 px-3 py-1 text-xs text-zinc-300"
                  >
                    {genre}
                  </span>
                ))}
              </div>

              {anime.description && (
                <p className="mt-4 line-clamp-3 text-zinc-300">
                  {anime.description}
                </p>
              )}

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/watch/anime/${anime.id}/1`}
                  className="anime-cta-primary inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Watch Now
                </Link>
                {anime.trailerYoutubeId && (
                  <TrailerButton
                    youtubeKey={anime.trailerYoutubeId}
                    title={title}
                  />
                )}
                <WatchLaterButton
                  tmdbId={anime.id}
                  title={title}
                  posterPath={anime.coverImage}
                  mediaType="anime"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="page-shell py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            {anime.description && (
              <div>
                <h2 className="mb-3 font-[family-name:var(--font-anime-display)] text-2xl tracking-wide text-white">
                  Synopsis
                </h2>
                <p className="leading-relaxed text-zinc-400">
                  {anime.description}
                </p>
              </div>
            )}

            <div>
              <h2 className="mb-4 font-[family-name:var(--font-anime-display)] text-2xl tracking-wide text-white">
                Episodes
              </h2>
              <div className="grid grid-cols-4 gap-2 sm:grid-cols-6 md:grid-cols-8">
                {Array.from({ length: Math.min(episodeCount, 48) }, (_, i) => {
                  const ep = i + 1
                  return (
                    <Link
                      key={ep}
                      href={`/watch/anime/${anime.id}/${ep}`}
                      className="rounded-lg border border-fuchsia-400/15 bg-white/[0.03] py-2.5 text-center text-sm font-semibold text-zinc-200 transition hover:border-fuchsia-400/40 hover:bg-fuchsia-500/10"
                    >
                      {ep}
                    </Link>
                  )
                })}
              </div>
              {episodeCount > 48 && (
                <p className="mt-3 text-xs text-zinc-500">
                  Showing first 48 episodes — open any number via watch URL.
                </p>
              )}
            </div>

            {anime.characters.length > 0 && (
              <CastGrid
                title="Characters"
                cast={anime.characters.map((c) => ({
                  id: c.id,
                  name: c.name,
                  character: c.role,
                  profile_path: c.image,
                }))}
                limit={12}
              />
            )}

            {recommendations.length > 0 && (
              <div>
                <h2 className="mb-4 font-[family-name:var(--font-anime-display)] text-2xl tracking-wide text-white">
                  More Like This
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {recommendations.slice(0, 4).map((rec) => (
                    <MovieCard
                      key={rec.id}
                      id={rec.id}
                      title={rec.title}
                      posterPath={rec.coverImage}
                      rating={rec.averageScore}
                      mediaType="anime"
                      year={rec.seasonYear}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-fuchsia-400/15 bg-white/[0.03] p-5 backdrop-blur">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-300">
                Info
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <Tv className="mt-0.5 h-4 w-4 text-zinc-500" />
                  <div>
                    <p className="text-zinc-500">Studios</p>
                    <p className="text-white">
                      {anime.studios.join(', ') || 'N/A'}
                    </p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 text-zinc-500" />
                  <div>
                    <p className="text-zinc-500">Year</p>
                    <p className="text-white">{anime.seasonYear || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock className="mt-0.5 h-4 w-4 text-zinc-500" />
                  <div>
                    <p className="text-zinc-500">Episodes</p>
                    <p className="text-white">{anime.episodes || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Star className="mt-0.5 h-4 w-4 text-zinc-500" />
                  <div>
                    <p className="text-zinc-500">Status</p>
                    <p className="text-white">{anime.status || 'N/A'}</p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>
    </>
  )
}
