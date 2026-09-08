'use client'

import { useCallback, useEffect, useState } from 'react'
import { Film, Loader2, Plus, Star, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { getImageUrl } from '@/lib/tmdb/images'

type FeaturedItem = {
  id: string
  tmdbId: number
  title: string
  overview: string | null
  posterPath: string | null
  backdropPath: string | null
  mediaType: string
  badgeText: string | null
  order: number
  isActive: boolean
}

export default function AdminFeaturedTab() {
  const [items, setItems] = useState<FeaturedItem[]>([])
  const [loading, setLoading] = useState(true)
  const [tmdbId, setTmdbId] = useState('')
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie')
  const [badgeText, setBadgeText] = useState('')
  const [fetchingTmdb, setFetchingTmdb] = useState(false)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/featured')
      if (!res.ok) throw new Error('Failed to load featured items')
      const data = await res.json()
      setItems(data.featured || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const addFeatured = async (e: React.FormEvent) => {
    e.preventDefault()
    const id = parseInt(tmdbId, 10)
    if (!Number.isFinite(id) || id <= 0) {
      toast.error('Please enter a valid TMDB ID')
      return
    }

    setFetchingTmdb(true)
    try {
      // Fetch details from TMDB API to populate title, overview, images
      const detailsRes = await fetch(
        mediaType === 'movie' ? `/api/tmdb/movie/${id}` : `/api/tmdb/tv/${id}`
      )
      if (!detailsRes.ok) throw new Error('Could not find TMDB item')
      const details = await detailsRes.json()

      const title = details.title || details.name
      const overview = details.overview
      const posterPath = details.poster_path
      const backdropPath = details.backdrop_path

      const res = await fetch('/api/admin/featured', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: id,
          title,
          overview,
          posterPath,
          backdropPath,
          mediaType,
          badgeText: badgeText || undefined,
        }),
      })

      if (!res.ok) throw new Error('Failed to pin featured item')
      toast.success(`Pinned "${title}" to Hero Carousel`)
      setTmdbId('')
      setBadgeText('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Add failed')
    } finally {
      setFetchingTmdb(false)
    }
  }

  const removeItem = async (id: string, title: string) => {
    if (!confirm(`Remove "${title}" from Hero Carousel?`)) return
    try {
      const res = await fetch(`/api/admin/featured?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Delete failed')
      toast.success('Removed from featured')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-zinc-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading featured manager…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      {/* Add Form */}
      <form onSubmit={addFeatured} className="rounded-xl border border-white/10 bg-zinc-950/60 p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
          <Plus className="h-4 w-4 text-[var(--primary)]" />
          Pin New Hero Banner Item
        </h2>

        <div className="grid gap-3 sm:grid-cols-4">
          <input
            type="number"
            value={tmdbId}
            onChange={(e) => setTmdbId(e.target.value)}
            placeholder="TMDB ID (e.g. 157336)"
            required
            className="rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--primary)]"
          />

          <select
            value={mediaType}
            onChange={(e) => setMediaType(e.target.value as 'movie' | 'tv')}
            className="rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--primary)]"
          >
            <option value="movie">Movie</option>
            <option value="tv">TV Show</option>
          </select>

          <input
            value={badgeText}
            onChange={(e) => setBadgeText(e.target.value)}
            placeholder="Badge text (e.g. premiere)"
            className="rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 text-sm text-white outline-none focus:border-[var(--primary)]"
          />

          <button
            type="submit"
            disabled={fetchingTmdb}
            className="inline-flex items-center justify-center gap-2 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold text-white hover:brightness-110 disabled:opacity-50"
          >
            {fetchingTmdb && <Loader2 className="h-4 w-4 animate-spin" />}
            Pin to Hero
          </button>
        </div>
      </form>

      {/* Featured Items List */}
      <div className="space-y-3">
        <h3 className="flex items-center gap-2 text-sm font-semibold text-zinc-300">
          <Film className="h-4 w-4 text-sky-400" />
          Pinned Hero Items ({items.length})
        </h3>

        {items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-zinc-950/40 py-8 text-center text-sm text-zinc-500">
            No custom featured items pinned. Homepage will show default trending content.
          </div>
        ) : (
          <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {items.map((item) => (
              <div
                key={item.id}
                className="relative overflow-hidden rounded-xl border border-white/10 bg-zinc-950 p-3 shadow-lg"
              >
                <div className="flex gap-3">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getImageUrl(item.posterPath, 'w185')}
                    alt={item.title}
                    className="h-24 w-16 shrink-0 rounded object-cover bg-zinc-800"
                  />

                  <div className="min-w-0 flex-1">
                    <span className="rounded bg-red-600/20 px-1.5 py-0.5 text-[10px] uppercase font-bold text-red-300">
                      {item.badgeText || item.mediaType}
                    </span>
                    <h4 className="mt-1 font-semibold text-white truncate">{item.title}</h4>
                    <p className="mt-1 text-xs text-zinc-400 line-clamp-2">
                      {item.overview || 'No overview.'}
                    </p>
                  </div>
                </div>

                <div className="mt-3 flex items-center justify-between border-t border-white/5 pt-2 text-xs">
                  <span className="text-zinc-500">Order #{item.order}</span>
                  <button
                    type="button"
                    onClick={() => removeItem(item.id, item.title)}
                    className="inline-flex items-center gap-1 rounded p-1 text-red-400 hover:bg-red-500/10"
                    title="Remove"
                  >
                    <Trash2 className="h-3.5 w-3.5" />
                    Unpin
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}
