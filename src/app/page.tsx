import Link from 'next/link'
import { Users, Radio } from 'lucide-react'
import { tmdb } from '@/lib/tmdb'
import { prisma } from '@/lib/prisma'
import MovieCard from '@/components/MovieCard'
import MovieRow from '@/components/MovieRow'
import Top10 from '@/components/Top10'
import Navbar from '@/components/Navbar'
import RecommendedSection from '@/components/RecommendedSection'
import SiteFooter from '@/components/SiteFooter'
import HeroBanner from '@/components/HeroBanner'
import {
  filterComingSoon,
  pickYoutubeTrailerKey,
  takeExclusive,
} from '@/lib/home-catalog'
import type { Movie, TVShow } from '@/lib/tmdb/types'

/** ISR: refresh catalog every 5 minutes (Vercel). */
export const revalidate = 300

/** TMDB genre ids */
const GENRE = {
  family: 10751,
  comedy: 35,
  action: 28,
  horror: 27,
  documentary: 99,
  animation: 16,
} as const

async function settled<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise
  } catch {
    return fallback
  }
}

function movieYear(m: Movie) {
  return m.release_date?.split('-')[0]
}

function tvYear(s: TVShow) {
  return s.first_air_date?.split('-')[0]
}

export default async function Home() {
  const [
    dbFeatured,
    trendingMovies,
    popularMovies,
    topRatedMovies,
    trendingTV,
    popularTV,
    topRatedTV,
    popularNetworkShows,
    upcomingRaw,
    comingSoonDiscover,
    familyMovies,
    comedyMovies,
    actionMovies,
    activePartyResult,
  ] = await Promise.all([
    settled(
      prisma.featuredContent.findMany({
        where: { isActive: true },
        orderBy: { order: 'asc' },
        take: 5,
      }),
      []
    ),
    settled(tmdb.getTrendingMovies(), []),
    settled(tmdb.getPopularMovies(), []),
    settled(tmdb.getTopRatedMovies(), []),
    settled(tmdb.getTrendingTV(), []),
    settled(tmdb.getPopularTV(), []),
    settled(tmdb.getTopRatedTV(), []),
    settled(tmdb.getPopularNetworkShows(), []),
    settled(tmdb.getUpcomingMovies(), []),
    settled(tmdb.getComingSoonMovies(), []),
    settled(tmdb.discoverMovies({ genre: GENRE.family }), []),
    settled(tmdb.discoverMovies({ genre: GENRE.comedy }), []),
    settled(tmdb.discoverMovies({ genre: GENRE.action }), []),
    settled(
      prisma.watchPartyRoom.findFirst({
        orderBy: { createdAt: 'desc' },
        include: {
          host: { select: { username: true } },
          _count: { select: { messages: true } },
        },
      }),
      null
    ),
  ])

  const activeParty = activePartyResult ?? null

  // Rotate Now Streaming showcase every 2 hours across a mixed pool
  type HeroCandidate = {
    id: number
    title: string
    overview?: string | null
    backdrop_path?: string | null
    mediaType: string
    badgeText: string
  }

  const heroPool: HeroCandidate[] = []
  const heroSeen = new Set<string>()
  const pushHero = (c: HeroCandidate) => {
    const key = `${c.mediaType}:${c.id}`
    if (!c.id || heroSeen.has(key)) return
    heroSeen.add(key)
    heroPool.push(c)
  }

  for (const f of dbFeatured) {
    pushHero({
      id: f.tmdbId,
      title: f.title,
      overview: f.overview,
      backdrop_path: f.backdropPath,
      mediaType: f.mediaType || 'movie',
      badgeText: f.badgeText || 'Now Streaming',
    })
  }
  for (const m of trendingMovies.slice(0, 12)) {
    pushHero({
      id: m.id,
      title: m.title,
      overview: m.overview,
      backdrop_path: m.backdrop_path,
      mediaType: 'movie',
      badgeText: 'Now Streaming',
    })
  }
  for (const s of trendingTV.slice(0, 8)) {
    pushHero({
      id: s.id,
      title: s.name,
      overview: s.overview,
      backdrop_path: s.backdrop_path,
      mediaType: 'tv',
      badgeText: 'Now Streaming',
    })
  }
  for (const m of popularMovies.slice(0, 8)) {
    pushHero({
      id: m.id,
      title: m.title,
      overview: m.overview,
      backdrop_path: m.backdrop_path,
      mediaType: 'movie',
      badgeText: 'Now Streaming',
    })
  }

  const TWO_HOURS_MS = 2 * 60 * 60 * 1000
  const heroSlot = Math.floor(Date.now() / TWO_HOURS_MS)
  const heroBase =
    heroPool.length > 0 ? heroPool[heroSlot % heroPool.length] : null

  let heroTrailerKey: string | null = null
  if (heroBase) {
    try {
      const details =
        heroBase.mediaType === 'tv'
          ? await tmdb.getTVShowDetails(heroBase.id)
          : await tmdb.getMovieDetails(heroBase.id)
      heroTrailerKey = pickYoutubeTrailerKey(details.videos)
      if (!heroBase.backdrop_path && details.backdrop_path) {
        heroBase.backdrop_path = details.backdrop_path
      }
      if (!heroBase.overview && details.overview) {
        heroBase.overview = details.overview
      }
    } catch {
      // trailer optional
    }
  }

  const heroItem = heroBase
    ? { ...heroBase, trailerKey: heroTrailerKey }
    : null

  // Exclusive IDs so rows don't repeat the same titles
  const usedMovieIds = new Set<number>()
  const usedTvIds = new Set<number>()
  if (heroItem?.mediaType === 'movie') usedMovieIds.add(heroItem.id)
  if (heroItem?.mediaType === 'tv') usedTvIds.add(heroItem.id)

  const top10Movies = takeExclusive(trendingMovies, usedMovieIds, 10)
  const trendingNow = takeExclusive(trendingMovies, usedMovieIds, 16)
  const popularMovieRow = takeExclusive(popularMovies, usedMovieIds, 16)
  const familyRow = takeExclusive(familyMovies, usedMovieIds, 16)
  const comedyRow = takeExclusive(comedyMovies, usedMovieIds, 16)
  const actionRow = takeExclusive(actionMovies, usedMovieIds, 16)
  const topRatedMovieRow = takeExclusive(topRatedMovies, usedMovieIds, 16)

  const comingSoon = filterComingSoon([
    ...comingSoonDiscover,
    ...upcomingRaw,
  ]).filter((m) => {
    if (usedMovieIds.has(m.id)) return false
    usedMovieIds.add(m.id)
    return true
  }).slice(0, 18)

  const popularTvRow = takeExclusive(popularTV, usedTvIds, 16)
  const topRatedTvRow = takeExclusive(topRatedTV, usedTvIds, 16)
  const trendingTvRow = takeExclusive(trendingTV, usedTvIds, 16)
  const networkRow = takeExclusive(popularNetworkShows, usedTvIds, 16)

  const hasContent =
    trendingMovies.length +
      popularMovies.length +
      popularTV.length +
      trendingTV.length >
    0

  return (
    <div className="flex min-h-screen flex-col bg-background page-glow">
      <Navbar />

      {heroItem ? (
        <HeroBanner item={heroItem} />
      ) : (
        <section className="relative min-h-[78vh] w-full">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_#2a0a0c_0%,_#070708_55%)]" />
          <div className="hero-scrim absolute inset-0" />
          <div className="relative page-shell flex min-h-[78vh] items-end pb-16 pt-[calc(var(--nav-height)+2rem)] md:items-center md:pb-24">
            <div className="max-w-xl">
              <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
                Now Streaming
              </p>
              <h1 className="font-display text-5xl text-white md:text-7xl">
                STREAMFLIX
              </h1>
              {!hasContent && (
                <p className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  Catalog couldn&apos;t load from TMDB. Check that{' '}
                  <code className="text-amber-100">TMDB_API_KEY</code> is set
                  (v3 key or v4 read token).
                </p>
              )}
            </div>
          </div>
        </section>
      )}

      <main className="page-shell relative z-10 -mt-6 space-y-2 pb-8 md:-mt-10">
        {activeParty && (
          <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/80 via-fuchsia-950/60 to-purple-950/80 p-6 shadow-2xl shadow-purple-900/30">
            <span className="absolute right-4 top-4 flex h-3 w-3">
              <span className="absolute inline-flex h-full w-full animate-ping rounded-full bg-purple-400 opacity-75" />
              <span className="relative inline-flex h-3 w-3 rounded-full bg-purple-500" />
            </span>
            <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <Radio className="h-4 w-4 animate-pulse text-purple-400" />
                  <span className="text-xs font-bold uppercase tracking-widest text-purple-300">
                    Live Watch Party
                  </span>
                </div>
                <h2 className="font-display text-2xl text-white sm:text-3xl">
                  {activeParty.title}
                </h2>
                <div className="flex flex-wrap items-center gap-3 text-sm text-zinc-400">
                  <span className="flex items-center gap-1">
                    <Users className="h-3.5 w-3.5 text-purple-400" />
                    Hosted by @{activeParty.host?.username ?? 'admin'}
                  </span>
                  {activeParty.maxUsers && (
                    <span>· Max {activeParty.maxUsers} viewers</span>
                  )}
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs font-semibold uppercase text-purple-300">
                    {activeParty.mediaType}
                  </span>
                </div>
              </div>
              <Link
                href={`/watch-party/${activeParty.code}`}
                className="inline-flex shrink-0 items-center gap-2.5 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 px-7 py-3.5 text-sm font-bold text-white shadow-lg shadow-purple-900/40 transition hover:brightness-110"
              >
                <Users className="h-4 w-4" />
                Join Now
              </Link>
            </div>
          </div>
        )}

        {top10Movies.length > 0 && (
          <Top10
            movies={top10Movies.map((m) => ({
              ...m,
              mediaType: 'movie' as const,
            }))}
          />
        )}

        <RecommendedSection />

        {trendingNow.length > 0 && (
          <MovieRow title="Trending Now">
            {trendingNow.map((movie, index) => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                posterPath={movie.poster_path}
                rating={movie.vote_average}
                mediaType="movie"
                year={movieYear(movie)}
                index={index}
              />
            ))}
          </MovieRow>
        )}

        {familyRow.length > 0 && (
          <MovieRow title="Family Movies">
            {familyRow.map((movie, index) => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                posterPath={movie.poster_path}
                rating={movie.vote_average}
                mediaType="movie"
                year={movieYear(movie)}
                index={index}
              />
            ))}
          </MovieRow>
        )}

        {popularMovieRow.length > 0 && (
          <MovieRow title="Popular Movies">
            {popularMovieRow.map((movie, index) => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                posterPath={movie.poster_path}
                rating={movie.vote_average}
                mediaType="movie"
                year={movieYear(movie)}
                index={index}
              />
            ))}
          </MovieRow>
        )}

        {comedyRow.length > 0 && (
          <MovieRow title="Comedy">
            {comedyRow.map((movie, index) => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                posterPath={movie.poster_path}
                rating={movie.vote_average}
                mediaType="movie"
                year={movieYear(movie)}
                index={index}
              />
            ))}
          </MovieRow>
        )}

        {popularTvRow.length > 0 && (
          <MovieRow title="Popular TV Shows">
            {popularTvRow.map((show, index) => (
              <MovieCard
                key={show.id}
                id={show.id}
                title={show.name}
                posterPath={show.poster_path}
                rating={show.vote_average}
                mediaType="tv"
                year={tvYear(show)}
                index={index}
              />
            ))}
          </MovieRow>
        )}

        {actionRow.length > 0 && (
          <MovieRow title="Action Movies">
            {actionRow.map((movie, index) => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                posterPath={movie.poster_path}
                rating={movie.vote_average}
                mediaType="movie"
                year={movieYear(movie)}
                index={index}
              />
            ))}
          </MovieRow>
        )}

        {topRatedTvRow.length > 0 && (
          <MovieRow title="Top Rated TV">
            {topRatedTvRow.map((show, index) => (
              <MovieCard
                key={show.id}
                id={show.id}
                title={show.name}
                posterPath={show.poster_path}
                rating={show.vote_average}
                mediaType="tv"
                year={tvYear(show)}
                index={index}
              />
            ))}
          </MovieRow>
        )}

        {trendingTvRow.length > 0 && (
          <MovieRow title="Trending TV">
            {trendingTvRow.map((show, index) => (
              <MovieCard
                key={show.id}
                id={show.id}
                title={show.name}
                posterPath={show.poster_path}
                rating={show.vote_average}
                mediaType="tv"
                year={tvYear(show)}
                index={index}
              />
            ))}
          </MovieRow>
        )}

        {networkRow.length > 0 && (
          <MovieRow title="Popular Series">
            {networkRow.map((show, index) => (
              <MovieCard
                key={show.id}
                id={show.id}
                title={show.name}
                posterPath={show.poster_path}
                rating={show.vote_average}
                mediaType="tv"
                year={tvYear(show)}
                index={index}
              />
            ))}
          </MovieRow>
        )}

        {comingSoon.length > 0 && (
          <MovieRow title="Coming Soon">
            {comingSoon.map((movie, index) => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                posterPath={movie.poster_path}
                rating={movie.vote_average}
                mediaType="movie"
                year={movieYear(movie)}
                index={index}
              />
            ))}
          </MovieRow>
        )}

        {topRatedMovieRow.length > 0 && (
          <MovieRow title="Top Rated Movies">
            {topRatedMovieRow.map((movie, index) => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                posterPath={movie.poster_path}
                rating={movie.vote_average}
                mediaType="movie"
                year={movieYear(movie)}
                index={index}
              />
            ))}
          </MovieRow>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
