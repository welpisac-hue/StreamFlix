'use client'

import { useEffect, useState, use } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { ArrowLeft, Film, Trash2, User as UserIcon } from 'lucide-react'
import toast from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import SiteFooter from '@/components/SiteFooter'
import MovieCard from '@/components/MovieCard'
import { playSound } from '@/lib/sound'

type PlaylistItem = {
  id: string
  tmdbId: number
  title: string
  posterPath: string | null
  mediaType: string
}

type PlaylistDetails = {
  id: string
  title: string
  description: string | null
  isPublic: boolean
  createdAt: string
  user: { id: string; username: string }
  items: PlaylistItem[]
}

export default function PlaylistDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [playlist, setPlaylist] = useState<PlaylistDetails | null>(null)
  const [loading, setLoading] = useState(true)

  const fetchPlaylist = async () => {
    try {
      const res = await fetch(`/api/playlists?id=${resolvedParams.id}`)
      if (res.ok) {
        const data = await res.json()
        setPlaylist(data.playlist)
      }
    } catch (err) {
      console.error('Error fetching playlist details:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchPlaylist()
  }, [resolvedParams.id])

  const removeItem = async (itemId: string) => {
    playSound.click()
    try {
      const res = await fetch(`/api/playlists?itemId=${encodeURIComponent(itemId)}`, {
        method: 'DELETE',
      })
      if (!res.ok) throw new Error('Remove failed')
      toast.success('Removed title from playlist')
      await fetchPlaylist()
    } catch {
      toast.error('Failed to remove title')
    }
  }

  const deletePlaylist = async () => {
    if (!playlist) return
    if (!confirm('Delete this entire playlist? This cannot be undone.')) return
    playSound.click()
    try {
      const res = await fetch(`/api/playlists?id=${playlist.id}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Delete failed')
      }
      toast.success('Playlist deleted')
      router.push('/playlists')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    )
  }

  if (!playlist) {
    return (
      <div className="flex min-h-screen flex-col bg-black text-white">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center py-20">
          <Film className="mx-auto mb-3 h-12 w-12 text-zinc-600" />
          <p className="text-lg font-semibold text-white">Playlist not found.</p>
          <Link href="/playlists" className="mt-4 text-xs text-[var(--primary)] hover:underline">
            Back to Playlists
          </Link>
        </div>
        <SiteFooter />
      </div>
    )
  }

  const isOwner = session?.user?.id === playlist.user.id

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <Navbar />

      <main className="page-shell flex-1 pb-16 pt-[calc(var(--nav-height)+2rem)]">
        <Link
          href="/playlists"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          All Playlists
        </Link>

        {/* Playlist Header */}
        <div className="mb-8 rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
          <div className="flex flex-wrap items-center justify-between gap-4">
            <div>
              <span className="rounded bg-red-600/20 px-2.5 py-1 text-xs font-bold uppercase text-red-300">
                Curated Collection ({playlist.items.length} titles)
              </span>
              <h1 className="mt-2 font-display text-4xl tracking-wide text-white">{playlist.title}</h1>
              {playlist.description && (
                <p className="mt-2 text-sm text-zinc-400">{playlist.description}</p>
              )}
            </div>

            <div className="flex items-center gap-3">
              <div className="flex items-center gap-2 text-xs text-zinc-400">
                <UserIcon className="h-4 w-4 text-zinc-500" />
                Curated by <span className="font-semibold text-white">@{playlist.user.username}</span>
              </div>
              {isOwner && (
                <button
                  type="button"
                  onClick={deletePlaylist}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-semibold text-red-400 transition hover:bg-red-500/20 hover:text-red-300"
                >
                  <Trash2 className="h-3.5 w-3.5" />
                  Delete Playlist
                </button>
              )}
            </div>
          </div>
        </div>

        {/* Titles Grid */}
        {playlist.items.length === 0 ? (
          <div className="rounded-xl border border-white/10 bg-zinc-950/40 py-16 text-center text-sm text-zinc-500">
            This playlist has no items yet.
          </div>
        ) : (
          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {playlist.items.map((item) => (
              <div key={item.id} className="group relative">
                <MovieCard
                  id={item.tmdbId}
                  title={item.title}
                  posterPath={item.posterPath}
                  mediaType={item.mediaType as 'movie' | 'tv' | 'anime'}
                />
                {isOwner && (
                  <button
                    type="button"
                    onClick={() => removeItem(item.id)}
                    className="absolute right-2 top-2 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-red-600 opacity-0 transition hover:bg-red-700 group-hover:opacity-100"
                    title="Remove from playlist"
                  >
                    <Trash2 className="h-4 w-4 text-white" />
                  </button>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
