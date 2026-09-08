import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Play, Star, Clock, Calendar, Film } from 'lucide-react'
import { tmdb } from '@/lib/tmdb'
import Navbar from '@/components/Navbar'
import ReviewSection from '@/components/ReviewSection'
import WatchLaterButton from '@/components/WatchLaterButton'
import AddToPlaylistButton from '@/components/AddToPlaylistButton'
import StartWatchPartyButton from '@/components/StartWatchPartyButton'
import MovieCard from '@/components/MovieCard'
import SiteFooter from '@/components/SiteFooter'
import TrailerButton from '@/components/TrailerButton'
import CastGrid from '@/components/CastGrid'

export const dynamic = 'force-dynamic'

export default async function MoviePage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const movieId = parseInt(id, 10)

  if (Number.isNaN(movieId)) {
    notFound()
  }

  let movie
  try {
    movie = await tmdb.getMovieDetails(movieId)
  } catch {
    notFound()
  }

  const trailer = movie.videos?.results?.find((v) => v.type === 'Trailer')
  const director = movie.credits?.crew?.find((c) => c.job === 'Director')

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <section className="relative min-h-[70vh]">
        <div className="absolute inset-0">
          <img
            src={tmdb.getImageUrl(movie.backdrop_path, 'original')}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="hero-scrim absolute inset-0" />
        </div>

        <div className="relative page-shell flex min-h-[70vh] items-end pb-10 pt-[calc(var(--nav-height)+1.5rem)]">
          <div className="flex w-full gap-8">
            <img
              src={tmdb.getImageUrl(movie.poster_path, 'w500')}
              alt={movie.title}
              className="hidden w-44 shrink-0 rounded-xl shadow-2xl ring-1 ring-white/10 md:block lg:w-52"
            />
            <div className="min-w-0 max-w-2xl pb-2">
              <h1 className="font-display text-4xl leading-none text-white sm:text-5xl md:text-6xl">
                {movie.title}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-300">
                <span className="inline-flex items-center gap-1 font-semibold text-white">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {movie.vote_average.toFixed(1)}
                </span>
                <span className="text-zinc-600">·</span>
                <span>{movie.release_date?.split('-')[0]}</span>
                <span className="text-zinc-600">·</span>
                <span>{movie.runtime} min</span>
                <span className="rounded bg-[var(--primary)] px-1.5 py-0.5 text-xs font-bold text-white">
                  HD
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {movie.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>

              <p className="mt-4 line-clamp-3 text-zinc-300">{movie.overview}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/watch/movie/${movie.id}`}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--primary-dark)]"
                >
                  <Play className="h-4 w-4 fill-white" />
                  Watch Now
                </Link>
                {trailer && (
                  <TrailerButton youtubeKey={trailer.key} title={movie.title} />
                )}
                <WatchLaterButton
                  tmdbId={movie.id}
                  title={movie.title}
                  posterPath={movie.poster_path}
                  mediaType="movie"
                />
                <AddToPlaylistButton
                  tmdbId={movie.id}
                  title={movie.title}
                  posterPath={movie.poster_path}
                  mediaType="movie"
                />
                <StartWatchPartyButton
                  tmdbId={movie.id}
                  title={movie.title}
                  mediaType="movie"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      <main className="page-shell py-10">
        <div className="grid gap-8 lg:grid-cols-3">
          <div className="space-y-10 lg:col-span-2">
            <div>
              <h2 className="mb-3 font-display text-2xl tracking-wide text-white">
                Synopsis
              </h2>
              <p className="leading-relaxed text-zinc-400">{movie.overview}</p>
            </div>

            {movie.credits?.cast && movie.credits.cast.length > 0 && (
              <CastGrid cast={movie.credits.cast} limit={8} />
            )}

            {movie.similar?.results && movie.similar.results.length > 0 && (
              <div>
                <h2 className="mb-4 font-display text-2xl tracking-wide text-white">
                  Similar Movies
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {movie.similar.results.slice(0, 4).map((similarMovie) => (
                    <MovieCard
                      key={similarMovie.id}
                      id={similarMovie.id}
                      title={similarMovie.title}
                      posterPath={similarMovie.poster_path}
                      rating={similarMovie.vote_average}
                      mediaType="movie"
                      year={similarMovie.release_date?.split('-')[0]}
                    />
                  ))}
                </div>
              </div>
            )}

            <ReviewSection tmdbId={movie.id} title={movie.title} />
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-300">
                Movie Info
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <Film className="mt-0.5 h-4 w-4 text-zinc-500" />
                  <div>
                    <p className="text-zinc-500">Director</p>
                    <p className="text-white">{director?.name || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 text-zinc-500" />
                  <div>
                    <p className="text-zinc-500">Release Date</p>
                    <p className="text-white">{movie.release_date}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock className="mt-0.5 h-4 w-4 text-zinc-500" />
                  <div>
                    <p className="text-zinc-500">Runtime</p>
                    <p className="text-white">{movie.runtime} minutes</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Star className="mt-0.5 h-4 w-4 text-zinc-500" />
                  <div>
                    <p className="text-zinc-500">Rating</p>
                    <p className="text-white">
                      {movie.vote_average.toFixed(1)}/10
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </aside>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
