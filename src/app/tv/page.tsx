import { tmdb } from '@/lib/tmdb'
import Navbar from '@/components/Navbar'
import MovieCard from '@/components/MovieCard'
import SiteFooter from '@/components/SiteFooter'
import PaginationBar from '@/components/PaginationBar'
import Link from 'next/link'

export const dynamic = 'force-dynamic'

export default async function TVBrowsePage({
  searchParams,
}: {
  searchParams: Promise<{ page?: string; sort?: string; q?: string }>
}) {
  const params = await searchParams
  const page = Math.max(1, parseInt(params.page || '1', 10) || 1)
  const sort = params.sort === 'top' ? 'top' : 'popular'
  const q = (params.q || '').trim()

  let results: Awaited<ReturnType<typeof tmdb.discoverTVPaged>>['results'] = []
  let totalPages = 1
  let totalResults = 0

  try {
    const data = q
      ? await tmdb.searchTVPaged(q, page)
      : await tmdb.discoverTVPaged({
          page,
          sortBy: sort === 'top' ? 'vote_average.desc' : 'popularity.desc',
        })
    results = data.results
    totalPages = Math.min(data.totalPages || 1, 500)
    totalResults = data.totalResults || 0
  } catch {
    results = []
  }

  return (
    <div className="flex min-h-screen flex-col bg-background">
      <Navbar />
      <main className="page-shell flex-1 pb-16 pt-[calc(var(--nav-height)+2rem)]">
        <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="mb-2 font-display text-4xl tracking-wide text-white md:text-5xl">
              TV Shows
            </h1>
            <p className="text-sm text-zinc-500">
              {q
                ? `Search results for “${q}”`
                : 'Browse the full TMDB TV catalog'}
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
                href="/tv?sort=popular"
                className={`rounded-md px-3 py-1.5 text-sm font-semibold ${
                  sort === 'popular'
                    ? 'bg-white text-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Popular
              </Link>
              <Link
                href="/tv?sort=top"
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

        {results.length === 0 ? (
          <p className="rounded-xl border border-white/10 bg-white/5 p-6 text-zinc-400">
            No TV shows found. Try another page or search.
          </p>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {results.map((show) => (
              <MovieCard
                key={show.id}
                id={show.id}
                title={show.name}
                posterPath={show.poster_path}
                rating={show.vote_average}
                mediaType="tv"
                year={show.first_air_date?.split('-')[0]}
              />
            ))}
          </div>
        )}

        <PaginationBar
          page={page}
          totalPages={totalPages}
          totalResults={totalResults}
          basePath="/tv"
          query={{ sort: q ? undefined : sort, q: q || undefined }}
        />
      </main>
      <SiteFooter />
    </div>
  )
}
