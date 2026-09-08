'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { Users, Loader2 } from 'lucide-react'
import toast from 'react-hot-toast'
import { playSound } from '@/lib/sound'

interface StartWatchPartyButtonProps {
  tmdbId: number
  title: string
  mediaType: 'movie' | 'tv' | 'anime'
  seasonNumber?: number
  episodeNumber?: number
  variant?: 'default' | 'icon' | 'outline'
  className?: string
}

export default function StartWatchPartyButton({
  tmdbId,
  title,
  mediaType,
  seasonNumber,
  episodeNumber,
  variant = 'default',
  className = '',
}: StartWatchPartyButtonProps) {
  const router = useRouter()
  const { data: session } = useSession()
  const [loading, setLoading] = useState(false)

  const handleStartWatchParty = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    playSound.click()

    if (!session) {
      toast.error('Please sign in to start a watch party')
      router.push('/auth/signin')
      return
    }

    setLoading(true)
    try {
      const res = await fetch('/api/watch-party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId,
          title,
          mediaType,
          seasonNumber,
          episodeNumber,
        }),
      })

      const data = await res.json()

      if (!res.ok) {
        throw new Error(data.error || 'Failed to create watch party')
      }

      toast.success('Watch party created!')
      router.push(`/watch-party/${data.room.code}`)
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (variant === 'icon') {
    return (
      <button
        type="button"
        onClick={handleStartWatchParty}
        disabled={loading}
        className={`rounded-full border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/15 disabled:opacity-50 ${className}`}
        title="Start Watch Party"
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Users className="h-4 w-4 text-purple-400" />
        )}
      </button>
    )
  }

  if (variant === 'outline') {
    return (
      <button
        type="button"
        onClick={handleStartWatchParty}
        disabled={loading}
        className={`inline-flex items-center gap-2 rounded-lg border border-purple-500/30 bg-purple-500/10 px-4 py-2.5 text-sm font-semibold text-purple-200 backdrop-blur transition hover:bg-purple-500/20 disabled:opacity-50 ${className}`}
      >
        {loading ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <Users className="h-4 w-4 text-purple-400" />
        )}
        Watch Party
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={handleStartWatchParty}
      disabled={loading}
      className={`inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15 disabled:opacity-50 ${className}`}
    >
      {loading ? (
        <Loader2 className="h-4 w-4 animate-spin" />
      ) : (
        <Users className="h-4 w-4 text-purple-400" />
      )}
      Watch Party
    </button>
  )
}
