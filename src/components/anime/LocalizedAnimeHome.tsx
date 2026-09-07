'use client'

import { useMemo } from 'react'
import Link from 'next/link'
import { Play, Info } from 'lucide-react'
import type { AnimeListItem } from '@/lib/anilist/types'
import {
  pickTitleForLanguage,
  sortAnimeByLanguagePreference,
} from '@/lib/anime-language'
import MovieCard from '@/components/MovieCard'
import MovieRow from '@/components/MovieRow'
import Top10 from '@/components/Top10'
import { useAnimeLanguage } from './AnimeLanguageContext'

type Props = {
  trending: AnimeListItem[]
  popular: AnimeListItem[]
  topRated: AnimeListItem[]
  upcoming: AnimeListItem[]
}

export default function LocalizedAnimeHome({
  trending,
  popular,
  topRated,
  upcoming,
}: Props) {
  const { language } = useAnimeLanguage()

  const localized = useMemo(() => {
    const localize = (list: AnimeListItem[]) =>
      sortAnimeByLanguagePreference(list, language).map((a) => ({
        ...a,
        title: pickTitleForLanguage(a.titles, language, a.title),
      }))

    return {
      trending: localize(trending),
      popular: localize(popular),
      topRated: localize(topRated),
      upcoming: localize(upcoming),
    }
  }, [trending, popular, topRated, upcoming, language])

  const featured = localized.trending[0] || localized.popular[0]
  const hasContent =
    localized.trending.length +
      localized.popular.length +
      localized.topRated.length >
    0

  return (
    <>
      <section className="relative min-h-[82vh] w-full overflow-hidden">
        <div className="absolute inset-0">
          {featured?.bannerImage || featured?.coverImage ? (
            <img
              src={featured.bannerImage || featured.coverImage || ''}
              alt=""
              className="h-full w-full scale-105 object-cover opacity-55"
            />
          ) : null}
          <div className="anime-hero-scrim absolute inset-0" />
        </div>

        <div className="anime-float-orbs pointer-events-none absolute inset-0" />

        <div className="relative page-shell flex min-h-[82vh] items-end pb-16 pt-[calc(var(--nav-height)+2rem)] md:items-center md:pb-24">
          <div className="anime-fade-rise max-w-xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.28em] text-cyan-300">
              Anime Realm
            </p>
            <h1 className="bg-gradient-to-br from-white via-fuchsia-100 to-cyan-200 bg-clip-text font-[family-name:var(--font-anime-display)] text-5xl leading-none text-transparent sm:text-6xl md:text-7xl">
              {featured?.title || 'ANIME'}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-300 md:text-lg">
              {featured?.description?.slice(0, 220) ||
                'A separate anime world — curated titles, SUB/DUB playback, and a neon night aesthetic.'}
              {featured?.description && featured.description.length > 220
                ? '…'
                : ''}
            </p>
            {featured ? (
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={`/watch/anime/${featured.id}/1`}
                  className="anime-cta-primary inline-flex items-center gap-2 rounded-lg px-6 py-3 text-sm font-bold"
                >
                  <Play className="h-4 w-4 fill-current" />
                  Play EP 1
                </Link>
                <Link
                  href={`/anime/${featured.id}`}
                  className="inline-flex items-center gap-2 rounded-lg border border-fuchsia-300/30 bg-white/5 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/10"
                >
                  <Info className="h-4 w-4" />
                  More Info
                </Link>
              </div>
            ) : (
              !hasContent && (
                <p className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  Anime catalog is temporarily unavailable. Try again in a
                  moment — AniList/Jikan may be rate-limiting.
                </p>
              )
            )}
          </div>
        </div>
      </section>

      <main className="page-shell relative z-10 -mt-6 space-y-2 pb-8 md:-mt-10">
        {localized.trending.length > 0 && (
          <Top10
            title="Top 10 Anime"
            movies={localized.trending.map((a) => ({
              id: a.id,
              title: a.title,
              coverImage: a.coverImage,
              mediaType: 'anime' as const,
            }))}
          />
        )}

        {localized.trending.length > 0 && (
          <MovieRow title="Trending Now">
            {localized.trending.map((anime) => (
              <MovieCard
                key={anime.id}
                id={anime.id}
                title={anime.title}
                posterPath={anime.coverImage}
                rating={anime.averageScore}
                mediaType="anime"
                year={anime.seasonYear}
              />
            ))}
          </MovieRow>
        )}

        {localized.popular.length > 0 && (
          <MovieRow
            title={
              language === 'en'
                ? 'Popular · English titles & dubs'
                : language === 'ja'
                  ? 'Popular · 日本語タイトル'
                  : 'Popular Anime'
            }
          >
            {localized.popular.map((anime) => (
              <MovieCard
                key={anime.id}
                id={anime.id}
                title={anime.title}
                posterPath={anime.coverImage}
                rating={anime.averageScore}
                mediaType="anime"
                year={anime.seasonYear}
              />
            ))}
          </MovieRow>
        )}

        {localized.topRated.length > 0 && (
          <MovieRow title="Top Rated">
            {localized.topRated.map((anime) => (
              <MovieCard
                key={anime.id}
                id={anime.id}
                title={anime.title}
                posterPath={anime.coverImage}
                rating={anime.averageScore}
                mediaType="anime"
                year={anime.seasonYear}
              />
            ))}
          </MovieRow>
        )}

        {localized.upcoming.length > 0 && (
          <MovieRow title="Coming Soon">
            {localized.upcoming.map((anime) => (
              <MovieCard
                key={anime.id}
                id={anime.id}
                title={anime.title}
                posterPath={anime.coverImage}
                rating={anime.averageScore}
                mediaType="anime"
                year={anime.seasonYear}
              />
            ))}
          </MovieRow>
        )}
      </main>
    </>
  )
}
