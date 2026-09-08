'use client'

import { useEffect, useState, useRef, use, useCallback } from 'react'
import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import {
  ArrowLeft, Copy, MessageSquare, Send, Users, Play, Pause,
  SkipForward, MicOff, Mic, Radio, Shield, Clock, VolumeX, PowerOff,
  Wifi, Lock, Calendar, PlayCircle, Layers
} from 'lucide-react'
import toast from 'react-hot-toast'
import Navbar from '@/components/Navbar'
import { getMovieEmbedUrl, getTVEmbedUrl } from '@/lib/embeds'
import { playSound } from '@/lib/sound'

type PartyMessage = {
  id: string
  sender: string
  userId: string
  text: string
  createdAt: string
}

type PartyRoom = {
  id: string
  code: string
  tmdbId: number
  title: string
  mediaType: string
  seasonNumber: number | null
  episodeNumber: number | null
  currentTime: number
  isPlaying: boolean
  scheduledStartTime: string | null
  isChatMuted: boolean
  chatCooldownSec: number
  mutedUserIds: string[]
  maxUsers: number | null
  viewerCount?: number
  host: { id: string; username: string }
  messages: PartyMessage[]
}

/** Format seconds → m:ss or h:mm:ss */
function formatTime(secs: number): string {
  if (!isFinite(secs) || secs < 0) return '0:00'
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  const s = Math.floor(secs % 60)
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`
  return `${m}:${s.toString().padStart(2, '0')}`
}

/** Build the vidsrc embed URL for the current room state */
function buildEmbedUrl(room: PartyRoom, startAt: number): string {
  const progress = startAt > 15 ? Math.floor(startAt) : undefined
  if (room.mediaType === 'movie') {
    return getMovieEmbedUrl(room.tmdbId, { progress })
  }
  return getTVEmbedUrl(room.tmdbId, room.seasonNumber ?? 1, room.episodeNumber ?? 1, { progress })
}

export default function WatchPartyPage({
  params,
}: {
  params: Promise<{ code: string }>
}) {
  const resolvedParams = use(params)
  const { data: session } = useSession()
  const router = useRouter()
  const [room, setRoom] = useState<PartyRoom | null>(null)
  const [loading, setLoading] = useState(true)
  const [chatText, setChatText] = useState('')
  const [sending, setSending] = useState(false)
  const [hostAction, setHostAction] = useState(false)
  const [shuttingDown, setShuttingDown] = useState(false)

  // Local live position counter (ticks smooth every second)
  const [livePos, setLivePos] = useState<number>(0)
  const [countdownSecs, setCountdownSecs] = useState<number | null>(null)

  // Sync state — track iframe playback position & time loaded to prevent stuttering reloads
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const [embedKey, setEmbedKey] = useState(0)
  const loadedPosRef = useRef<number>(-1)
  const loadedAtMsRef = useRef<number>(0)
  const lastSyncedPlayingRef = useRef<boolean | null>(null)

  const chatEndRef = useRef<HTMLDivElement>(null)

  const fetchRoom = useCallback(async () => {
    try {
      const res = await fetch(`/api/watch-party?code=${resolvedParams.code}`)
      if (res.ok) {
        const data = await res.json()
        const fetchedRoom: PartyRoom = data.room
        setRoom(fetchedRoom)
      } else if (res.status === 404) {
        toast.error('Watch Party has ended.')
        router.push('/')
      }
    } catch (err) {
      console.error('Error fetching room:', err)
    } finally {
      setLoading(false)
    }
  }, [resolvedParams.code, router])

  // Poll every 3 seconds
  useEffect(() => {
    void fetchRoom()
    const interval = setInterval(fetchRoom, 3000)
    return () => clearInterval(interval)
  }, [fetchRoom])

  const isHost = session?.user?.id === room?.host.id

  // Local 1-second ticker for live position and countdown
  useEffect(() => {
    const timer = setInterval(() => {
      if (!room) return

      // Countdown handling for scheduled start
      if (room.scheduledStartTime) {
        const schedTime = new Date(room.scheduledStartTime).getTime()
        const diffMs = schedTime - Date.now()
        if (diffMs > 0) {
          setCountdownSecs(Math.ceil(diffMs / 1000))
        } else {
          setCountdownSecs(null)
        }
      } else {
        setCountdownSecs(null)
      }

      // Smooth live position increment when playing
      const isBeforeSchedule = room.scheduledStartTime && new Date(room.scheduledStartTime).getTime() > Date.now()
      if (room.isPlaying && !isBeforeSchedule) {
        // Guests operate 5 seconds behind the host for smooth sync buffer
        const rawTarget = isHost ? room.currentTime : Math.max(0, room.currentTime - 5)
        setLivePos((prev) => {
          // If local ticker is way off from target position (>10s), adjust to target
          if (Math.abs(prev - rawTarget) > 10) return rawTarget
          return prev + 1
        })
      } else {
        const rawTarget = isHost ? room.currentTime : Math.max(0, room.currentTime - 5)
        setLivePos(rawTarget)
      }
    }, 1000)

    return () => clearInterval(timer)
  }, [room, isHost])

  // ── Sync iframe to host state (Smooth — 5s Delay for Guests, No Constant Reloading) ──
  useEffect(() => {
    if (!room) return

    const isBeforeSchedule = room.scheduledStartTime && new Date(room.scheduledStartTime).getTime() > Date.now()
    if (isBeforeSchedule) {
      // Don't render video iframe yet during countdown
      return
    }

    // 5-second buffer delay for non-host viewers for smooth buffering
    const targetServerPos = isHost ? room.currentTime : Math.max(0, room.currentTime - 5)
    const playingChanged = room.isPlaying !== lastSyncedPlayingRef.current

    // Estimate what the iframe should currently be playing naturally
    const now = Date.now()
    let estimatedIframePos = loadedPosRef.current
    if (lastSyncedPlayingRef.current && loadedAtMsRef.current > 0) {
      estimatedIframePos += (now - loadedAtMsRef.current) / 1000
    }

    const timeDrift = Math.abs(targetServerPos - estimatedIframePos)

    // Reload iframe ONLY IF:
    // 1. Initial load (embedUrl is null)
    // 2. Play/Pause state changed
    // 3. Host did a major manual seek (> 30s drift)
    const shouldReload =
      embedUrl === null ||
      playingChanged ||
      timeDrift > 30

    if (shouldReload) {
      const url = buildEmbedUrl(room, targetServerPos)
      setEmbedUrl(url)
      setEmbedKey((k) => k + 1)
      loadedPosRef.current = targetServerPos
      loadedAtMsRef.current = now
      lastSyncedPlayingRef.current = room.isPlaying
    }
  }, [room?.currentTime, room?.isPlaying, room?.mediaType, room?.tmdbId, room?.scheduledStartTime, isHost]) // eslint-disable-line

  // Scroll chat to bottom
  useEffect(() => {
    chatEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [room?.messages])

  // ── Chat ───────────────────────────────────────────────────────────────────
  const sendChatMessage = async (e: React.FormEvent) => {
    e.preventDefault()
    if (!chatText.trim() || sending) return
    playSound.click()
    setSending(true)
    try {
      const res = await fetch('/api/watch-party', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: resolvedParams.code, action: 'chat', text: chatText }),
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Failed to send')
      }
      setChatText('')
      await fetchRoom()
    } catch (err: any) {
      toast.error(err.message || 'Failed to send message')
    } finally {
      setSending(false)
    }
  }

  // ── Host Controls ──────────────────────────────────────────────────────────
  const hostSync = async (isPlaying: boolean, currentTime?: number) => {
    if (hostAction) return
    setHostAction(true)
    try {
      await fetch('/api/watch-party', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          code: resolvedParams.code,
          action: 'sync',
          isPlaying,
          ...(currentTime !== undefined ? { currentTime } : {}),
        }),
      })
      await fetchRoom()
    } catch { toast.error('Sync failed') }
    finally { setHostAction(false) }
  }

  const startPartyNow = async () => {
    if (hostAction) return
    setHostAction(true)
    playSound.chime()
    try {
      await fetch('/api/watch-party', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: resolvedParams.code, action: 'startNow' }),
      })
      await fetchRoom()
      toast.success('Watch Party Started!')
    } catch { toast.error('Failed to start') }
    finally { setHostAction(false) }
  }

  const schedulePartyIn = async (minutes: number) => {
    if (hostAction) return
    setHostAction(true)
    playSound.click()
    try {
      await fetch('/api/watch-party', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: resolvedParams.code, action: 'setScheduledTime', scheduledInMinutes: minutes }),
      })
      await fetchRoom()
      toast.success(`Scheduled to start in ${minutes} minutes`)
    } catch { toast.error('Failed to set schedule') }
    finally { setHostAction(false) }
  }

  const toggleChatMute = async () => {
    if (hostAction) return
    setHostAction(true)
    try {
      await fetch('/api/watch-party', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: resolvedParams.code, action: 'toggleChatMute' }),
      })
      await fetchRoom()
      toast.success(`Chat ${room?.isChatMuted ? 'un-muted' : 'muted'}`)
    } catch { toast.error('Failed') }
    finally { setHostAction(false) }
  }

  const muteUser = async (userId: string, username: string) => {
    if (hostAction) return
    setHostAction(true)
    try {
      const res = await fetch('/api/watch-party', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ code: resolvedParams.code, action: 'muteUser', muteUserId: userId }),
      })
      const data = await res.json()
      await fetchRoom()
      toast.success(data.muted ? `@${username} muted` : `@${username} un-muted`)
    } catch { toast.error('Failed') }
    finally { setHostAction(false) }
  }

  const copyShareLink = () => {
    playSound.click()
    navigator.clipboard.writeText(window.location.href)
    toast.success('Room link copied!')
  }

  const shutdownParty = async () => {
    if (!confirm('Shut down this Watch Party for everyone? This cannot be undone.')) return
    playSound.click()
    setShuttingDown(true)
    try {
      const res = await fetch(`/api/watch-party?code=${resolvedParams.code}`, {
        method: 'DELETE',
      })
      if (!res.ok) {
        const data = await res.json().catch(() => ({}))
        throw new Error(data.error || 'Shutdown failed')
      }
      toast.success('Watch Party closed.')
      router.push('/')
    } catch (err: any) {
      toast.error(err.message || 'Shutdown failed')
      setShuttingDown(false)
    }
  }

  // ── Loading / Not Found ────────────────────────────────────────────────────
  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-purple-500 border-t-transparent" />
      </div>
    )
  }

  if (!room) {
    return (
      <div className="flex min-h-screen flex-col bg-black text-white">
        <Navbar />
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          <Users className="mx-auto mb-4 h-16 w-16 text-zinc-600" />
          <h1 className="text-2xl font-bold">Watch Party Not Found</h1>
          <p className="mt-2 text-sm text-zinc-400">This room code does not exist or was closed.</p>
          <Link href="/" className="mt-6 rounded-lg bg-[var(--primary)] px-6 py-2.5 text-sm font-bold">
            Back Home
          </Link>
        </div>
      </div>
    )
  }

  const myId = session?.user?.id || ''
  const isMutedSelf = room.mutedUserIds.includes(myId)
  const isScheduled = room.scheduledStartTime && new Date(room.scheduledStartTime).getTime() > Date.now()

  // Deduplicate messages for display
  const chatMessages = room.messages.reduce((acc: PartyMessage[], m) => {
    if (!acc.find((x) => x.id === m.id)) acc.push(m)
    return acc
  }, [])

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <Navbar />

      <main className="page-shell flex-1 pb-16 pt-[calc(var(--nav-height)+1.5rem)]">
        {/* Header */}
        <div className="mb-4 flex flex-wrap items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <Link href="/" className="text-zinc-400 hover:text-white">
              <ArrowLeft className="h-4 w-4" />
            </Link>
            <div>
              <div className="flex flex-wrap items-center gap-2">
                <Radio className="h-4 w-4 animate-pulse text-purple-400" />
                <h1 className="font-display text-2xl tracking-wide text-white">{room.title}</h1>
                <span className="rounded bg-purple-500/20 px-2 py-0.5 font-mono text-xs text-purple-300">
                  CODE: {room.code}
                </span>
                {isHost && (
                  <span className="rounded-full bg-amber-500/20 px-2 py-0.5 text-[10px] font-bold uppercase text-amber-300">
                    <Shield className="mr-1 inline h-3 w-3" />
                    HOST
                  </span>
                )}
              </div>
              <p className="text-xs text-zinc-400">Hosted by @{room.host.username}</p>
            </div>
          </div>
          <div className="flex flex-wrap items-center gap-2">
            <button
              type="button"
              onClick={copyShareLink}
              className="inline-flex items-center gap-1.5 rounded-lg border border-purple-500/30 bg-purple-500/10 px-3 py-1.5 text-xs font-bold text-purple-200 hover:bg-purple-500/20"
            >
              <Copy className="h-3.5 w-3.5" />
              Share Room
            </button>
            {isHost && (
              <button
                type="button"
                onClick={shutdownParty}
                disabled={shuttingDown}
                className="inline-flex items-center gap-1.5 rounded-lg border border-red-500/30 bg-red-500/10 px-3 py-1.5 text-xs font-bold text-red-400 transition hover:bg-red-500/20 disabled:opacity-50"
              >
                <PowerOff className="h-3.5 w-3.5" />
                {shuttingDown ? 'Shutting down…' : 'Shutdown Party'}
              </button>
            )}
          </div>
        </div>

        {/* Host Playback & Schedule Controls */}
        {isHost && (
          <div className="mb-4 flex flex-wrap items-center gap-3 rounded-xl border border-amber-500/20 bg-amber-500/5 px-4 py-3">
            <span className="flex items-center gap-1.5 text-xs font-bold uppercase tracking-wide text-amber-400">
              <Shield className="h-3.5 w-3.5" /> Host Controls
            </span>
            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                disabled={hostAction}
                onClick={startPartyNow}
                title="Start Movie Now for Everyone"
                className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-600 px-3 py-1.5 text-xs font-bold text-white shadow-md hover:bg-emerald-500 disabled:opacity-50"
              >
                <PlayCircle className="h-3.5 w-3.5" /> Start Now
              </button>
              <button
                type="button"
                disabled={hostAction}
                onClick={() => hostSync(true)}
                title="Play for all"
                className="inline-flex items-center gap-1.5 rounded-lg bg-green-600/20 px-3 py-1.5 text-xs font-bold text-green-300 hover:bg-green-600/30 disabled:opacity-50"
              >
                <Play className="h-3.5 w-3.5 fill-current" /> Play
              </button>
              <button
                type="button"
                disabled={hostAction}
                onClick={() => hostSync(false)}
                title="Pause for all"
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-600/30 px-3 py-1.5 text-xs font-bold text-zinc-300 hover:bg-zinc-600/40 disabled:opacity-50"
              >
                <Pause className="h-3.5 w-3.5 fill-current" /> Pause
              </button>
              <button
                type="button"
                disabled={hostAction}
                onClick={() => hostSync(room.isPlaying, 0)}
                title="Restart from beginning"
                className="inline-flex items-center gap-1.5 rounded-lg bg-zinc-700/30 px-3 py-1.5 text-xs font-bold text-zinc-400 hover:text-white disabled:opacity-50"
              >
                <SkipForward className="h-3.5 w-3.5" /> Restart
              </button>

              {/* Set Schedule Dropdown */}
              <div className="relative inline-flex items-center gap-1.5">
                <Calendar className="h-3.5 w-3.5 text-purple-400" />
                <select
                  onChange={(e) => {
                    const mins = parseInt(e.target.value)
                    if (mins > 0) schedulePartyIn(mins)
                  }}
                  defaultValue=""
                  disabled={hostAction}
                  className="rounded-lg border border-purple-500/30 bg-purple-500/10 px-2.5 py-1 text-xs font-bold text-purple-200 outline-none hover:bg-purple-500/20"
                >
                  <option value="" disabled>Set Start Schedule…</option>
                  <option value="5">Start in 5 mins</option>
                  <option value="10">Start in 10 mins</option>
                  <option value="15">Start in 15 mins</option>
                  <option value="30">Start in 30 mins</option>
                </select>
              </div>
            </div>

            <div className="ml-auto flex items-center gap-2">
              <button
                type="button"
                disabled={hostAction}
                onClick={toggleChatMute}
                className={`inline-flex items-center gap-1.5 rounded-lg px-3 py-1.5 text-xs font-bold transition disabled:opacity-50 ${
                  room.isChatMuted
                    ? 'bg-red-500/20 text-red-300 hover:bg-red-500/30'
                    : 'bg-zinc-700/30 text-zinc-400 hover:text-white'
                }`}
              >
                {room.isChatMuted ? <VolumeX className="h-3.5 w-3.5" /> : <Mic className="h-3.5 w-3.5" />}
                {room.isChatMuted ? 'Chat Muted' : 'Mute Chat'}
              </button>
            </div>
          </div>
        )}

        {/* Sync Info Banner for regular users */}
        {!isHost && (
          <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-blue-500/20 bg-blue-500/5 px-4 py-3 text-xs text-blue-300">
            <Wifi className="mt-0.5 h-3.5 w-3.5 shrink-0 animate-pulse text-blue-400" />
            <span>
              <span className="font-bold text-blue-200">Synced with host (5s buffer)</span> — Playback is synchronized with a 5-second buffer to ensure smooth playback without stuttering.
              The movie starts automatically at the scheduled time. Quality and captions can be adjusted in the player.
            </span>
          </div>
        )}

        {/* Video Player + Chat */}
        <div className="grid gap-6 lg:grid-cols-3">
          <div className="lg:col-span-2">
            {/* Wrapper with lock overlay for non-hosts & scheduled countdown overlay */}
            <div className="relative">
              <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
                <div className="aspect-video w-full">
                  {/* Scheduled Countdown Overlay */}
                  {isScheduled ? (
                    <div className="flex h-full w-full flex-col items-center justify-center bg-gradient-to-b from-purple-950/80 via-black to-zinc-950 p-6 text-center">
                      <Radio className="mb-3 h-10 w-10 animate-bounce text-purple-400" />
                      <p className="text-xs font-bold uppercase tracking-widest text-purple-300">
                        Scheduled Watch Party
                      </p>
                      <h2 className="mt-1 font-display text-2xl font-bold tracking-wide text-white">
                        {room.title}
                      </h2>
                      <p className="mt-2 text-xs text-zinc-400">
                        Get your snacks ready! The movie starts automatically for everyone.
                      </p>

                      <div className="my-6 rounded-2xl border border-purple-500/30 bg-purple-500/10 px-8 py-4 backdrop-blur">
                        <p className="text-[10px] uppercase tracking-wider text-purple-300 font-bold">
                          Starting In
                        </p>
                        <div className="mt-1 font-mono text-4xl font-extrabold text-white tracking-widest">
                          {countdownSecs != null ? formatTime(countdownSecs) : '0:00'}
                        </div>
                      </div>

                      {isHost && (
                        <button
                          type="button"
                          onClick={startPartyNow}
                          disabled={hostAction}
                          className="inline-flex items-center gap-2 rounded-xl bg-emerald-600 px-6 py-2.5 text-xs font-bold text-white shadow-lg hover:bg-emerald-500 transition disabled:opacity-50"
                        >
                          <PlayCircle className="h-4 w-4" /> Start Movie Now
                        </button>
                      )}
                    </div>
                  ) : embedUrl ? (
                    <iframe
                      key={embedKey}
                      src={embedUrl}
                      className="h-full w-full"
                      allowFullScreen
                      allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                      referrerPolicy="origin"
                      title={room.title}
                    />
                  ) : (
                    <div className="flex h-full items-center justify-center text-zinc-500">
                      Loading player…
                    </div>
                  )}
                </div>
              </div>

              {/* ── Non-host interaction lock overlay ─────────────────────────
                  Captures ALL pointer events so guests cannot alter host sync.
              ─────────────────────────────────────────────────────────────── */}
              {!isHost && !isScheduled && (
                <div
                  className="absolute inset-0 z-10 cursor-not-allowed rounded-2xl"
                  style={{ pointerEvents: 'all' }}
                  title="Playback is synced with host"
                  aria-label="Player locked — synced to host"
                />
              )}

              {/* Lock badge — bottom-left */}
              {!isHost && !isScheduled && (
                <div className="absolute bottom-3 left-3 z-20 flex items-center gap-1.5 rounded-lg bg-black/70 px-2.5 py-1.5 text-[10px] font-bold uppercase tracking-wider text-zinc-400 backdrop-blur-sm">
                  <Lock className="h-3 w-3 text-purple-400" />
                  Synced to Host
                </div>
              )}
            </div>
          </div>

          {/* Chat Panel */}
          <aside className="flex h-[520px] flex-col rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
            <div className="flex items-center gap-2 border-b border-white/10 px-4 py-3 text-sm font-semibold">
              <MessageSquare className="h-4 w-4 text-purple-400" />
              Live Chat
              {room.isChatMuted && (
                <span className="ml-auto flex items-center gap-1 text-[10px] font-bold uppercase text-red-400">
                  <VolumeX className="h-3 w-3" /> Muted
                </span>
              )}
            </div>

            <div className="flex-1 space-y-2 overflow-y-auto p-4 text-xs">
              {chatMessages.length === 0 ? (
                <p className="py-8 text-center text-zinc-500">No messages yet. Say hi to the party!</p>
              ) : (
                chatMessages.map((m) => {
                  const isMuted = room.mutedUserIds.includes(m.userId)
                  return (
                    <div key={m.id} className="group rounded-lg bg-white/5 p-2.5">
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <span className="font-bold text-purple-300">@{m.sender}:</span>{' '}
                          <span className="text-zinc-200">{m.text}</span>
                        </div>
                        {isHost && m.userId !== room.host.id && (
                          <button
                            type="button"
                            onClick={() => muteUser(m.userId, m.sender)}
                            title={isMuted ? 'Un-mute user' : 'Mute user'}
                            className="shrink-0 rounded p-0.5 opacity-0 transition group-hover:opacity-100 hover:bg-red-500/20"
                          >
                            {isMuted ? (
                              <Mic className="h-3 w-3 text-green-400" />
                            ) : (
                              <MicOff className="h-3 w-3 text-red-400" />
                            )}
                          </button>
                        )}
                      </div>
                    </div>
                  )
                })
              )}
              <div ref={chatEndRef} />
            </div>

            {/* Status banners */}
            {isMutedSelf && (
              <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-2 text-center text-xs text-red-400">
                You have been muted by the host.
              </div>
            )}
            {room.isChatMuted && !isHost && (
              <div className="border-t border-red-500/20 bg-red-500/10 px-4 py-2 text-center text-xs text-red-400">
                Chat is muted by the host.
              </div>
            )}

            <form
              onSubmit={sendChatMessage}
              className="flex gap-2 border-t border-white/10 p-3"
            >
              <input
                value={chatText}
                onChange={(e) => setChatText(e.target.value)}
                placeholder={
                  !session
                    ? 'Sign in to chat'
                    : isMutedSelf
                    ? 'You are muted'
                    : room.isChatMuted && !isHost
                    ? 'Chat is muted'
                    : 'Type a message…'
                }
                disabled={!session || sending || isMutedSelf || (room.isChatMuted && !isHost)}
                className="flex-1 rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-purple-500 disabled:opacity-40"
              />
              <button
                type="submit"
                disabled={!session || !chatText.trim() || sending || isMutedSelf || (room.isChatMuted && !isHost)}
                className="rounded-lg bg-purple-600 px-3 py-2 text-white hover:bg-purple-500 disabled:opacity-40"
              >
                <Send className="h-4 w-4" />
              </button>
            </form>
          </aside>
        </div>

        {/* Room Info Bar */}
        <div className="mt-6 flex flex-wrap items-center gap-4 rounded-xl border border-white/5 bg-zinc-950/60 px-5 py-3 text-xs text-zinc-500">
          {/* Live timestamp */}
          <span className="flex items-center gap-1.5">
            <Clock className="h-3.5 w-3.5 text-purple-400/60" />
            <span className="font-mono text-white font-bold">{formatTime(livePos)}</span>
            <span className="text-zinc-600">{isHost ? 'host position' : 'buffered position'}</span>
          </span>

          {/* Active Viewers Count */}
          <span className="flex items-center gap-1.5">
            <Users className="h-3.5 w-3.5 text-purple-400/60" />
            <span className="font-bold text-zinc-200">{room.viewerCount ?? 1}</span> watching
            {room.maxUsers ? <span className="text-zinc-600">/ max {room.maxUsers}</span> : null}
          </span>

          {/* 5s Buffer indicator for guests */}
          {!isHost && (
            <span className="flex items-center gap-1.5 text-blue-400">
              <Layers className="h-3.5 w-3.5" />
              <span>5s buffer delay</span>
            </span>
          )}

          {/* Sync status */}
          <span className="flex items-center gap-1.5">
            <Wifi className="h-3.5 w-3.5 animate-pulse text-green-500/60" />
            <span className="text-zinc-500">Live Sync</span>
          </span>

          {/* Playback state */}
          <span className="flex items-center gap-1.5">
            {isScheduled ? (
              <span className="text-purple-400 font-bold uppercase tracking-wider text-[10px]">Scheduled</span>
            ) : room.isPlaying ? (
              <><Play className="h-3.5 w-3.5 fill-green-400 text-green-400" /><span className="text-green-400 font-bold">Playing Live</span></>
            ) : (
              <><Pause className="h-3.5 w-3.5 fill-zinc-400 text-zinc-400" /><span>Paused</span></>
            )}
          </span>
        </div>
      </main>
    </div>
  )
}
