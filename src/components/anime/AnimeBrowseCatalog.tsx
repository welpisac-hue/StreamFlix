'use client'

import { useEffect, useMemo, useState } from 'react'
import { useRouter, useSearchParams } from 'next/navigation'
import type { AnimeListItem, AnimePageResult } from '@/lib/anilist/types'
import {
  pickTitleForLanguage,
  sortAnimeByLanguagePreference,
} from '@/lib/anime-language'
import MovieCard from '@/components/MovieCard'
import PaginationBar from '@/components/PaginationBar'
import { useAnimeLanguage } from './AnimeLanguageContext'

export default function AnimeBrowseCatalog() {
  const searchParams = useSearchParams()
  const router = useRouter()
  const { language } = useAnimeLanguage()

  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const sort = searchParams.get('sort') || 'popular'
  const q = (searchParams.get('q') || '').trim()

  const [data, setData] = useState<AnimePageResult | null>(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState<string | null>(null)

  useEffect(() => {
    let cancelled = false
    let attempt = 0

    const load = async () => {
      setLoading(true)
      setError(null)
      try {
        const params = new URLSearchParams({
          paged: '1',
          page: String(page),
        })
        if (q) {
          params.set('type', 'search')
          params.set('q', q)
        } else if (sort === 'trending') {
          params.set('type', 'trending')
        } else if (sort === 'top') {
          params.set('type', 'top')
        } else {
          params.set('type', 'popular')
        }

        const res = await fetch(`/api/anime?${params.toString()}`, {
          cache: 'no-store',
        })
        if (!res.ok) throw new Error('Failed to load')
        const json = await res.json()
        if (cancelled) return

        const next: AnimePageResult = Array.isArray(json)
          ? {
              items: json,
              page,
              totalPages: page,
              total: json.length,
              hasNextPage: false,
            }
          : (json as AnimePageResult)

        // One automatic retry when popular/list comes back empty (upstream blips)
        if (
          (!next.items || next.items.length === 0) &&
          attempt < 1 &&
          !q
        ) {
          attempt += 1
          await new Promise((r) => setTimeout(r, 600))
          if (!cancelled) await load()
          return
        }

        setData(next)
      } catch {
        if (!cancelled) {
          setError('Unable to load anime right now.')
          setData(null)
        }
      } finally {
        if (!cancelled) setLoading(false)
      }
    }

    void load()
    return () => {
      cancelled = true
    }
  }, [page, sort, q])

  const items = useMemo(() => {
    const list: AnimeListItem[] = data?.items || []
    return sortAnimeByLanguagePreference(list, language).map((a) => ({
      ...a,
      title: pickTitleForLanguage(a.titles, language, a.title),
    }))
  }, [data, language])

  const setSort = (next: string) => {
    const params = new URLSearchParams()
    params.set('sort', next)
    router.push(`/anime/browse?${params.toString()}`)
  }

  return (
    <div>
      <div className="mb-6 flex flex-wrap items-end justify-between gap-4">
        <div>
          <h1 className="mb-2 font-[family-name:var(--font-anime-display)] text-4xl tracking-wide text-white md:text-5xl">
            {q ? 'Search Anime' : 'Browse Anime'}
          </h1>
          <p className="text-sm text-zinc-400">
            {q ? (
              <>Results for &ldquo;{q}&rdquo;</>
            ) : (
              <>Full AniList catalog · language-aware titles</>
            )}
            {data && data.total > 0 && (
              <>
                {' '}
                · {data.total.toLocaleString()} titles · page {data.page} of{' '}
                {data.totalPages.toLocaleString()}
              </>
            )}
          </p>
        </div>

        {!q && (
          <div className="inline-flex rounded-lg border border-fuchsia-400/20 bg-white/5 p-1">
            {[
              ['popular', 'Popular'],
              ['trending', 'Trending'],
              ['top', 'Top Rated'],
            ].map(([value, label]) => (
              <button
                key={value}
                type="button"
                onClick={() => setSort(value)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold transition ${
                  sort === value
                    ? 'bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {label}
              </button>
            ))}
          </div>
        )}
      </div>

      {loading ? (
        <div className="flex justify-center py-20">
          <div className="h-8 w-8 animate-pulse rounded-full bg-fuchsia-400" />
        </div>
      ) : error ? (
        <p className="rounded-xl border border-amber-500/30 bg-amber-500/10 p-6 text-amber-200">
          {error}
        </p>
      ) : items.length === 0 ? (
        <p className="rounded-xl border border-white/10 bg-white/5 p-6 text-zinc-400">
          No anime found. Try another search or page.
        </p>
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
          {items.map((item) => (
            <MovieCard
              key={item.id}
              id={item.id}
              title={item.title}
              posterPath={item.coverImage}
              rating={item.averageScore}
              mediaType="anime"
              year={item.seasonYear}
            />
          ))}
        </div>
      )}

      {data && data.totalPages > 1 && (
        <PaginationBar
          page={data.page}
          totalPages={data.totalPages}
          totalResults={data.total}
          basePath="/anime/browse"
          query={{
            sort: q ? undefined : sort,
            q: q || undefined,
          }}
          accent="anime"
        />
      )}
    </div>
  )
}
