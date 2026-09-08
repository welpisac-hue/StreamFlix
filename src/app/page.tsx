import Link from 'next/link'
import { Play, Info, Users, Radio } from 'lucide-react'
import { tmdb } from '@/lib/tmdb'
import { prisma } from '@/lib/prisma'
import MovieCard from '@/components/MovieCard'
import MovieRow from '@/components/MovieRow'
import Top10 from '@/components/Top10'
import Navbar from '@/components/Navbar'
import RecommendedSection from '@/components/RecommendedSection'
import SiteFooter from '@/components/SiteFooter'

export const dynamic = 'force-dynamic'

async function settled<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise
  } catch {
    return fallback
  }
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
    upcomingMovies,
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

  const pinnedHero = dbFeatured[0]
  const fallbackHero = trendingMovies[0]

  const heroItem = pinnedHero
    ? {
        id: pinnedHero.tmdbId,
        title: pinnedHero.title,
        overview: pinnedHero.overview,
        backdrop_path: pinnedHero.backdropPath,
        mediaType: pinnedHero.mediaType || 'movie',
        badgeText: pinnedHero.badgeText || 'Featured Spotlight',
      }
    : fallbackHero
      ? {
          id: fallbackHero.id,
          title: fallbackHero.title,
          overview: fallbackHero.overview,
          backdrop_path: fallbackHero.backdrop_path,
          mediaType: 'movie' as const,
          badgeText: 'Now Streaming',
        }
      : null

  const hasContent =
    trendingMovies.length +
      popularMovies.length +
      popularTV.length +
      trendingTV.length >
    0

  return (
    <div className="flex min-h-screen flex-col bg-background page-glow">
      <Navbar />

      <section className="relative min-h-[78vh] w-full">
        <div className="absolute inset-0">
          {heroItem?.backdrop_path ? (
            <img
              src={
                heroItem.backdrop_path.startsWith('http')
                  ? heroItem.backdrop_path
                  : tmdb.getImageUrl(heroItem.backdrop_path, 'original')
              }
              alt=""
              className="h-full w-full object-cover"
            />
          ) : (
            <div className="h-full w-full bg-[radial-gradient(ellipse_at_top,_#2a0a0c_0%,_#070708_55%)]" />
          )}
          <div className="hero-scrim absolute inset-0" />
        </div>

        <div className="relative page-shell flex min-h-[78vh] items-end pb-16 pt-[calc(var(--nav-height)+2rem)] md:items-center md:pb-24">
          <div className="animate-fade-up max-w-xl">
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.2em] text-[var(--primary)]">
              {heroItem?.badgeText || 'Now Streaming'}
            </p>
            <h1 className="font-display text-5xl leading-none text-white sm:text-6xl md:text-7xl">
              {heroItem?.title || 'STREAMFLIX'}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-300 md:text-lg">
              {heroItem?.overview ||
                'Watch movies and TV shows free. Stream powered by VidKing.'}
            </p>
            {heroItem ? (
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={
                    heroItem.mediaType === 'tv'
                      ? `/watch/tv/${heroItem.id}/1/1`
                      : `/watch/movie/${heroItem.id}`
                  }
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-zinc-200"
                >
                  <Play className="h-4 w-4 fill-black" />
                  Play
                </Link>
                <Link
                  href={
                    heroItem.mediaType === 'tv'
                      ? `/tv/${heroItem.id}`
                      : `/movie/${heroItem.id}`
                  }
                  className="inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15"
                >
                  <Info className="h-4 w-4" />
                  More Info
                </Link>
              </div>
            ) : (
              !hasContent && (
                <p className="mt-6 rounded-lg border border-amber-500/30 bg-amber-500/10 px-4 py-3 text-sm text-amber-200">
                  Catalog couldn&apos;t load from TMDB. Check that{' '}
                  <code className="text-amber-100">TMDB_API_KEY</code> is set
                  (v3 key or v4 read token).
                </p>
              )
            )}
          </div>
        </div>
      </section>

      <main className="page-shell relative z-10 -mt-6 space-y-2 pb-8 md:-mt-10">
        {/* ── Live Watch Party Banner ── */}
        {activeParty && (
          <div className="relative overflow-hidden rounded-2xl border border-purple-500/30 bg-gradient-to-r from-purple-950/80 via-fuchsia-950/60 to-purple-950/80 p-6 shadow-2xl shadow-purple-900/30">
            {/* Animated pulse ring */}
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
                  <span className="rounded-full border border-purple-500/30 bg-purple-500/10 px-2 py-0.5 text-xs font-semibold text-purple-300 uppercase">
                    {activeParty.mediaType}
                  </span>
                  {activeParty.seasonNumber && (
                    <span className="text-zinc-500">
                      S{activeParty.seasonNumber} E{activeParty.episodeNumber ?? 1}
                    </span>
                  )}
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

        {trendingMovies.length > 0 && (
          <Top10
            movies={trendingMovies.map((m) => ({
              ...m,
              mediaType: 'movie' as const,
            }))}
          />
        )}

        <RecommendedSection />

        {trendingMovies.length > 0 && (
          <MovieRow title="Trending Now">
            {trendingMovies.map((movie, index) => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                posterPath={movie.poster_path}
                rating={movie.vote_average}
                mediaType="movie"
                year={movie.release_date?.split('-')[0]}
                index={index}
              />
            ))}
          </MovieRow>
        )}

        {popularMovies.length > 0 && (
          <MovieRow title="Popular Movies">
            {popularMovies.map((movie, index) => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                posterPath={movie.poster_path}
                rating={movie.vote_average}
                mediaType="movie"
                year={movie.release_date?.split('-')[0]}
                index={index}
              />
            ))}
          </MovieRow>
        )}

        {popularTV.length > 0 && (
          <MovieRow title="Popular TV Shows">
            {popularTV.map((show, index) => (
              <MovieCard
                key={show.id}
                id={show.id}
                title={show.name}
                posterPath={show.poster_path}
                rating={show.vote_average}
                mediaType="tv"
                year={show.first_air_date?.split('-')[0]}
                index={index}
              />
            ))}
          </MovieRow>
        )}

        {topRatedTV.length > 0 && (
          <MovieRow title="Top Rated TV">
            {topRatedTV.map((show, index) => (
              <MovieCard
                key={show.id}
                id={show.id}
                title={show.name}
                posterPath={show.poster_path}
                rating={show.vote_average}
                mediaType="tv"
                year={show.first_air_date?.split('-')[0]}
                index={index}
              />
            ))}
          </MovieRow>
        )}

        {trendingTV.length > 0 && (
          <MovieRow title="Trending TV">
            {trendingTV.map((show, index) => (
              <MovieCard
                key={show.id}
                id={show.id}
                title={show.name}
                posterPath={show.poster_path}
                rating={show.vote_average}
                mediaType="tv"
                year={show.first_air_date?.split('-')[0]}
                index={index}
              />
            ))}
          </MovieRow>
        )}

        {popularNetworkShows.length > 0 && (
          <MovieRow title="Popular Series">
            {popularNetworkShows.map((show, index) => (
              <MovieCard
                key={show.id}
                id={show.id}
                title={show.name}
                posterPath={show.poster_path}
                rating={show.vote_average}
                mediaType="tv"
                year={show.first_air_date?.split('-')[0]}
                index={index}
              />
            ))}
          </MovieRow>
        )}

        {upcomingMovies.length > 0 && (
          <MovieRow title="Coming Soon">
            {upcomingMovies.map((movie, index) => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                posterPath={movie.poster_path}
                rating={movie.vote_average}
                mediaType="movie"
                year={movie.release_date?.split('-')[0]}
                index={index}
              />
            ))}
          </MovieRow>
        )}

        {topRatedMovies.length > 0 && (
          <MovieRow title="Top Rated Movies">
            {topRatedMovies.map((movie, index) => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                posterPath={movie.poster_path}
                rating={movie.vote_average}
                mediaType="movie"
                year={movie.release_date?.split('-')[0]}
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
