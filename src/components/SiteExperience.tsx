'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import { usePathname, useRouter } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import { Lock, Megaphone, MessageSquareWarning, X } from 'lucide-react'
import {
  getSectionForNavHref,
  getSectionForPath,
  type SectionMaintenanceState,
} from '@/lib/site-settings'
import { getAdminPath } from '@/lib/admin-path'

type PollView = {
  id: string
  question: string
  options: string[]
  endsAt: string | null
  resultsRevealAt: string | null
  ended: boolean
  canVote: boolean
  myVote: number | null
  dismissed: boolean
  revealResults: boolean
  voteCount: number
  counts: number[] | null
}

type SiteStatus = {
  maintenanceMode: boolean
  maintenanceMessage: string
  sectionMaintenance: SectionMaintenanceState
  announcement: { key: string; title: string; body: string } | null
  adminMessage: { body: string; at: string | null } | null
  banned: boolean
  banReason: string | null
  polls: PollView[]
  isAdmin: boolean
}

type SiteContextValue = {
  status: SiteStatus | null
  refresh: () => Promise<void>
  isHrefLocked: (href: string) => {
    locked: boolean
    message: string
  }
}

const SiteContext = createContext<SiteContextValue>({
  status: null,
  refresh: async () => {},
  isHrefLocked: () => ({ locked: false, message: '' }),
})

export function useSiteExperience() {
  return useContext(SiteContext)
}

export default function SiteExperience({
  children,
}: {
  children: ReactNode
}) {
  const { status: authStatus } = useSession()
  const pathname = usePathname()
  const router = useRouter()
  const [status, setStatus] = useState<SiteStatus | null>(null)
  const [voting, setVoting] = useState<string | null>(null)
  const [showDismissedPolls, setShowDismissedPolls] = useState(false)

  const refresh = useCallback(async () => {
    if (authStatus !== 'authenticated') {
      setStatus(null)
      return
    }
    try {
      const res = await fetch('/api/site', { cache: 'no-store' })
      if (!res.ok) return
      const data = (await res.json()) as SiteStatus
      setStatus(data)
    } catch {
      // ignore transient failures
    }
  }, [authStatus])

  useEffect(() => {
    void refresh()
  }, [refresh, pathname])

  // Keep maintenance / polls fresh even when staying on the same page
  useEffect(() => {
    if (authStatus !== 'authenticated') return
    const id = window.setInterval(() => {
      void refresh()
    }, 15_000)
    const onFocus = () => {
      void refresh()
    }
    const onAdminSave = () => {
      void refresh()
    }
    window.addEventListener('focus', onFocus)
    window.addEventListener('streamflix:site-refresh', onAdminSave)
    return () => {
      window.clearInterval(id)
      window.removeEventListener('focus', onFocus)
      window.removeEventListener('streamflix:site-refresh', onAdminSave)
    }
  }, [authStatus, refresh])

  useEffect(() => {
    if (!status?.banned) return
    void (async () => {
      await fetch('/api/auth/logout', { method: 'POST' }).catch(() => {})
      await signOut({ callbackUrl: '/auth/signin' })
    })()
  }, [status?.banned])

  const postAction = useCallback(
    async (body: Record<string, unknown>) => {
      const res = await fetch('/api/site', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
      if (res.ok) await refresh()
      return res.ok
    },
    [refresh]
  )

  const isHrefLocked = useCallback(
    (href: string) => {
      if (!status) return { locked: false, message: '' }
      const section = getSectionForNavHref(href)
      if (!section) return { locked: false, message: '' }
      const entry = status.sectionMaintenance[section.key]
      if (!entry?.enabled) return { locked: false, message: '' }
      return {
        locked: true,
        message: entry.message || 'This section is under maintenance.',
      }
    },
    [status]
  )

  const pathLock = useMemo(() => {
    // Full-site maintenance has its own overlay; section locks apply to everyone
    // (including admins) so locked tabs are truly inaccessible.
    if (!pathname || !status || status.maintenanceMode) {
      return null
    }
    // Never lock home routes via section maintenance
    if (pathname === '/' || pathname === '/anime') return null
    const section = getSectionForPath(pathname)
    if (!section) return null
    const entry = status.sectionMaintenance[section.key]
    if (!entry?.enabled) return null
    return {
      label: section.label,
      message: entry.message || 'This section is under maintenance.',
    }
  }, [pathname, status])

  const value = useMemo(
    () => ({ status, refresh, isHrefLocked }),
    [status, refresh, isHrefLocked]
  )

  const adminPath = getAdminPath()
  const skipUi =
    !pathname ||
    pathname.startsWith('/auth') ||
    pathname.startsWith('/welcome') ||
    pathname.startsWith('/legal') ||
    pathname.startsWith('/admin') ||
    pathname === adminPath ||
    pathname.startsWith(`${adminPath}/`)

  const visiblePolls =
    status?.polls.filter((p) => showDismissedPolls || !p.dismissed) || []

  return (
    <SiteContext.Provider value={value}>
      {children}
      {!skipUi && status?.maintenanceMode && !status.isAdmin && (
        <div className="fixed inset-0 z-[200] flex items-center justify-center bg-black px-6 text-center">
          <div className="max-w-lg">
            <Lock className="mx-auto h-10 w-10 text-red-400" />
            <h1 className="mt-4 font-display text-4xl tracking-wide text-white">
              Maintenance
            </h1>
            <p className="mt-3 text-zinc-400">{status.maintenanceMessage}</p>
          </div>
        </div>
      )}

      {!skipUi && pathLock && (
        <div className="fixed inset-0 z-[190] flex items-center justify-center bg-black/95 px-6 text-center backdrop-blur-sm">
          <div className="max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-8">
            <Lock className="mx-auto h-9 w-9 text-zinc-400" />
            <h2 className="mt-4 font-display text-3xl text-white">
              {pathLock.label}
            </h2>
            <p className="mt-3 text-sm leading-relaxed text-zinc-400">
              {pathLock.message}
            </p>
            <button
              type="button"
              onClick={() => router.push('/')}
              className="mt-6 rounded-xl bg-[var(--primary)] px-5 py-2.5 text-sm font-semibold text-white"
            >
              Back to home
            </button>
          </div>
        </div>
      )}

      {!skipUi && status?.adminMessage && (
        <div className="fixed inset-0 z-[180] flex items-center justify-center bg-black/80 px-4 backdrop-blur-sm">
          <div className="w-full max-w-md rounded-2xl border border-amber-500/30 bg-zinc-950 p-6 shadow-2xl">
            <div className="flex items-start gap-3">
              <MessageSquareWarning className="mt-0.5 h-5 w-5 shrink-0 text-amber-400" />
              <div className="min-w-0 flex-1">
                <h3 className="font-semibold text-white">Message from admin</h3>
                <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-zinc-300">
                  {status.adminMessage.body}
                </p>
                <button
                  type="button"
                  onClick={() =>
                    void postAction({ action: 'dismissAdminMessage' })
                  }
                  className="mt-5 rounded-lg bg-white px-4 py-2 text-sm font-semibold text-black"
                >
                  Got it
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {!skipUi && status?.announcement && !status.adminMessage && (
        <div className="fixed inset-x-0 top-[calc(var(--nav-height)+0.75rem)] z-[170] px-4">
          <div className="mx-auto flex max-w-3xl items-start gap-3 rounded-xl border border-red-500/30 bg-zinc-950/95 p-4 shadow-xl backdrop-blur">
            <Megaphone className="mt-0.5 h-5 w-5 shrink-0 text-red-400" />
            <div className="min-w-0 flex-1">
              <h3 className="font-semibold text-white">
                {status.announcement.title}
              </h3>
              {status.announcement.body && (
                <p className="mt-1 whitespace-pre-wrap text-sm text-zinc-400">
                  {status.announcement.body}
                </p>
              )}
            </div>
            <button
              type="button"
              aria-label="Dismiss announcement"
              onClick={() =>
                void postAction({
                  action: 'dismissAnnouncement',
                  announcementKey: status.announcement!.key,
                })
              }
              className="rounded-lg p-1 text-zinc-500 hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}

      {!skipUi &&
        !status?.adminMessage &&
        visiblePolls.length > 0 &&
        (() => {
          const poll = visiblePolls[0]!
          const total =
            poll.counts?.reduce((a, b) => a + b, 0) || poll.voteCount || 0
          return (
            <div className="fixed bottom-4 right-4 z-[160] w-[min(100vw-2rem,22rem)] rounded-2xl border border-white/10 bg-zinc-950/95 p-4 shadow-2xl backdrop-blur">
              <div className="mb-3 flex items-start justify-between gap-2">
                <h3 className="text-sm font-semibold text-white">
                  {poll.question}
                </h3>
                <button
                  type="button"
                  aria-label="Dismiss poll"
                  onClick={() =>
                    void postAction({ action: 'dismissPoll', pollId: poll.id })
                  }
                  className="rounded p-1 text-zinc-500 hover:bg-white/5 hover:text-white"
                >
                  <X className="h-4 w-4" />
                </button>
              </div>

              <div className="space-y-2">
                {poll.options.map((opt, i) => {
                  const count = poll.counts?.[i] ?? 0
                  const pct =
                    poll.revealResults && total > 0
                      ? Math.round((count / total) * 100)
                      : null
                  const selected = poll.myVote === i
                  return (
                    <button
                      key={`${poll.id}-${i}`}
                      type="button"
                      disabled={!poll.canVote || voting === poll.id}
                      onClick={() => {
                        setVoting(poll.id)
                        void postAction({
                          action: 'votePoll',
                          pollId: poll.id,
                          optionIndex: i,
                        }).finally(() => setVoting(null))
                      }}
                      className={`relative w-full overflow-hidden rounded-lg border px-3 py-2 text-left text-sm transition ${
                        selected
                          ? 'border-[var(--primary)] bg-red-600/20'
                          : 'border-white/10 bg-white/5 hover:bg-white/10'
                      } disabled:cursor-default`}
                    >
                      {pct != null && (
                        <span
                          className="absolute inset-y-0 left-0 bg-white/10"
                          style={{ width: `${pct}%` }}
                        />
                      )}
                      <span className="relative flex justify-between gap-2">
                        <span>{opt}</span>
                        {pct != null && (
                          <span className="text-zinc-400">{pct}%</span>
                        )}
                      </span>
                    </button>
                  )
                })}
              </div>

              {poll.dismissed && (
                <button
                  type="button"
                  onClick={() =>
                    void postAction({
                      action: 'undismissPoll',
                      pollId: poll.id,
                    })
                  }
                  className="mt-3 text-xs text-zinc-500 hover:text-zinc-300"
                >
                  Keep showing results
                </button>
              )}
            </div>
          )
        })()}

      {!skipUi &&
        status &&
        status.polls.some((p) => p.dismissed) &&
        !showDismissedPolls && (
          <button
            type="button"
            onClick={() => setShowDismissedPolls(true)}
            className="fixed bottom-4 left-4 z-[150] rounded-full border border-white/10 bg-zinc-950/90 px-3 py-1.5 text-xs text-zinc-400 hover:text-white"
          >
            View poll results
          </button>
        )}
    </SiteContext.Provider>
  )
}
