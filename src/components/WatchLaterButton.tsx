'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { Heart } from 'lucide-react'
import toast from 'react-hot-toast'

interface WatchLaterButtonProps {
  tmdbId: number
  title: string
  posterPath: string | null
  mediaType: 'movie' | 'tv' | 'anime'
}

export default function WatchLaterButton({ tmdbId, title, posterPath, mediaType }: WatchLaterButtonProps) {
  const { data: session } = useSession()
  const [isInWatchLater, setIsInWatchLater] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (session) {
      checkWatchLater()
    }
  }, [session, tmdbId])

  const checkWatchLater = async () => {
    try {
      const response = await fetch('/api/watch-later')
      if (response.ok) {
        const data = await response.json()
        setIsInWatchLater(
          data.some(
            (item: { tmdbId: number; mediaType: string }) =>
              item.tmdbId === tmdbId && item.mediaType === mediaType
          )
        )
      }
    } catch (error) {
      console.error('Error checking watch later:', error)
    }
  }

  const toggleWatchLater = async () => {
    if (!session) {
      toast.error('Please sign in to use this feature')
      return
    }

    setLoading(true)
    try {
      const response = await fetch('/api/watch-later', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId,
          title,
          posterPath,
          mediaType
        })
      })

      if (response.ok) {
        const data = await response.json()
        const removed = Boolean(data.removed)
        setIsInWatchLater(!removed)
        toast.success(removed ? 'Removed from My List' : 'Added to My List')
      }
    } catch (error) {
      toast.error('Failed to update My List')
    } finally {
      setLoading(false)
    }
  }

  return (
    <button
      onClick={toggleWatchLater}
      disabled={loading}
      className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors ${
        isInWatchLater
          ? 'bg-red-600 text-white hover:bg-red-700'
          : 'bg-gray-700 text-white hover:bg-gray-600'
      } disabled:opacity-50 disabled:cursor-not-allowed`}
    >
      <Heart className={`w-5 h-5 ${isInWatchLater ? 'fill-white' : ''}`} />
      {isInWatchLater ? 'In My List' : 'Add to List'}
    </button>
  )
}