'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Heart, Trash2 } from 'lucide-react'
import Navbar from '@/components/Navbar'
import MovieCard from '@/components/MovieCard'
import toast from 'react-hot-toast'

interface WatchLaterItem {
  id: string
  tmdbId: number
  title: string
  posterPath: string
  mediaType: string
  addedAt: string
}

export default function MyListPage() {
  const { data: session } = useSession()
  const [watchLater, setWatchLater] = useState<WatchLaterItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (session) {
      fetchWatchLater()
    }
  }, [session])

  const fetchWatchLater = async () => {
    try {
      const response = await fetch('/api/watch-later?mediaType=movies')
      if (response.ok) {
        const data = await response.json()
        setWatchLater(data)
      }
    } catch (error) {
      console.error('Error fetching watch later:', error)
    } finally {
      setLoading(false)
    }
  }

  const removeFromWatchLater = async (tmdbId: number) => {
    try {
      const response = await fetch('/api/watch-later', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId,
          title: watchLater.find(item => item.tmdbId === tmdbId)?.title,
          posterPath: watchLater.find(item => item.tmdbId === tmdbId)?.posterPath,
          mediaType: watchLater.find(item => item.tmdbId === tmdbId)?.mediaType
        })
      })

      if (response.ok) {
        toast.success('Removed from My List')
        fetchWatchLater()
      }
    } catch (error) {
      toast.error('Failed to remove from My List')
    }
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-24 px-8 md:px-16 max-w-7xl mx-auto text-center">
          <Heart className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">Sign in to view your list</h1>
          <p className="text-gray-400 mb-8">Create an account to save movies and shows to your watch list.</p>
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
          <Heart className="w-8 h-8 text-red-500 fill-red-500" />
          <h1 className="text-4xl font-bold text-white">My List</h1>
        </div>

        {watchLater.length === 0 ? (
          <div className="text-center py-16">
            <Heart className="w-24 h-24 text-gray-600 mx-auto mb-4" />
            <h2 className="text-2xl font-bold text-white mb-2">Your list is empty</h2>
            <p className="text-gray-400 mb-8">
              Start adding movies and shows to your list to keep track of what you want to watch.
            </p>
            <a
              href="/"
              className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
            >
              Browse Content
            </a>
          </div>
        ) : (
          <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-5 gap-6">
            {watchLater.map((item, index) => (
              <div key={item.id} className="relative group">
                <MovieCard
                  id={item.tmdbId}
                  title={item.title}
                  posterPath={item.posterPath}
                  mediaType={item.mediaType as 'movie' | 'tv' | 'anime'}
                  index={index}
                />
                <button
                  onClick={() => removeFromWatchLater(item.tmdbId)}
                  className="absolute top-2 right-2 w-8 h-8 bg-red-600 rounded-full flex items-center justify-center opacity-0 group-hover:opacity-100 transition-opacity hover:bg-red-700"
                  title="Remove from list"
                >
                  <Trash2 className="w-4 h-4 text-white" />
                </button>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  )
}