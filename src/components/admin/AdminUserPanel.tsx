'use client'

import { useEffect, useState } from 'react'
import {
  Ban,
  Clock,
  Film,
  Heart,
  Loader2,
  MessageSquare,
  Trash2,
  X,
} from 'lucide-react'
import toast from 'react-hot-toast'
import { getImageUrl } from '@/lib/tmdb/images'

type UserDetail = {
  id: string
  username: string
  name: string | null
  role: string
  image: string | null
  bannedAt: string | null
  banReason: string | null
  lastLoginAt: string | null
  lastLogoutAt: string | null
  adminMessage: string | null
  adminMessageAt: string | null
  createdAt: string
  inviteRedemption: {
    redeemedAt: string
    inviteCode: { code: string; kind: string }
  } | null
}

type WatchItem = {
  id: string
  tmdbId: number
  title: string
  posterPath: string | null
  mediaType: string
  lastWatched?: string
  addedAt?: string
  seasonNumber?: number | null
  episodeNumber?: number | null
}

export default function AdminUserPanel({
  userId,
  onClose,
  onChanged,
}: {
  userId: string
  onClose: () => void
  onChanged: () => void
}) {
  const [loading, setLoading] = useState(true)
  const [user, setUser] = useState<UserDetail | null>(null)
  const [recentWatches, setRecentWatches] = useState<WatchItem[]>([])
  const [watchLater, setWatchLater] = useState<WatchItem[]>([])
  const [message, setMessage] = useState('')
  const [banReason, setBanReason] = useState('')
  const [busy, setBusy] = useState(false)

  const load = async () => {
    setLoading(true)
    try {
      const res = await fetch(`/api/admin/users/${userId}`)
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to load user')
      setUser(data.user)
      setRecentWatches(data.recentWatches || [])
      setWatchLater(data.watchLater || [])
      setMessage(data.user.adminMessage || '')
      setBanReason(data.user.banReason || '')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to load user')
      onClose()
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    void load()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [userId])

  const action = async (
    payload: Record<string, unknown>,
    success: string
  ) => {
    setBusy(true)
    try {
      const res = await fetch('/api/admin/users', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: userId, ...payload }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Action failed')
      toast.success(success)
      await load()
      onChanged()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Action failed')
    } finally {
      setBusy(false)
    }
  }

  const deleteUser = async () => {
    if (!user) return
    if (
      !confirm(
        `Permanently delete @${user.username}? This cannot be undone.`
      )
    ) {
      return
    }
    setBusy(true)
    try {
      const res = await fetch(
        `/api/admin/users?id=${encodeURIComponent(userId)}`,
        { method: 'DELETE' }
      )
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Delete failed')
      toast.success('Account deleted')
      onChanged()
      onClose()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    } finally {
      setBusy(false)
    }
  }

  return (
    <div className="fixed inset-0 z-[120] flex justify-end bg-black/60 backdrop-blur-sm">
      <button
        type="button"
        className="absolute inset-0 cursor-default"
        aria-label="Close panel"
        onClick={onClose}
      />
      <aside className="relative z-10 flex h-full w-full max-w-lg flex-col border-l border-white/10 bg-zinc-950 shadow-2xl">
        <div className="flex items-center justify-between border-b border-white/10 px-5 py-4">
          <h2 className="font-display text-2xl tracking-wide">User detail</h2>
          <button
            type="button"
            onClick={onClose}
            className="rounded-lg p-2 text-zinc-400 hover:bg-white/5 hover:text-white"
          >
            <X className="h-5 w-5" />
          </button>
        </div>

        {loading || !user ? (
          <div className="flex flex-1 items-center justify-center text-zinc-500">
            <Loader2 className="mr-2 h-5 w-5 animate-spin" />
            Loading…
          </div>
        ) : (
          <div className="flex-1 space-y-6 overflow-y-auto px-5 py-5">
            <div className="flex items-center gap-4">
              {user.image ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img
                  src={user.image}
                  alt=""
                  className="h-16 w-16 rounded-full object-cover object-top ring-2 ring-white/20"
                />
              ) : (
                <div className="flex h-16 w-16 items-center justify-center rounded-full bg-white/10 text-xl font-semibold">
                  {user.username.slice(0, 1).toUpperCase()}
                </div>
              )}
              <div>
                <p className="text-lg font-semibold">@{user.username}</p>
                {user.name && (
                  <p className="text-sm text-zinc-400">{user.name}</p>
                )}
                <p className="mt-1 text-xs uppercase tracking-wide text-zinc-500">
                  {user.role}
                  {user.bannedAt && (
                    <span className="ml-2 text-red-400">Banned</span>
                  )}
                </p>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <p className="flex items-center gap-1.5 text-xs uppercase text-zinc-500">
                  <Clock className="h-3.5 w-3.5" /> Last login
                </p>
                <p className="mt-1 text-zinc-200">
                  {user.lastLoginAt
                    ? new Date(user.lastLoginAt).toLocaleString()
                    : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <p className="flex items-center gap-1.5 text-xs uppercase text-zinc-500">
                  <Clock className="h-3.5 w-3.5" /> Last logout
                </p>
                <p className="mt-1 text-zinc-200">
                  {user.lastLogoutAt
                    ? new Date(user.lastLogoutAt).toLocaleString()
                    : '—'}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <p className="text-xs uppercase text-zinc-500">Joined</p>
                <p className="mt-1 text-zinc-200">
                  {new Date(user.createdAt).toLocaleString()}
                </p>
              </div>
              <div className="rounded-xl border border-white/10 bg-black/40 p-3">
                <p className="text-xs uppercase text-zinc-500">Invite</p>
                <p className="mt-1 font-mono text-xs text-zinc-200">
                  {user.inviteRedemption
                    ? `${user.inviteRedemption.inviteCode.code} (${user.inviteRedemption.inviteCode.kind})`
                    : '—'}
                </p>
              </div>
            </div>

            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Film className="h-4 w-4 text-red-400" />
                Recent titles
              </h3>
              {recentWatches.length === 0 ? (
                <p className="text-sm text-zinc-500">No watch history.</p>
              ) : (
                <ul className="max-h-48 space-y-2 overflow-y-auto">
                  {recentWatches.map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center gap-3 rounded-lg bg-white/5 px-2 py-1.5 text-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getImageUrl(w.posterPath, 'w92')}
                        alt=""
                        className="h-12 w-8 rounded object-cover bg-zinc-800"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{w.title}</p>
                        <p className="text-xs text-zinc-500">
                          {w.mediaType}
                          {w.seasonNumber != null &&
                            ` · S${w.seasonNumber}E${w.episodeNumber ?? '?'}`}
                          {w.lastWatched &&
                            ` · ${new Date(w.lastWatched).toLocaleString()}`}
                        </p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section>
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <Heart className="h-4 w-4 text-pink-400" />
                My List
              </h3>
              {watchLater.length === 0 ? (
                <p className="text-sm text-zinc-500">List is empty.</p>
              ) : (
                <ul className="max-h-40 space-y-2 overflow-y-auto">
                  {watchLater.map((w) => (
                    <li
                      key={w.id}
                      className="flex items-center gap-3 rounded-lg bg-white/5 px-2 py-1.5 text-sm"
                    >
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={getImageUrl(w.posterPath, 'w92')}
                        alt=""
                        className="h-12 w-8 rounded object-cover bg-zinc-800"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate font-medium">{w.title}</p>
                        <p className="text-xs text-zinc-500">{w.mediaType}</p>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-xl border border-white/10 bg-black/30 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold">
                <MessageSquare className="h-4 w-4 text-amber-400" />
                Dismissible login message
              </h3>
              <textarea
                value={message}
                onChange={(e) => setMessage(e.target.value)}
                rows={3}
                maxLength={2000}
                placeholder="Shown on their next visit until they dismiss it"
                className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500/50"
              />
              <div className="mt-2 flex flex-wrap gap-2">
                <button
                  type="button"
                  disabled={busy || !message.trim()}
                  onClick={() =>
                    void action(
                      { action: 'message', adminMessage: message },
                      'Message queued'
                    )
                  }
                  className="rounded-lg bg-amber-500 px-3 py-1.5 text-sm font-semibold text-black disabled:opacity-40"
                >
                  Send message
                </button>
                {user.adminMessage && (
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() =>
                      void action(
                        { action: 'clearMessage' },
                        'Message cleared'
                      )
                    }
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-sm text-zinc-200"
                  >
                    Clear
                  </button>
                )}
              </div>
            </section>

            <section className="rounded-xl border border-red-500/20 bg-red-950/20 p-4">
              <h3 className="mb-2 flex items-center gap-2 text-sm font-semibold text-red-300">
                <Ban className="h-4 w-4" />
                Ban / delete
              </h3>
              {!user.bannedAt ? (
                <>
                  <input
                    value={banReason}
                    onChange={(e) => setBanReason(e.target.value)}
                    placeholder="Ban reason"
                    className="mb-2 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm outline-none"
                  />
                  <button
                    type="button"
                    disabled={busy || user.role === 'ADMIN'}
                    onClick={() =>
                      void action(
                        { action: 'ban', banReason },
                        'User banned'
                      )
                    }
                    className="rounded-lg bg-red-600 px-3 py-1.5 text-sm font-semibold text-white disabled:opacity-40"
                  >
                    Ban user
                  </button>
                </>
              ) : (
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => void action({ action: 'unban' }, 'User unbanned')}
                  className="rounded-lg bg-emerald-600 px-3 py-1.5 text-sm font-semibold text-white"
                >
                  Unban user
                </button>
              )}
              <button
                type="button"
                disabled={busy || user.role === 'ADMIN'}
                onClick={() => void deleteUser()}
                className="ml-2 inline-flex items-center gap-1.5 rounded-lg border border-red-500/40 px-3 py-1.5 text-sm text-red-300 disabled:opacity-40"
              >
                <Trash2 className="h-3.5 w-3.5" />
                Delete account
              </button>
            </section>
          </div>
        )}
      </aside>
    </div>
  )
}
