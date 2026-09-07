'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Clock, Play, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import SiteFooter from '@/components/SiteFooter'
import { getImageUrl } from '@/lib/tmdb/images'

interface WatchHistoryItem {
  id: string
  tmdbId: number
  title: string
  posterPath: string | null
  mediaType: string
  seasonNumber: number | null
  episodeNumber: number | null
  timestamp: number
  duration: number
  completed: boolean
  lastWatched: string
}

function resolvePoster(path: string | null | undefined): string {
  if (!path) return '/placeholder.svg'
  if (path.startsWith('http')) return path
  return getImageUrl(path, 'w500')
}

function watchHref(item: WatchHistoryItem): string {
  const ep = item.episodeNumber && item.episodeNumber > 0 ? item.episodeNumber : 1
  return `/watch/anime/${item.tmdbId}/${ep}`
}

export default function AnimeContinueWatchingPage() {
  const { data: session } = useSession()
  const [watchHistory, setWatchHistory] = useState<WatchHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  const fetchWatchHistory = async () => {
    try {
      const response = await fetch('/api/watch-history?mediaType=anime')
      if (response.ok) {
        const data = await response.json()
        setWatchHistory(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching anime watch history:', error)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    if (session) fetchWatchHistory()
    else setLoading(false)
  }, [session])

  const deleteFromHistory = async (id: string) => {
    try {
      const response = await fetch(`/api/watch-history/${id}`, {
        method: 'DELETE',
      })
      if (response.ok) {
        toast.success('Removed from history')
        fetchWatchHistory()
      }
    } catch {
      toast.error('Failed to remove from history')
    }
  }

  const getProgressPercentage = (timestamp: number, duration: number) => {
    if (!duration) return 0
    return Math.min((timestamp / duration) * 100, 100)
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60
    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs
        .toString()
        .padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  if (!session) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="page-shell flex-1 pb-16 pt-[calc(var(--nav-height)+2rem)] text-center">
          <Clock className="mx-auto mb-4 h-16 w-16 text-cyan-400/40" />
          <h1 className="mb-3 font-[family-name:var(--font-anime-display)] text-3xl text-white">
            Sign in to continue watching anime
          </h1>
          <p className="mb-8 text-zinc-400">
            Track episodes and pick up where you left off.
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

  const incompleteHistory = watchHistory.filter((item) => !item.completed)
  const completedHistory = watchHistory.filter((item) => item.completed)

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="page-shell flex-1 pb-16 pt-[calc(var(--nav-height)+2rem)]">
        <div className="mb-8 flex items-center gap-3">
          <Clock className="h-7 w-7 text-cyan-300" />
          <h1 className="font-[family-name:var(--font-anime-display)] text-4xl tracking-wide text-white md:text-5xl">
            Continue Watching
          </h1>
        </div>

        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-pulse rounded-full bg-cyan-400" />
          </div>
        ) : incompleteHistory.length === 0 ? (
          <div className="rounded-2xl border border-fuchsia-400/15 bg-white/[0.03] px-6 py-16 text-center backdrop-blur">
            <Clock className="mx-auto mb-4 h-20 w-20 text-zinc-600" />
            <h2 className="mb-2 text-2xl font-semibold text-white">
              No anime in progress
            </h2>
            <p className="mb-8 text-zinc-400">
              Start an episode and it will show up here.
            </p>
            <Link
              href="/anime"
              className="anime-cta-primary inline-block rounded-lg px-8 py-3 text-sm font-bold"
            >
              Browse Anime
            </Link>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
            {incompleteHistory.map((item) => {
              const progress = getProgressPercentage(
                item.timestamp,
                item.duration
              )
              const imageUrl = resolvePoster(item.posterPath)
              const href = watchHref(item)

              return (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-fuchsia-400/15 bg-white/[0.03] backdrop-blur"
                >
                  <div className="group relative aspect-video">
                    <img
                      src={imageUrl}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute inset-0 flex items-center justify-center bg-black/50 opacity-0 transition group-hover:opacity-100">
                      <Link
                        href={href}
                        className="flex h-14 w-14 items-center justify-center rounded-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 transition hover:brightness-110"
                      >
                        <Play className="ml-0.5 h-7 w-7 fill-black text-black" />
                      </Link>
                    </div>
                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-zinc-800">
                      <div
                        className="h-full bg-gradient-to-r from-fuchsia-500 to-cyan-400 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="mb-2 flex items-start justify-between gap-2">
                      <div className="min-w-0 flex-1">
                        <h3 className="truncate font-semibold text-white">
                          {item.title}
                        </h3>
                        {item.episodeNumber != null && (
                          <p className="text-sm text-zinc-400">
                            Episode {item.episodeNumber}
                          </p>
                        )}
                      </div>
                      <button
                        type="button"
                        onClick={() => deleteFromHistory(item.id)}
                        className="text-zinc-400 transition hover:text-fuchsia-400"
                        title="Remove from history"
                      >
                        <Trash2 className="h-4 w-4" />
                      </button>
                    </div>

                    <div className="mb-3 flex items-center justify-between text-sm text-zinc-400">
                      <span>
                        {formatTime(item.timestamp)} /{' '}
                        {formatTime(item.duration)}
                      </span>
                      <span>{Math.round(progress)}%</span>
                    </div>

                    <Link
                      href={href}
                      className="anime-cta-primary block w-full rounded-lg py-2.5 text-center text-sm font-bold"
                    >
                      Continue Watching
                    </Link>
                  </div>
                </div>
              )
            })}
          </div>
        )}

        {completedHistory.length > 0 && (
          <div className="mt-12">
            <h2 className="mb-6 font-[family-name:var(--font-anime-display)] text-2xl tracking-wide text-white">
              Completed
            </h2>
            <div className="grid grid-cols-1 gap-5 md:grid-cols-2 lg:grid-cols-3">
              {completedHistory.map((item) => (
                <div
                  key={item.id}
                  className="overflow-hidden rounded-xl border border-white/10 bg-white/[0.02] opacity-70"
                >
                  <div className="relative aspect-video">
                    <img
                      src={resolvePoster(item.posterPath)}
                      alt={item.title}
                      referrerPolicy="no-referrer"
                      className="h-full w-full object-cover"
                    />
                    <div className="absolute right-2 top-2 rounded bg-emerald-600 px-2 py-1 text-xs text-white">
                      Completed
                    </div>
                  </div>
                  <div className="p-4">
                    <h3 className="font-semibold text-white">{item.title}</h3>
                    {item.episodeNumber != null && (
                      <p className="text-sm text-zinc-400">
                        Episode {item.episodeNumber}
                      </p>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>
      <SiteFooter />
    </div>
  )
}
