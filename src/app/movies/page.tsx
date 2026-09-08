import { tmdb } from '@/lib/tmdb'
import Navbar from '@/components/Navbar'
import MovieCard from '@/components/MovieCard'
import SiteFooter from '@/components/SiteFooter'
import PaginationBar from '@/components/PaginationBar'
import GenreFilterBar from '@/components/GenreFilterBar'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function MoviesPage({
  searchParams,
}: {
  searchParams: Promise<{
    page?: string
    sort?: string
    q?: string
    genre?: string
  }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const sort = params.sort === 'top' ? 'top' : 'popular'
  const q = (params.q || '').trim()
  const genreId = params.genre ? parseInt(params.genre, 10) : NaN
  const genre =
    Number.isFinite(genreId) && genreId > 0 ? genreId : undefined

  let results: Awaited<ReturnType<typeof tmdb.discoverMoviesPaged>>['results'] =
    []
  let totalPages = 1
  let totalResults = 0
  let genres: Awaited<ReturnType<typeof tmdb.getMovieGenres>> = []

  try {
    const [data, genreList] = await Promise.all([
      q
        ? tmdb.searchMoviesPaged(q, page)
        : tmdb.discoverMoviesPaged({
            page,
            genre,
            sortBy: sort === 'top' ? 'vote_average.desc' : 'popularity.desc',
          }),
      tmdb.getMovieGenres(),
    ])
    results = data.results
    totalPages = Math.min(data.totalPages || 1, 500)
    totalResults = data.totalResults || 0
    genres = genreList
  } catch {
    results = []
  }

  const activeGenreName = genres.find((g) => g.id === genre)?.name

  const sortHref = (next: 'popular' | 'top') => {
    const p = new URLSearchParams()
    if (next === 'top') p.set('sort', 'top')
    if (genre) p.set('genre', String(genre))
    const qs = p.toString()
    return qs ? `/movies?${qs}` : '/movies'
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="page-shell flex-1 pb-16 pt-[calc(var(--nav-height)+2rem)]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mb-2 font-display text-4xl tracking-wide text-white md:text-5xl">
              Movies
            </h1>
            <p className="text-sm text-zinc-500">
              {q
                ? `Search results for “${q}”`
                : activeGenreName
                  ? `${activeGenreName} movies`
                  : 'Browse the full TMDB catalog'}
              {totalResults > 0 && (
                <>
                  {' '}
                  · {totalResults.toLocaleString()} titles · page {page} of{' '}
                  {totalPages.toLocaleString()}
                </>
              )}
            </p>
          </div>
          {!q && (
            <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1">
              <Link
                href={sortHref('popular')}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                  sort === 'popular'
                    ? 'bg-white text-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Popular
              </Link>
              <Link
                href={sortHref('top')}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                  sort === 'top'
                    ? 'bg-white text-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Top Rated
              </Link>
            </div>
          )}
        </div>

        <GenreFilterBar
          genres={genres}
          activeGenre={genre}
          basePath="/movies"
          sort={sort}
          q={q || undefined}
        />

        {results.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/5 p-6 text-zinc-400">
            No movies found. Try another genre, page, or search.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {results.map((movie) => (
              <MovieCard
                key={movie.id}
                id={movie.id}
                title={movie.title}
                posterPath={movie.poster_path}
                rating={movie.vote_average}
                mediaType="movie"
                year={movie.release_date?.split('-')[0]}
              />
            ))}
          </div>
        )}

        <PaginationBar
          page={page}
          totalPages={totalPages}
          totalResults={totalResults}
          basePath="/movies"
          query={{
            sort: q ? undefined : sort,
            q: q || undefined,
            genre: q ? undefined : genre ? String(genre) : undefined,
          }}
        />
      </main>
      <SiteFooter />
    </div>
  )
}
