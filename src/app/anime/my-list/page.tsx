'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Heart, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import MovieCard from '@/components/MovieCard'
import SiteFooter from '@/components/SiteFooter'

interface WatchLaterItem {
  id: string
  tmdbId: number
  title: string
  posterPath: string
  mediaType: string
  addedAt: string
}

export default function AnimeMyListPage() {
  const { data: session } = useSession()
  const [watchLater, setWatchLater] = useState<WatchLaterItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWatchLater = async () => {
    try {
      const response = await fetch('/api/watch-later?mediaType=anime')
      if (response.ok) {
        const data = await response.json()
        setWatchLater(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching anime list:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) fetchWatchLater()
    else setLoading(false)
  }, [session])

  const removeFromWatchLater = async (item: WatchLaterItem) => {
    try {
      const response = await fetch('/api/watch-later', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: item.tmdbId,
          title: item.title,
          posterPath: item.posterPath,
          mediaType: 'anime',
        }),
      })

      if (response.ok) {
        toast.success('Removed from My List')
        fetchWatchLater()
      }
    } catch {
      toast.error('Failed to remove from My List')
    }
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="page-shell flex-1 pb-16 pt-[calc(var(--nav-height)+2rem)] text-center">
          <Heart className="mx-auto mb-4 h-16 w-16 text-fuchsia-400/40" />
          <h1 className="mb-3 font-[family-name:var(--font-anime-display)] text-3xl text-white">
            Sign in to view your anime list
          </h1>
          <p className="mb-8 text-zinc-400">
            Save anime you want to watch and find them here.
          </p>
          <Link
            href="/auth/signin"
            className="anime-cta-primary inline-block rounded-lg px-8 py-3 text-sm font-bold"
          >
            Sign In
          </Link>
        </div>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="page-shell flex-1 pb-16 pt-[calc(var(--nav-height)+2rem)]">
        <div className="mb-8 flex items-center gap-3">
          <Heart className="h-7 w-7 fill-fuchsia-400 text-fuchsia-400" />
          <h1 className="font-[family-name:var(--font-anime-display)] text-4xl tracking-wide text-white md:text-5xl">
            My Anime List
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-pulse rounded-full bg-fuchsia-400" />
          </div>
        ) : watchLater.length === 0 ? (
          <div className="rounded-2xl border border-fuchsia-400/15 bg-white/[0.03] px-6 py-16 text-center backdrop-blur">
            <Heart className="mx-auto mb-4 h-20 w-20 text-zinc-600" />
            <h2 className="mb-2 text-2xl font-semibold text-white">
              Your anime list is empty
            </h2>
            <p className="mb-8 text-zinc-400">
              Add titles from anime detail pages to keep them here.
            </p>
            <Link
              href="/anime"
              className="anime-cta-primary inline-block rounded-lg px-8 py-3 text-sm font-bold"
            >
              Browse Anime
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {watchLater.map((item) => (
              <div key={item.id} className="group relative">
                <MovieCard
                  id={item.tmdbId}
                  title={item.title}
                  posterPath={item.posterPath}
                  mediaType="anime"
                />
                <button
                  type="button"
                  onClick={() => removeFromWatchLater(item)}
                  className="absolute right-2 top-2 flex h-8 w-8 items-center justify-center rounded-full bg-fuchsia-600 opacity-0 transition hover:bg-fuchsia-500 group-hover:opacity-100"
                  title="Remove from list"
                >
                  <Trash2 className="h-4 w-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
