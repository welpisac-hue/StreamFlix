'use client'

import { useCallback, useEffect, useState } from 'react'
import Link from 'next/link'
import { useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft,
  BarChart3,
  KeyRound,
  Loader2,
  Plus,
  Settings,
  Shield,
  Star,
  Trash2,
  Users,
  Eye,
  Film,
  ToggleLeft,
  ToggleRight,
  UserPlus,
} from 'lucide-react'
import toast from 'react-hot-toast'
import AdminUserPanel from '@/components/admin/AdminUserPanel'
import AdminSettingsTab from '@/components/admin/AdminSettingsTab'

type Overview = {
  totalUsers: number
  adminUsers: number
  totalPageViews: number
  pageViewsToday: number
  pageViewsWeek: number
  uniqueVisitorsWeek: number
  totalWatchEvents: number
  completedWatches: number
  totalWatchLater: number
  totalReviews: number
  averageRating: number | null
  activeInvites: number
  inviteRedemptions: number
}

type AnalyticsPayload = {
  overview: Overview
  recentUsers: Array<{
    id: string
    username: string
    name: string | null
    role: string
    createdAt: string
  }>
  topRated: Array<{
    tmdbId: number
    title: string
    averageRating: number
    reviewCount: number
  }>
  mostWatched: Array<{
    tmdbId: number
    title: string
    mediaType: string
    watches: number
  }>
  topPages: Array<{ path: string; views: number }>
  signupsLast30Days: Array<{ date: string; count: number }>
}

type UserRow = {
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
  createdAt: string
  _count: {
    watchHistory: number
    watchLater: number
    reviews: number
    pageViews: number
  }
  inviteRedemption: {
    redeemedAt: string
    inviteCode: { code: string }
  } | null
}

type InviteRow = {
  id: string
  code: string
  kind?: 'ADMIN' | 'FRIEND'
  maxUses: number
  usedCount: number
  isActive: boolean
  grantsAdmin: boolean
  note: string | null
  expiresAt: string | null
  createdAt: string
  createdBy: { id: string; username: string } | null
  _count: { redemptions: number }
  redemptions: Array<{
    user: { id: string; username: string }
    redeemedAt: string
  }>
}

type FriendAudit = {
  summary: {
    totalFriendInvites: number
    redeemedFriendInvites: number
    pendingFriendInvites: number
    usersWhoInvited: number
  }
  invites: Array<{
    id: string
    code: string
    createdAt: string
    isActive: boolean
    usedCount: number
    maxUses: number
    createdBy: { id: string; username: string; role: string } | null
    redeemedBy: Array<{
      id: string
      username: string
      redeemedAt: string
    }>
  }>
  userStats: Array<{
    id: string
    username: string
    role: string
    createdAt: string
    friendInvitesCreated: number
    friendsInvited: number
    pendingInvites: number
    currentCooldown: string
    nextAvailableAt: string | null
  }>
}

type Tab = 'overview' | 'users' | 'invites' | 'friends' | 'settings'

function StatCard({
  label,
  value,
  hint,
}: {
  label: string
  value: string | number
  hint?: string
}) {
  return (
    <div className="rounded-xl border border-white/10 bg-zinc-950/80 p-4">
      <p className="text-xs uppercase tracking-wide text-zinc-500">{label}</p>
      <p className="mt-2 font-display text-3xl text-white">{value}</p>
      {hint && <p className="mt-1 text-xs text-zinc-500">{hint}</p>}
    </div>
  )
}

export default function AdminDashboardPage() {
  const { data: session, status } = useSession()
  const router = useRouter()
  const [tab, setTab] = useState<Tab>('overview')
  const [loading, setLoading] = useState(true)
  const [analytics, setAnalytics] = useState<AnalyticsPayload | null>(null)
  const [users, setUsers] = useState<UserRow[]>([])
  const [invites, setInvites] = useState<InviteRow[]>([])
  const [friendAudit, setFriendAudit] = useState<FriendAudit | null>(null)
  const [newCode, setNewCode] = useState('')
  const [newMaxUses, setNewMaxUses] = useState(1)
  const [newNote, setNewNote] = useState('')
  const [creating, setCreating] = useState(false)
  const [selectedUserId, setSelectedUserId] = useState<string | null>(null)

  const loadAll = useCallback(async () => {
    setLoading(true)
    try {
      const [aRes, uRes, iRes, fRes] = await Promise.all([
        fetch('/api/admin/analytics'),
        fetch('/api/admin/users'),
        fetch('/api/admin/invites'),
        fetch('/api/admin/friend-invites'),
      ])

      if (
        aRes.status === 403 ||
        uRes.status === 403 ||
        iRes.status === 403 ||
        fRes.status === 403
      ) {
        toast.error('Admin access required')
        router.replace('/')
        return
      }

      if (!aRes.ok || !uRes.ok || !iRes.ok || !fRes.ok) {
        throw new Error('Failed to load dashboard data')
      }

      const [aData, uData, iData, fData] = await Promise.all([
        aRes.json(),
        uRes.json(),
        iRes.json(),
        fRes.json(),
      ])
      setAnalytics(aData)
      setUsers(uData.users || [])
      setInvites(iData.invites || [])
      setFriendAudit(fData)
    } catch (error) {
      console.error(error)
      toast.error('Could not load admin dashboard')
    } finally {
      setLoading(false)
    }
  }, [router])

  useEffect(() => {
    if (status === 'loading') return
    if (!session || session.user.role !== 'ADMIN') {
      router.replace('/')
      return
    }
    void loadAll()
  }, [status, session, router, loadAll])

  const createInvite = async (e: React.FormEvent) => {
    e.preventDefault()
    setCreating(true)
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: newCode,
          maxUses: newMaxUses,
          note: newNote || undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create invite')
      toast.success(`Invite ${data.invite.code} created`)
      setNewCode('')
      setNewMaxUses(1)
      setNewNote('')
      await loadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Failed to create invite')
    } finally {
      setCreating(false)
    }
  }

  const toggleInvite = async (invite: InviteRow) => {
    try {
      const res = await fetch('/api/admin/invites', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id: invite.id, isActive: !invite.isActive }),
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Update failed')
      }
      toast.success(invite.isActive ? 'Invite disabled' : 'Invite enabled')
      await loadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    }
  }

  const deleteInvite = async (id: string, code: string) => {
    if (!confirm(`Delete invite code ${code}?`)) return
    try {
      const res = await fetch(`/api/admin/invites?id=${encodeURIComponent(id)}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Delete failed')
      }
      toast.success('Invite deleted')
      await loadAll()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Delete failed')
    }
  }

  if (status === 'loading' || loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading admin…
      </div>
    )
  }

  if (!session || session.user.role !== 'ADMIN') {
    return null
  }

  const o = analytics?.overview

  return (
    <div className="min-h-screen bg-black text-white">
      <div className="border-b border-white/10 bg-zinc-950/90">
        <div className="mx-auto flex max-w-7xl items-center justify-between gap-4 px-4 py-4 sm:px-6">
          <div className="flex items-center gap-3">
            <Link
              href="/"
              className="inline-flex items-center gap-1.5 text-sm text-zinc-400 hover:text-white"
            >
              <ArrowLeft className="h-4 w-4" />
              Site
            </Link>
            <div className="h-5 w-px bg-white/10" />
            <div className="flex items-center gap-2">
              <Shield className="h-5 w-5 text-[var(--primary)]" />
              <h1 className="font-display text-2xl tracking-wide">
                Admin Dashboard
              </h1>
            </div>
          </div>
          <p className="hidden text-sm text-zinc-500 sm:block">
            Signed in as @{session.user.username}
          </p>
        </div>
      </div>

      <div className="mx-auto max-w-7xl px-4 py-8 sm:px-6">
        <div className="mb-8 flex flex-wrap gap-2">
          {(
            [
              ['overview', 'Overview', BarChart3],
              ['users', 'Users', Users],
              ['invites', 'Invite codes', KeyRound],
              ['friends', 'Friend invites', UserPlus],
              ['settings', 'Site settings', Settings],
            ] as const
          ).map(([id, label, Icon]) => (
            <button
              key={id}
              type="button"
              onClick={() => setTab(id)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm font-semibold transition ${
                tab === id
                  ? 'bg-[var(--primary)] text-white'
                  : 'bg-white/5 text-zinc-300 hover:bg-white/10'
              }`}
            >
              <Icon className="h-4 w-4" />
              {label}
            </button>
          ))}
        </div>

        {tab === 'overview' && o && (
          <div className="space-y-8">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard label="Registered users" value={o.totalUsers} />
              <StatCard
                label="Unique visitors (7d)"
                value={o.uniqueVisitorsWeek}
                hint={`${o.pageViewsWeek} page views this week`}
              />
              <StatCard
                label="Page views today"
                value={o.pageViewsToday}
                hint={`${o.totalPageViews} all time`}
              />
              <StatCard
                label="Avg rating"
                value={o.averageRating ?? '—'}
                hint={`${o.totalReviews} reviews`}
              />
              <StatCard
                label="Watch events"
                value={o.totalWatchEvents}
                hint={`${o.completedWatches} completed`}
              />
              <StatCard label="Watch later saves" value={o.totalWatchLater} />
              <StatCard label="Active invites" value={o.activeInvites} />
              <StatCard
                label="Invite redemptions"
                value={o.inviteRedemptions}
              />
            </div>

            <div className="grid gap-6 lg:grid-cols-2">
              <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-5">
                <h2 className="mb-4 flex items-center gap-2 font-semibold">
                  <Star className="h-4 w-4 text-amber-400" />
                  Best rated
                </h2>
                <div className="space-y-2">
                  {(analytics?.topRated.length || 0) === 0 && (
                    <p className="text-sm text-zinc-500">No reviews yet.</p>
                  )}
                  {analytics?.topRated.map((item) => (
                    <div
                      key={`${item.tmdbId}-${item.title}`}
                      className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm"
                    >
                      <span className="truncate">{item.title}</span>
                      <span className="shrink-0 text-amber-300">
                        {item.averageRating}★ · {item.reviewCount}
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-5">
                <h2 className="mb-4 flex items-center gap-2 font-semibold">
                  <Film className="h-4 w-4 text-[var(--primary)]" />
                  Most watched
                </h2>
                <div className="space-y-2">
                  {(analytics?.mostWatched.length || 0) === 0 && (
                    <p className="text-sm text-zinc-500">No watch history yet.</p>
                  )}
                  {analytics?.mostWatched.map((item) => (
                    <div
                      key={`${item.mediaType}-${item.tmdbId}`}
                      className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm"
                    >
                      <span className="truncate">
                        {item.title}{' '}
                        <span className="text-zinc-500">({item.mediaType})</span>
                      </span>
                      <span className="shrink-0 text-zinc-300">
                        {item.watches} plays
                      </span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-5">
                <h2 className="mb-4 flex items-center gap-2 font-semibold">
                  <Eye className="h-4 w-4 text-sky-400" />
                  Top pages
                </h2>
                <div className="space-y-2">
                  {(analytics?.topPages.length || 0) === 0 && (
                    <p className="text-sm text-zinc-500">No page views yet.</p>
                  )}
                  {analytics?.topPages.map((item) => (
                    <div
                      key={item.path}
                      className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm"
                    >
                      <span className="truncate font-mono text-xs text-zinc-300">
                        {item.path}
                      </span>
                      <span className="shrink-0">{item.views}</span>
                    </div>
                  ))}
                </div>
              </section>

              <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-5">
                <h2 className="mb-4 flex items-center gap-2 font-semibold">
                  <Users className="h-4 w-4 text-emerald-400" />
                  Recent signups
                </h2>
                <div className="space-y-2">
                  {analytics?.recentUsers.map((u) => (
                    <div
                      key={u.id}
                      className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3 py-2 text-sm"
                    >
                      <span>
                        @{u.username}
                        {u.role === 'ADMIN' && (
                          <span className="ml-2 rounded bg-[var(--primary)]/20 px-1.5 py-0.5 text-[10px] uppercase text-red-300">
                            admin
                          </span>
                        )}
                      </span>
                      <span className="shrink-0 text-xs text-zinc-500">
                        {new Date(u.createdAt).toLocaleDateString()}
                      </span>
                    </div>
                  ))}
                </div>
              </section>
            </div>
          </div>
        )}

        {tab === 'users' && (
          <section className="overflow-x-auto rounded-xl border border-white/10">
            <table className="min-w-full text-left text-sm">
              <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
                <tr>
                  <th className="px-4 py-3">User</th>
                  <th className="px-4 py-3">Role</th>
                  <th className="px-4 py-3">Status</th>
                  <th className="px-4 py-3">Last login</th>
                  <th className="px-4 py-3">Invite</th>
                  <th className="px-4 py-3">Watches</th>
                  <th className="px-4 py-3">List</th>
                  <th className="px-4 py-3">Joined</th>
                </tr>
              </thead>
              <tbody>
                {users.map((u) => (
                  <tr
                    key={u.id}
                    onClick={() => setSelectedUserId(u.id)}
                    className="cursor-pointer border-t border-white/5 odd:bg-white/[0.02] hover:bg-white/[0.06]"
                  >
                    <td className="px-4 py-3">
                      <div className="flex items-center gap-3">
                        {u.image ? (
                          // eslint-disable-next-line @next/next/no-img-element
                          <img
                            src={u.image}
                            alt=""
                            className="h-8 w-8 rounded-full object-cover object-top"
                          />
                        ) : (
                          <span className="flex h-8 w-8 items-center justify-center rounded-full bg-white/10 text-xs">
                            {u.username.slice(0, 1).toUpperCase()}
                          </span>
                        )}
                        <div>
                          <div className="font-medium">@{u.username}</div>
                          {u.name && u.name !== u.username && (
                            <div className="text-xs text-zinc-500">{u.name}</div>
                          )}
                        </div>
                      </div>
                    </td>
                    <td className="px-4 py-3">
                      <span
                        className={`rounded px-2 py-0.5 text-xs font-semibold ${
                          u.role === 'ADMIN'
                            ? 'bg-red-600/20 text-red-300'
                            : 'bg-white/10 text-zinc-300'
                        }`}
                      >
                        {u.role}
                      </span>
                    </td>
                    <td className="px-4 py-3 text-xs">
                      {u.bannedAt ? (
                        <span className="text-red-400">Banned</span>
                      ) : u.adminMessage ? (
                        <span className="text-amber-400">Message pending</span>
                      ) : (
                        <span className="text-emerald-400">Active</span>
                      )}
                    </td>
                    <td className="px-4 py-3 text-xs text-zinc-400">
                      {u.lastLoginAt
                        ? new Date(u.lastLoginAt).toLocaleString()
                        : '—'}
                    </td>
                    <td className="px-4 py-3 font-mono text-xs text-zinc-400">
                      {u.inviteRedemption?.inviteCode.code ?? '—'}
                    </td>
                    <td className="px-4 py-3">{u._count.watchHistory}</td>
                    <td className="px-4 py-3">{u._count.watchLater}</td>
                    <td className="px-4 py-3 text-zinc-400">
                      {new Date(u.createdAt).toLocaleString()}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </section>
        )}

        {tab === 'settings' && <AdminSettingsTab />}

        {selectedUserId && (
          <AdminUserPanel
            userId={selectedUserId}
            onClose={() => setSelectedUserId(null)}
            onChanged={() => void loadAll()}
          />
        )}

        {tab === 'invites' && (
          <div className="space-y-6">
            <form
              onSubmit={createInvite}
              className="rounded-xl border border-white/10 bg-zinc-950/60 p-5"
            >
              <h2 className="mb-4 flex items-center gap-2 font-semibold">
                <Plus className="h-4 w-4" />
                Create invite code
              </h2>
              <div className="grid gap-3 sm:grid-cols-3">
                <input
                  value={newCode}
                  onChange={(e) => setNewCode(e.target.value.toUpperCase())}
                  placeholder="CODE-NAME"
                  required
                  minLength={4}
                  className="rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 outline-none focus:border-[var(--primary)]"
                />
                <input
                  type="number"
                  min={1}
                  max={1000}
                  value={newMaxUses}
                  onChange={(e) => setNewMaxUses(Number(e.target.value) || 1)}
                  className="rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 outline-none focus:border-[var(--primary)]"
                  placeholder="Max uses"
                />
                <input
                  value={newNote}
                  onChange={(e) => setNewNote(e.target.value)}
                  placeholder="Note (optional)"
                  className="rounded-lg border border-white/10 bg-black/50 px-3 py-2.5 outline-none focus:border-[var(--primary)]"
                />
              </div>
              <button
                type="submit"
                disabled={creating}
                className="mt-4 rounded-lg bg-[var(--primary)] px-4 py-2.5 text-sm font-semibold hover:bg-[var(--primary-dark)] disabled:opacity-50"
              >
                {creating ? 'Creating…' : 'Create invite'}
              </button>
            </form>

            <div className="overflow-x-auto rounded-xl border border-white/10">
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Uses</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3">Note</th>
                    <th className="px-4 py-3">Redeemed by</th>
                    <th className="px-4 py-3">Actions</th>
                  </tr>
                </thead>
                <tbody>
                  {invites.map((invite) => (
                    <tr
                      key={invite.id}
                      className="border-t border-white/5 odd:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">
                        <div className="font-mono font-semibold">
                          {invite.code}
                        </div>
                        {invite.kind === 'FRIEND' && (
                          <div className="text-[10px] uppercase text-sky-400">
                            friend
                          </div>
                        )}
                        {invite.grantsAdmin && (
                          <div className="text-[10px] uppercase text-amber-400">
                            grants admin
                          </div>
                        )}
                      </td>
                      <td className="px-4 py-3">
                        {invite.usedCount}/{invite.maxUses}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            invite.isActive
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : 'bg-zinc-700 text-zinc-400'
                          }`}
                        >
                          {invite.isActive ? 'Active' : 'Disabled'}
                        </span>
                      </td>
                      <td className="max-w-[12rem] truncate px-4 py-3 text-zinc-400">
                        {invite.note || '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {invite.redemptions.length === 0
                          ? '—'
                          : invite.redemptions
                              .map((r) => `@${r.user.username}`)
                              .join(', ')}
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => toggleInvite(invite)}
                            className="rounded p-1.5 text-zinc-300 hover:bg-white/10"
                            title={invite.isActive ? 'Disable' : 'Enable'}
                          >
                            {invite.isActive ? (
                              <ToggleRight className="h-5 w-5 text-emerald-400" />
                            ) : (
                              <ToggleLeft className="h-5 w-5" />
                            )}
                          </button>
                          <button
                            type="button"
                            onClick={() => deleteInvite(invite.id, invite.code)}
                            className="rounded p-1.5 text-zinc-300 hover:bg-red-600/20 hover:text-red-300"
                            title="Delete"
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {tab === 'friends' && friendAudit && (
          <div className="space-y-6">
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <StatCard
                label="Friend codes created"
                value={friendAudit.summary.totalFriendInvites}
              />
              <StatCard
                label="Redeemed"
                value={friendAudit.summary.redeemedFriendInvites}
              />
              <StatCard
                label="Pending"
                value={friendAudit.summary.pendingFriendInvites}
              />
              <StatCard
                label="Users who invited"
                value={friendAudit.summary.usersWhoInvited}
              />
            </div>

            <section className="overflow-x-auto rounded-xl border border-white/10">
              <div className="border-b border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold">
                Per-user invite stats
              </div>
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-950/80 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">User</th>
                    <th className="px-4 py-3">Codes created</th>
                    <th className="px-4 py-3">Friends joined</th>
                    <th className="px-4 py-3">Pending</th>
                    <th className="px-4 py-3">Current cooldown</th>
                    <th className="px-4 py-3">Next available</th>
                  </tr>
                </thead>
                <tbody>
                  {friendAudit.userStats.length === 0 && (
                    <tr>
                      <td
                        colSpan={6}
                        className="px-4 py-6 text-center text-zinc-500"
                      >
                        No friend invites yet.
                      </td>
                    </tr>
                  )}
                  {friendAudit.userStats.map((u) => (
                    <tr
                      key={u.id}
                      className="border-t border-white/5 odd:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3">@{u.username}</td>
                      <td className="px-4 py-3">{u.friendInvitesCreated}</td>
                      <td className="px-4 py-3">{u.friendsInvited}</td>
                      <td className="px-4 py-3">{u.pendingInvites}</td>
                      <td className="px-4 py-3 text-zinc-300">
                        {u.currentCooldown}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {u.nextAvailableAt
                          ? new Date(u.nextAvailableAt).toLocaleString()
                          : 'Now'}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>

            <section className="overflow-x-auto rounded-xl border border-white/10">
              <div className="border-b border-white/10 bg-zinc-950 px-4 py-3 text-sm font-semibold">
                Friend invite audit log
              </div>
              <table className="min-w-full text-left text-sm">
                <thead className="bg-zinc-950/80 text-xs uppercase tracking-wide text-zinc-500">
                  <tr>
                    <th className="px-4 py-3">Code</th>
                    <th className="px-4 py-3">Created by</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Redeemed by</th>
                    <th className="px-4 py-3">Status</th>
                  </tr>
                </thead>
                <tbody>
                  {friendAudit.invites.length === 0 && (
                    <tr>
                      <td
                        colSpan={5}
                        className="px-4 py-6 text-center text-zinc-500"
                      >
                        No friend invite keys have been generated yet.
                      </td>
                    </tr>
                  )}
                  {friendAudit.invites.map((invite) => (
                    <tr
                      key={invite.id}
                      className="border-t border-white/5 odd:bg-white/[0.02]"
                    >
                      <td className="px-4 py-3 font-mono">{invite.code}</td>
                      <td className="px-4 py-3">
                        {invite.createdBy
                          ? `@${invite.createdBy.username}`
                          : '—'}
                      </td>
                      <td className="px-4 py-3 text-xs text-zinc-400">
                        {new Date(invite.createdAt).toLocaleString()}
                      </td>
                      <td className="px-4 py-3 text-xs">
                        {invite.redeemedBy.length === 0 ? (
                          <span className="text-amber-300">Not redeemed</span>
                        ) : (
                          invite.redeemedBy.map((r) => (
                            <div key={r.id} className="text-emerald-300">
                              @{r.username}
                              <span className="ml-2 text-zinc-500">
                                {new Date(r.redeemedAt).toLocaleString()}
                              </span>
                            </div>
                          ))
                        )}
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`rounded px-2 py-0.5 text-xs ${
                            invite.usedCount > 0
                              ? 'bg-emerald-500/15 text-emerald-300'
                              : invite.isActive
                                ? 'bg-amber-500/15 text-amber-200'
                                : 'bg-zinc-700 text-zinc-400'
                          }`}
                        >
                          {invite.usedCount > 0
                            ? 'Redeemed'
                            : invite.isActive
                              ? 'Pending'
                              : 'Disabled'}
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          </div>
        )}
      </div>
    </div>
  )
}
