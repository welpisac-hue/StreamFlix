'use client'

import { useState } from 'react'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import { ListPlus, Check, Plus, Loader2, X, Lock } from 'lucide-react'
import toast from 'react-hot-toast'
import { playSound } from '@/lib/sound'

interface AddToPlaylistButtonProps {
  tmdbId: number
  title: string
  posterPath: string | null
  mediaType: 'movie' | 'tv' | 'anime'
  variant?: 'default' | 'icon' | 'outline'
  className?: string
}

interface Playlist {
  id: string
  title: string
  isPublic: boolean
  _count?: { items: number }
  items?: { tmdbId: number; mediaType: string }[]
}

export default function AddToPlaylistButton({
  tmdbId,
  title,
  posterPath,
  mediaType,
  variant = 'default',
  className = '',
}: AddToPlaylistButtonProps) {
  const { data: session } = useSession()
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [playlists, setPlaylists] = useState<Playlist[]>([])
  const [loading, setLoading] = useState(false)
  const [addingTo, setAddingTo] = useState<string | null>(null)
  const [addedIds, setAddedIds] = useState<Set<string>>(new Set())
  const [newTitle, setNewTitle] = useState('')
  const [creating, setCreating] = useState(false)
  const [showCreateForm, setShowCreateForm] = useState(false)

  const handleOpen = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    playSound.click()

    if (!session?.user?.id) {
      toast.error('Please sign in to add to playlists')
      router.push('/auth/signin')
      return
    }

    setOpen(true)
    setLoading(true)
    try {
      const res = await fetch(`/api/playlists?userId=${session.user.id}`)
      if (res.ok) {
        const data = await res.json()
        const userPlaylists: Playlist[] = data.playlists || []
        setPlaylists(userPlaylists)

        // Check existing items
        const inSets = new Set<string>()
        for (const pl of userPlaylists) {
          // Fetch detailed playlist items if needed
          const detailRes = await fetch(`/api/playlists?id=${pl.id}`)
          if (detailRes.ok) {
            const detailData = await detailRes.json()
            const items = detailData.playlist?.items || []
            if (items.some((i: any) => i.tmdbId === tmdbId && i.mediaType === mediaType)) {
              inSets.add(pl.id)
            }
          }
        }
        setAddedIds(inSets)
      }
    } catch {
      toast.error('Failed to load playlists')
    } finally {
      setLoading(false)
    }
  }

  const handleAddToPlaylist = async (playlistId: string) => {
    playSound.click()
    setAddingTo(playlistId)
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'addItem',
          playlistId,
          tmdbId,
          itemTitle: title,
          posterPath,
          mediaType,
        }),
      })

      if (res.ok) {
        toast.success('Added to playlist!')
        setAddedIds((prev) => new Set(prev).add(playlistId))
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to add item')
      }
    } catch {
      toast.error('Something went wrong')
    } finally {
      setAddingTo(null)
    }
  }

  const handleCreatePlaylist = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!newTitle.trim()) return

    playSound.click()
    setCreating(true)
    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: newTitle.trim(),
          isPublic: true,
        }),
      })

      if (res.ok) {
        const data = await res.json()
        const newPl = data.playlist
        setPlaylists((prev) => [newPl, ...prev])
        setNewTitle('')
        setShowCreateForm(false)
        toast.success('Playlist created!')
        // Automatically add current item to newly created playlist
        await handleAddToPlaylist(newPl.id)
      } else {
        const err = await res.json()
        toast.error(err.error || 'Failed to create playlist')
      }
    } catch {
      toast.error('Failed to create playlist')
    } finally {
      setCreating(false)
    }
  }

  return (
    <>
      {variant === 'icon' ? (
        <button
          type="button"
          onClick={handleOpen}
          className={`rounded-full border border-white/10 bg-white/5 p-2 text-white transition hover:bg-white/15 ${className}`}
          title="Add to Playlist"
        >
          <ListPlus className="h-4 w-4 text-cyan-400" />
        </button>
      ) : variant === 'outline' ? (
        <button
          type="button"
          onClick={handleOpen}
          className={`inline-flex items-center gap-2 rounded-lg border border-cyan-500/30 bg-cyan-500/10 px-4 py-2.5 text-sm font-semibold text-cyan-200 backdrop-blur transition hover:bg-cyan-500/20 ${className}`}
        >
          <ListPlus className="h-4 w-4 text-cyan-400" />
          Add to Playlist
        </button>
      ) : (
        <button
          type="button"
          onClick={handleOpen}
          className={`inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white backdrop-blur transition hover:bg-white/15 ${className}`}
        >
          <ListPlus className="h-4 w-4 text-cyan-400" />
          Add to Playlist
        </button>
      )}

      {open && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/80 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-md overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-full bg-white/5 p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="flex items-center gap-2.5">
              <ListPlus className="h-5 w-5 text-cyan-400" />
              <h3 className="font-display text-xl text-white">Save to Playlist</h3>
            </div>
            <p className="mt-1 line-clamp-1 text-xs text-zinc-400">
              Adding &quot;{title}&quot;
            </p>

            <div className="mt-5 space-y-3">
              {loading ? (
                <div className="flex justify-center py-6">
                  <Loader2 className="h-6 w-6 animate-spin text-cyan-400" />
                </div>
              ) : (
                <>
                  <div className="max-h-60 space-y-2 overflow-y-auto pr-1">
                    {playlists.length === 0 ? (
                      <p className="text-center text-xs text-zinc-500 py-4">
                        No playlists found. Create one below!
                      </p>
                    ) : (
                      playlists.map((pl) => {
                        const isAdded = addedIds.has(pl.id)
                        const isBusy = addingTo === pl.id

                        return (
                          <div
                            key={pl.id}
                            className="flex items-center justify-between gap-3 rounded-xl border border-white/5 bg-white/5 px-4 py-3 text-sm"
                          >
                            <div className="min-w-0">
                              <p className="truncate font-semibold text-white">{pl.title}</p>
                              <p className="text-xs text-zinc-400">
                                {pl.isPublic ? 'Public' : 'Private'}
                              </p>
                            </div>

                            <button
                              type="button"
                              onClick={() => !isAdded && handleAddToPlaylist(pl.id)}
                              disabled={isAdded || isBusy}
                              className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                                isAdded
                                  ? 'bg-emerald-500/20 text-emerald-300'
                                  : 'bg-cyan-500/20 text-cyan-200 hover:bg-cyan-500/30'
                              } disabled:opacity-80`}
                            >
                              {isBusy ? (
                                <Loader2 className="h-3.5 w-3.5 animate-spin" />
                              ) : isAdded ? (
                                <>
                                  <Check className="h-3.5 w-3.5 text-emerald-400" />
                                  Added
                                </>
                              ) : (
                                <>
                                  <Plus className="h-3.5 w-3.5" />
                                  Add
                                </>
                              )}
                            </button>
                          </div>
                        )
                      })
                    )}
                  </div>

                  {showCreateForm ? (
                    <form onSubmit={handleCreatePlaylist} className="pt-2">
                      <div className="flex gap-2">
                        <input
                          type="text"
                          placeholder="New playlist title..."
                          value={newTitle}
                          onChange={(e) => setNewTitle(e.target.value)}
                          className="flex-1 rounded-xl border border-white/10 bg-white/5 px-3 py-2 text-xs text-white placeholder-zinc-500 outline-none focus:border-cyan-400"
                          autoFocus
                        />
                        <button
                          type="submit"
                          disabled={creating || !newTitle.trim()}
                          className="rounded-xl bg-cyan-500 px-4 py-2 text-xs font-bold text-black hover:bg-cyan-400 disabled:opacity-50"
                        >
                          {creating ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : 'Create'}
                        </button>
                      </div>
                    </form>
                  ) : (
                    <button
                      type="button"
                      onClick={() => setShowCreateForm(true)}
                      className="inline-flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-white/20 py-2.5 text-xs font-semibold text-zinc-300 hover:border-cyan-400 hover:text-cyan-300 transition"
                    >
                      <Plus className="h-4 w-4" />
                      Create New Playlist
                    </button>
                  )}
                </>
              )}
            </div>
          </div>
        </div>
      )}
    </>
  )
}
