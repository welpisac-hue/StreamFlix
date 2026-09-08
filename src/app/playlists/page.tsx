'use client'

import { useEffect, useState } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { Film, ListPlus, Plus, Trash2 } from 'lucide-react'
import toast from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import SiteFooter from '@/components/SiteFooter'
import { playSound } from '@/lib/sound'

type PlaylistCard = {
  id: string
  title: string
  description: string | null
  createdAt: string
  user: { username: string }
  _count: { items: number }
}

export default function PlaylistsPage() {
  const { data: session } = useSession()
  const [playlists, setPlaylists] = useState<PlaylistCard[]>([])
  const [loading, setLoading] = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const [newTitle, setNewTitle] = useState('')
  const [newDesc, setNewDesc] = useState('')
  const [creating, setCreating] = useState(false)

  const fetchPlaylists = async () => {
    try {
      const res = await fetch('/api/playlists')
      if (res.ok) {
        const data = await res.json()
        setPlaylists(data.playlists || [])
      }
    } catch (err) {
      console.error('Error fetching playlists:', err)
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void fetchPlaylists()
  }, [])

  const handleCreate = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!session) {
      toast.error('Please sign in to create playlists')
      return
    }
    playSound.click()
    setCreating(true)

    try {
      const res = await fetch('/api/playlists', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          action: 'create',
          title: newTitle,
          description: newDesc,
          isPublic: true,
        }),
      })

      if (!res.ok) throw new Error('Failed to create playlist')
      toast.success('Playlist created!')
      setNewTitle('')
      setNewDesc('')
      setShowCreate(false)
      await fetchPlaylists()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed')
    } finally {
      setCreating(false)
    }
  }

  const handleDelete = async (e: React.MouseEvent, playlistId: string) => {
    e.preventDefault()
    e.stopPropagation()
    if (!confirm('Delete this playlist? This cannot be undone.')) return
    playSound.click()
    try {
      const res = await fetch(`/api/playlists?id=${playlistId}`, { method: 'DELETE' })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Delete failed')
      }
      toast.success('Playlist deleted')
      setPlaylists((prev) => prev.filter((p) => p.id !== playlistId))
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <Navbar />

      <main className="page-shell flex-1 pb-16 pt-[calc(var(--nav-height)+2rem)]">
        <div className="mb-8 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <ListPlus className="h-8 w-8 text-red-500" />
            <div>
              <h1 className="font-display text-4xl tracking-wide text-white">Community Playlists</h1>
              <p className="text-xs text-zinc-400">Discover and share curated collections of movies, TV shows, and anime.</p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => {
              playSound.hover()
              setShowCreate((prev) => !prev)
            }}
            className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white hover:brightness-110"
          >
            <Plus className="h-4 w-4" />
            Create Playlist
          </button>
        </div>

        {/* Create Playlist Form Modal */}
        {showCreate && (
          <form
            onSubmit={handleCreate}
            className="mb-8 rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl space-y-4"
          >
            <h2 className="font-semibold text-white">Create New Collection</h2>
            <input
              value={newTitle}
              onChange={(e) => setNewTitle(e.target.value)}
              placeholder="Playlist title (e.g. Best 90s Cyberpunk Sci-Fi)"
              required
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-[var(--primary)]"
            />
            <textarea
              value={newDesc}
              onChange={(e) => setNewDesc(e.target.value)}
              rows={2}
              placeholder="Description (optional)"
              className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-[var(--primary)]"
            />
            <div className="flex justify-end gap-2 pt-2">
              <button
                type="button"
                onClick={() => setShowCreate(false)}
                className="rounded-lg px-4 py-2 text-xs text-zinc-400 hover:text-white"
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={creating}
                className="rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create'}
              </button>
            </div>
          </form>
        )}

        {/* Playlists Grid */}
        {loading ? (
          <div className="flex justify-center py-16">
            <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
          </div>
        ) : playlists.length === 0 ? (
          <div className="rounded-2xl border border-white/10 bg-zinc-950 py-16 text-center">
            <Film className="mx-auto mb-3 h-12 w-12 text-zinc-600" />
            <p className="font-semibold text-white">No public playlists yet.</p>
            <p className="text-xs text-zinc-400">Be the first to create and share a collection!</p>
          </div>
        ) : (
          <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4">
            {playlists.map((pl) => {
              const isOwner = session?.user?.username === pl.user.username
              return (
                <Link
                  key={pl.id}
                  href={`/playlist/${pl.id}`}
                  className="group relative flex flex-col justify-between rounded-xl border border-white/10 bg-zinc-950 p-5 transition hover:border-[var(--primary)]/50 hover:bg-zinc-900/80"
                >
                  {/* Delete button — only for the owner */}
                  {isOwner && (
                    <button
                      type="button"
                      onClick={(e) => handleDelete(e, pl.id)}
                      title="Delete playlist"
                      className="absolute right-3 top-3 rounded-lg p-1.5 text-zinc-600 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/20 hover:text-red-400"
                    >
                      <Trash2 className="h-3.5 w-3.5" />
                    </button>
                  )}

                  <div>
                    <div className="mb-2 flex items-center justify-between">
                      <span className="rounded bg-red-600/20 px-2 py-0.5 text-[10px] uppercase font-bold text-red-300">
                        {pl._count.items} titles
                      </span>
                      <span className="text-[11px] text-zinc-500">
                        @{pl.user.username}
                      </span>
                    </div>
                    <h3 className="font-display text-xl tracking-wide text-white group-hover:text-red-400 transition">
                      {pl.title}
                    </h3>
                    {pl.description && (
                      <p className="mt-2 text-xs text-zinc-400 line-clamp-2">{pl.description}</p>
                    )}
                  </div>

                  <div className="mt-4 border-t border-white/5 pt-3 text-[11px] text-zinc-500">
                    Created {new Date(pl.createdAt).toLocaleDateString()}
                  </div>
                </Link>
              )
            })}
          </div>
        )}
      </main>

      <SiteFooter />
    </div>
  )
}
