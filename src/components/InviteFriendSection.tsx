'use client'

import { useCallback, useEffect, useState } from 'react'
import { Check, Copy, KeyRound, Loader2, UserPlus } from 'lucide-react'
import toast from 'react-hot-toast'

type RedeemedBy = {
  id: string
  username: string
  name: string | null
  redeemedAt: string
}

type FriendInvite = {
  id: string
  code: string
  createdAt: string
  isActive: boolean
  usedCount: number
  maxUses: number
  redeemedBy: RedeemedBy[]
}

function formatClientRemaining(ms: number): string {
  if (ms <= 0) return 'soon'
  const totalMinutes = Math.ceil(ms / (60 * 1000))
  if (totalMinutes < 60) return `${totalMinutes}m`
  const totalHours = Math.ceil(ms / (60 * 60 * 1000))
  if (totalHours < 48) return `${totalHours}h`
  const days = Math.ceil(ms / (24 * 60 * 60 * 1000))
  return `${days} day${days === 1 ? '' : 's'}`
}

type FriendInviteStatus = {
  canCreate: boolean
  reason: string | null
  wasFriendInvited?: boolean
  firstInviteGate?: boolean
  redeemedCount: number
  createdCount: number
  cooldownLabel: string
  nextCooldownAfterRedeem: string
  nextAvailableAt: string | null
  remainingMs: number
  pending: { id: string; code: string; createdAt: string } | null
  invites: FriendInvite[]
}

export default function InviteFriendSection() {
  const [status, setStatus] = useState<FriendInviteStatus | null>(null)
  const [loading, setLoading] = useState(true)
  const [creating, setCreating] = useState(false)
  const [copied, setCopied] = useState<string | null>(null)

  const load = useCallback(async () => {
    try {
      const res = await fetch('/api/invites/friend')
      if (!res.ok) throw new Error('Failed to load')
      const data = await res.json()
      setStatus(data)
    } catch {
      toast.error('Could not load invite status')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const createInvite = async () => {
    setCreating(true)
    try {
      const res = await fetch('/api/invites/friend', { method: 'POST' })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Could not create invite')
      setStatus(data)
      toast.success(`Invite ready: ${data.invite.code}`)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not create invite')
    } finally {
      setCreating(false)
    }
  }

  const copyCode = async (code: string) => {
    try {
      await navigator.clipboard.writeText(code)
      setCopied(code)
      toast.success('Invite code copied')
      window.setTimeout(() => setCopied(null), 2000)
    } catch {
      toast.error('Could not copy code')
    }
  }

  if (loading) {
    return (
      <div className="rounded-lg bg-gray-900 p-6 text-zinc-400">
        <Loader2 className="mr-2 inline h-4 w-4 animate-spin" />
        Loading invites…
      </div>
    )
  }

  if (!status) return null

  return (
    <div className="rounded-lg border border-white/10 bg-gray-900 p-6">
      <div className="mb-4 flex items-start gap-3">
        <div className="rounded-lg bg-red-600/20 p-2.5">
          <UserPlus className="h-5 w-5 text-red-400" />
        </div>
        <div>
          <h2 className="text-xl font-bold text-white">Invite a friend</h2>
          <p className="mt-1 text-sm text-zinc-400">
            Create one personal invite key for a friend. If you joined with a
            friend invite, your first code unlocks after 30 days. After that, the
            more friends who join with your codes, the sooner you can make the
            next one — down to a 2-day minimum.
          </p>
        </div>
      </div>

      <div className="mb-5 grid gap-3 sm:grid-cols-3">
        <div className="rounded-lg bg-black/40 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Friends joined
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {status.redeemedCount}
          </p>
        </div>
        <div className="rounded-lg bg-black/40 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Codes created
          </p>
          <p className="mt-1 text-2xl font-semibold text-white">
            {status.createdCount}
          </p>
        </div>
        <div className="rounded-lg bg-black/40 px-3 py-2.5">
          <p className="text-[11px] uppercase tracking-wide text-zinc-500">
            Current wait
          </p>
          <p className="mt-1 text-lg font-semibold text-white">
            {status.cooldownLabel}
          </p>
        </div>
      </div>

      {status.pending && (
        <div className="mb-4 rounded-lg border border-amber-500/30 bg-amber-500/10 p-4">
          <p className="text-sm font-semibold text-amber-200">
            Waiting for a friend to redeem
          </p>
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <code className="rounded bg-black/40 px-2.5 py-1.5 font-mono text-sm text-white">
              {status.pending.code}
            </code>
            <button
              type="button"
              onClick={() => copyCode(status.pending!.code)}
              className="inline-flex items-center gap-1.5 rounded-md bg-white/10 px-2.5 py-1.5 text-xs font-semibold text-white hover:bg-white/15"
            >
              {copied === status.pending.code ? (
                <Check className="h-3.5 w-3.5" />
              ) : (
                <Copy className="h-3.5 w-3.5" />
              )}
              Copy
            </button>
          </div>
        </div>
      )}

      {status.firstInviteGate && !status.pending && (
        <div className="mb-4 rounded-lg border border-sky-500/30 bg-sky-500/10 p-4">
          <p className="text-sm font-semibold text-sky-200">
            First invite unlocks in {formatClientRemaining(status.remainingMs)}
          </p>
          <p className="mt-1 text-xs text-sky-200/80">
            Because you joined with a friend invite, you must wait 30 days
            before generating your first code.
          </p>
        </div>
      )}

      <button
        type="button"
        disabled={!status.canCreate || creating}
        onClick={() => void createInvite()}
        className="inline-flex items-center gap-2 rounded-lg bg-red-600 px-4 py-2.5 text-sm font-semibold text-white transition hover:bg-red-700 disabled:cursor-not-allowed disabled:opacity-50"
      >
        {creating ? (
          <Loader2 className="h-4 w-4 animate-spin" />
        ) : (
          <KeyRound className="h-4 w-4" />
        )}
        {status.canCreate ? 'Generate invite code' : 'Invite unavailable'}
      </button>

      {!status.canCreate && status.reason && (
        <p className="mt-2 text-sm text-zinc-400">{status.reason}</p>
      )}

      {status.canCreate && status.redeemedCount > 0 && (
        <p className="mt-2 text-xs text-zinc-500">
          After your next friend joins, the wait becomes{' '}
          {status.nextCooldownAfterRedeem}.
        </p>
      )}

      {status.invites.length > 0 && (
        <div className="mt-6 border-t border-white/10 pt-5">
          <h3 className="mb-3 text-sm font-semibold uppercase tracking-wide text-zinc-400">
            Your invite history
          </h3>
          <div className="space-y-2">
            {status.invites.map((invite) => {
              const redeemer = invite.redeemedBy[0]
              return (
                <div
                  key={invite.id}
                  className="flex flex-wrap items-center justify-between gap-3 rounded-lg bg-black/35 px-3 py-2.5 text-sm"
                >
                  <div>
                    <div className="flex items-center gap-2">
                      <code className="font-mono text-white">{invite.code}</code>
                      <button
                        type="button"
                        onClick={() => copyCode(invite.code)}
                        className="text-zinc-400 hover:text-white"
                        aria-label="Copy invite code"
                      >
                        {copied === invite.code ? (
                          <Check className="h-3.5 w-3.5" />
                        ) : (
                          <Copy className="h-3.5 w-3.5" />
                        )}
                      </button>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500">
                      Created {new Date(invite.createdAt).toLocaleDateString()}
                    </p>
                  </div>
                  <div className="text-right text-xs">
                    {redeemer ? (
                      <p className="text-emerald-300">
                        Redeemed by @{redeemer.username}
                        <span className="mt-0.5 block text-zinc-500">
                          {new Date(redeemer.redeemedAt).toLocaleString()}
                        </span>
                      </p>
                    ) : invite.isActive ? (
                      <p className="text-amber-300">Not redeemed yet</p>
                    ) : (
                      <p className="text-zinc-500">Inactive</p>
                    )}
                  </div>
                </div>
              )
            })}
          </div>
        </div>
      )}
    </div>
  )
}
