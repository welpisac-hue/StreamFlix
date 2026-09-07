import Link from 'next/link'
import { Play, Info } from 'lucide-react'
import { tmdb } from '@/lib/tmdb'
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
    trendingMovies,
    popularMovies,
    topRatedMovies,
    trendingTV,
    popularTV,
    topRatedTV,
    popularNetworkShows,
    upcomingMovies,
  ] = await Promise.all([
    settled(tmdb.getTrendingMovies(), []),
    settled(tmdb.getPopularMovies(), []),
    settled(tmdb.getTopRatedMovies(), []),
    settled(tmdb.getTrendingTV(), []),
    settled(tmdb.getPopularTV(), []),
    settled(tmdb.getTopRatedTV(), []),
    settled(tmdb.getPopularNetworkShows(), []),
    settled(tmdb.getUpcomingMovies(), []),
  ])

  const featured = trendingMovies[0]
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
          {featured?.backdrop_path ? (
            <img
              src={tmdb.getImageUrl(featured.backdrop_path, 'original')}
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
              Now Streaming
            </p>
            <h1 className="font-display text-5xl leading-none text-white sm:text-6xl md:text-7xl">
              {featured?.title || 'STREAMFLIX'}
            </h1>
            <p className="mt-4 max-w-lg text-base leading-relaxed text-zinc-300 md:text-lg">
              {featured?.overview ||
                'Watch movies and TV shows free. Stream powered by VidKing.'}
            </p>
            {featured ? (
              <div className="mt-7 flex flex-wrap gap-3">
                <Link
                  href={`/watch/movie/${featured.id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-white px-6 py-3 text-sm font-bold text-black transition hover:bg-zinc-200"
                >
                  <Play className="h-4 w-4 fill-black" />
                  Play
                </Link>
                <Link
                  href={`/movie/${featured.id}`}
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
