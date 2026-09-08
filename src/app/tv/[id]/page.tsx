import { notFound } from 'next/navigation'
import Link from 'next/link'
import { Play, Star, Clock, Calendar, Tv } from 'lucide-react'
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

export default async function TVShowPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const tvId = parseInt(id, 10)

  if (Number.isNaN(tvId)) {
    notFound()
  }

  let show
  try {
    show = await tmdb.getTVShowDetails(tvId)
  } catch {
    notFound()
  }

  const trailer = show.videos?.results?.find((v) => v.type === 'Trailer')
  const creator = show.created_by?.[0]
  const firstSeason =
    show.seasons?.find((s) => s.season_number > 0) || show.seasons?.[0]
  const watchSeason = firstSeason?.season_number || 1

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />

      <section className="relative min-h-[70vh]">
        <div className="absolute inset-0">
          <img
            src={tmdb.getImageUrl(show.backdrop_path, 'original')}
            alt=""
            className="h-full w-full object-cover"
          />
          <div className="hero-scrim absolute inset-0" />
        </div>

        <div className="relative page-shell flex min-h-[70vh] items-end pb-10 pt-[calc(var(--nav-height)+1.5rem)]">
          <div className="flex w-full gap-8">
            <img
              src={tmdb.getImageUrl(show.poster_path, 'w500')}
              alt={show.name}
              className="hidden w-44 shrink-0 rounded-xl shadow-2xl ring-1 ring-white/10 md:block lg:w-52"
            />
            <div className="min-w-0 max-w-2xl pb-2">
              <h1 className="font-display text-4xl leading-none text-white sm:text-5xl md:text-6xl">
                {show.name}
              </h1>
              <div className="mt-4 flex flex-wrap items-center gap-x-3 gap-y-2 text-sm text-zinc-300">
                <span className="inline-flex items-center gap-1 font-semibold text-white">
                  <Star className="h-4 w-4 fill-amber-400 text-amber-400" />
                  {show.vote_average.toFixed(1)}
                </span>
                <span className="text-zinc-600">·</span>
                <span>{show.first_air_date?.split('-')[0]}</span>
                <span className="text-zinc-600">·</span>
                <span>{show.number_of_seasons} Seasons</span>
                <span className="rounded bg-[var(--primary)] px-1.5 py-0.5 text-xs font-bold text-white">
                  HD
                </span>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                {show.genres.map((genre) => (
                  <span
                    key={genre.id}
                    className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-xs text-zinc-300"
                  >
                    {genre.name}
                  </span>
                ))}
              </div>

              <p className="mt-4 line-clamp-3 text-zinc-300">{show.overview}</p>

              <div className="mt-6 flex flex-wrap gap-3">
                <Link
                  href={`/watch/tv/${show.id}/${watchSeason}/1`}
                  className="inline-flex items-center gap-2 rounded-lg bg-[var(--primary)] px-6 py-3 text-sm font-bold text-white hover:bg-[var(--primary-dark)]"
                >
                  <Play className="h-4 w-4 fill-white" />
                  Watch Now
                </Link>
                {trailer && (
                  <TrailerButton youtubeKey={trailer.key} title={show.name} />
                )}
                <WatchLaterButton
                  tmdbId={show.id}
                  title={show.name}
                  posterPath={show.poster_path}
                  mediaType="tv"
                />
                <AddToPlaylistButton
                  tmdbId={show.id}
                  title={show.name}
                  posterPath={show.poster_path}
                  mediaType="tv"
                />
                <StartWatchPartyButton
                  tmdbId={show.id}
                  title={show.name}
                  mediaType="tv"
                  seasonNumber={watchSeason}
                  episodeNumber={1}
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
              <p className="leading-relaxed text-zinc-400">{show.overview}</p>
            </div>

            <div>
              <h2 className="mb-4 font-display text-2xl tracking-wide text-white">
                Seasons
              </h2>
              <div className="space-y-3">
                {show.seasons
                  ?.filter((season) => season.season_number > 0)
                  .map((season) => (
                    <Link
                      key={season.id}
                      href={`/tv/${show.id}/season/${season.season_number}`}
                      className="flex gap-4 rounded-xl border border-white/5 bg-white/[0.03] p-3 transition hover:bg-white/[0.06]"
                    >
                      <img
                        src={tmdb.getImageUrl(season.poster_path, 'w200')}
                        alt={season.name}
                        className="h-28 w-20 shrink-0 rounded-lg object-cover"
                      />
                      <div className="min-w-0">
                        <h3 className="font-semibold text-white">{season.name}</h3>
                        <p className="mt-1 text-sm text-zinc-500">
                          {season.episode_count} episodes
                        </p>
                        <p className="mt-2 line-clamp-2 text-sm text-zinc-400">
                          {season.overview}
                        </p>
                      </div>
                    </Link>
                  ))}
              </div>
            </div>

            {show.credits?.cast && show.credits.cast.length > 0 && (
              <CastGrid cast={show.credits.cast} limit={8} />
            )}

            {show.similar?.results && show.similar.results.length > 0 && (
              <div>
                <h2 className="mb-4 font-display text-2xl tracking-wide text-white">
                  Similar Shows
                </h2>
                <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
                  {show.similar.results.slice(0, 4).map((similarShow) => (
                    <MovieCard
                      key={similarShow.id}
                      id={similarShow.id}
                      title={similarShow.name}
                      posterPath={similarShow.poster_path}
                      rating={similarShow.vote_average}
                      mediaType="tv"
                      year={similarShow.first_air_date?.split('-')[0]}
                    />
                  ))}
                </div>
              </div>
            )}

            <ReviewSection tmdbId={show.id} title={show.name} />
          </div>

          <aside className="space-y-4">
            <div className="rounded-xl border border-white/5 bg-white/[0.03] p-5">
              <h3 className="mb-4 text-sm font-semibold uppercase tracking-wider text-zinc-300">
                Show Info
              </h3>
              <div className="space-y-4 text-sm">
                <div className="flex gap-3">
                  <Tv className="mt-0.5 h-4 w-4 text-zinc-500" />
                  <div>
                    <p className="text-zinc-500">Creator</p>
                    <p className="text-white">{creator?.name || 'N/A'}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 text-zinc-500" />
                  <div>
                    <p className="text-zinc-500">First Air Date</p>
                    <p className="text-white">{show.first_air_date}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Clock className="mt-0.5 h-4 w-4 text-zinc-500" />
                  <div>
                    <p className="text-zinc-500">Seasons</p>
                    <p className="text-white">{show.number_of_seasons}</p>
                  </div>
                </div>
                <div className="flex gap-3">
                  <Star className="mt-0.5 h-4 w-4 text-zinc-500" />
                  <div>
                    <p className="text-zinc-500">Rating</p>
                    <p className="text-white">
                      {show.vote_average.toFixed(1)}/10
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
