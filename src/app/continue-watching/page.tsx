'use client'

import { useState, useEffect, useMemo } from 'react'
import { useSession } from 'next-auth/react'
import { Clock, Play, Trash2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import { getImageUrl } from '@/lib/tmdb/images'
import Link from 'next/link'
import toast from 'react-hot-toast'
import {
  aggregateWatchHistory,
  type RawWatchHistoryItem,
} from '@/lib/watch-history-aggregate'

export default function ContinueWatchingPage() {
  const { data: session } = useSession()
  const [watchHistory, setWatchHistory] = useState<RawWatchHistoryItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetchWatchHistory()
    }
  }, [session])

  const fetchWatchHistory = async () => {
    try {
      const response = await fetch('/api/watch-history?mediaType=movies')
      if (response.ok) {
        const data = await response.json()
        setWatchHistory(Array.isArray(data) ? data : [])
      }
    } catch (error) {
      console.error('Error fetching watch history:', error)
    } finally {
      setLoading(false)
    }
  }

  const aggregated = useMemo(
    () => aggregateWatchHistory(watchHistory),
    [watchHistory]
  )
  const incompleteHistory = useMemo(
    () => aggregated.filter((item) => !item.completed),
    [aggregated]
  )
  const completedHistory = useMemo(
    () => aggregated.filter((item) => item.completed),
    [aggregated]
  )

  const deleteFromHistory = async (
    id: string,
    isSeries: boolean
  ) => {
    try {
      const url = isSeries
        ? `/api/watch-history/${id}?series=1`
        : `/api/watch-history/${id}`
      const response = await fetch(url, { method: 'DELETE' })

      if (response.ok) {
        toast.success('Removed from history')
        fetchWatchHistory()
      }
    } catch (error) {
      toast.error('Failed to remove from history')
    }
  }

  const formatTime = (seconds: number) => {
    const hours = Math.floor(seconds / 3600)
    const minutes = Math.floor((seconds % 3600) / 60)
    const secs = seconds % 60

    if (hours > 0) {
      return `${hours}:${minutes.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`
    }
    return `${minutes}:${secs.toString().padStart(2, '0')}`
  }

  const watchHref = (item: (typeof aggregated)[number]) => {
    if (item.mediaType === 'movie') return `/watch/movie/${item.tmdbId}`
    if (item.mediaType === 'anime') {
      return `/watch/anime/${item.tmdbId}/${item.episodeNumber || 1}`
    }
    return `/watch/tv/${item.tmdbId}/${item.seasonNumber || 1}/${item.episodeNumber || 1}`
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-24 px-8 md:px-16 max-w-7xl mx-auto text-center">
          <Clock className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">Sign in to view your watch history</h1>
          <p className="text-gray-400 mb-8">Create an account to keep track of what you've watched.</p>
          <a
            href="/auth/signin"
            className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Sign In
          </a>
        </div>
      </div>
    )
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-24 px-8 md:px-16 max-w-7xl mx-auto">
          <div className="text-white text-xl">Loading...</div>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <div className="pt-24 px-8 md:px-16 max-w-7xl mx-auto">
        <div className="flex items-center gap-3 mb-8">
          <Clock className="w-8 h-8 text-red-500" />
          <h1 className="text-4xl font-bold text-white">Continue Watching</h1>
        </div>

        {incompleteHistory.length === 0 ? (
          <div className="text-center py-16">
            <Clock className="w-24 h-24 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">No watch history yet</h2>
            <p className="text-gray-400 mb-8">
              Start watching movies and shows to build your watch history.
            </p>
            <a
              href="/"
              className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Browse Content
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
            {incompleteHistory.map((item) => {
              const progress = item.progressPercent
              const imageUrl = item.posterPath?.startsWith('http')
                ? item.posterPath
                : getImageUrl(item.posterPath, 'w500')

              return (
                  <div key={item.id} className="bg-gray-900 rounded-lg overflow-hidden group">
                  <div className="relative aspect-video">
                    <img
                      src={imageUrl}
                      alt={item.title}
                      className="w-full h-full object-cover"
                    />
                    <div className="absolute inset-0 bg-black/50 opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center">
                      <Link
                        href={watchHref(item)}
                        className="w-16 h-16 bg-red-600 rounded-full flex items-center justify-center hover:bg-red-700 transition-colors"
                      >
                        <Play className="w-8 h-8 text-white fill-white ml-1" />
                      </Link>
                    </div>

                    <div className="absolute bottom-0 left-0 right-0 h-1 bg-gray-700">
                      <div
                        className="h-full bg-red-600 transition-all"
                        style={{ width: `${progress}%` }}
                      />
                    </div>
                  </div>

                  <div className="p-4">
                    <div className="flex items-start justify-between mb-2">
                      <div className="flex-1">
                        <h3 className="text-white font-semibold mb-1">{item.title}</h3>
                        {item.isSeries &&
                          item.seasonNumber != null &&
                          item.episodeNumber != null && (
                            <p className="text-gray-400 text-sm">
                              {item.mediaType === 'tv'
                                ? `S${item.seasonNumber} E${item.episodeNumber}`
                                : `Episode ${item.episodeNumber}`}
                            </p>
                          )}
                      </div>
                      <button
                        onClick={() => deleteFromHistory(item.id, item.isSeries)}
                        className="text-gray-400 hover:text-red-500 transition-colors"
                        title="Remove from history"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>

                    <div className="flex items-center justify-between text-sm">
                      {item.isSeries ? (
                        <span className="text-gray-400">
                          {item.totalEpisodes
                            ? `${item.completedEpisodes ?? 0} / ${item.totalEpisodes} episodes`
                            : `${item.completedEpisodes ?? 0} episodes watched`}
                        </span>
                      ) : (
                        <span className="text-gray-400">
                          {formatTime(item.timestamp)} / {formatTime(item.duration)}
                        </span>
                      )}
                      <span className="text-gray-400">{Math.round(progress)}%</span>
                    </div>

                    <Link
                      href={watchHref(item)}
                      className="mt-3 block w-full bg-red-600 text-white text-center py-2 rounded hover:bg-red-700 transition-colors"
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
            <h2 className="text-2xl font-bold text-white mb-6">Completed</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              {completedHistory.map((item) => {
                const imageUrl = item.posterPath?.startsWith('http')
                  ? item.posterPath
                  : getImageUrl(item.posterPath, 'w500')

                return (
                  <div
                    key={item.id}
                    className="bg-gray-900 rounded-lg overflow-hidden opacity-60"
                  >
                    <div className="relative aspect-video">
                      <img
                        src={imageUrl}
                        alt={item.title}
                        className="w-full h-full object-cover"
                      />
                      <div className="absolute top-2 right-2 bg-green-600 text-white px-2 py-1 rounded text-xs">
                        Completed
                      </div>
                    </div>

                    <div className="p-4">
                      <h3 className="text-white font-semibold">{item.title}</h3>
                      {item.isSeries && item.totalEpisodes != null && (
                        <p className="text-gray-400 text-sm">
                          All {item.totalEpisodes} episodes
                        </p>
                      )}
                    </div>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
