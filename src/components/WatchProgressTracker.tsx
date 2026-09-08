'use client'

import { useEffect, useRef } from 'react'
import { useSession } from 'next-auth/react'

interface WatchProgressTrackerProps {
  tmdbId: number
  title: string
  posterPath?: string | null
  mediaType: 'movie' | 'tv' | 'anime'
  seasonNumber?: number
  episodeNumber?: number
  duration?: number
  /** Called with best known resume position (seconds); may upgrade once before lock */
  onResumeTime?: (seconds: number) => void
}

const SAVE_INTERVAL_MS = 15_000
const FORCE_SAVE_INTERVAL_MS = 8_000
/** Slightly past VideoPlayer max settle so late remote can still upgrade startAt */
const RESUME_LOCK_MS = 1_600
/** Ignore tiny early ticks that would wipe a known resume position */
const RESUME_GRACE_MS = 25_000

function localKey(
  mediaType: string,
  tmdbId: number,
  seasonNumber?: number,
  episodeNumber?: number
) {
  return `sf-progress:${mediaType}:${tmdbId}:${seasonNumber ?? 0}:${episodeNumber ?? 0}`
}

function parsePlayerMessage(raw: unknown): {
  event?: string
  currentTime?: number
  duration?: number
} | null {
  let data: any = raw
  if (typeof raw === 'string') {
    try {
      data = JSON.parse(raw)
    } catch {
      return null
    }
  }
  if (!data || data.type !== 'PLAYER_EVENT') return null
  return data.data || null
}

export default function WatchProgressTracker({
  tmdbId,
  title,
  posterPath,
  mediaType,
  seasonNumber,
  episodeNumber,
  duration = 0,
  onResumeTime,
}: WatchProgressTrackerProps) {
  const { data: session } = useSession()
  const lastSaved = useRef(0)
  const inFlight = useRef(false)
  const pendingSave = useRef<{
    currentTime: number
    duration: number
    force: boolean
  } | null>(null)
  const latest = useRef({ currentTime: 0, duration: duration || 0 })
  const bestResume = useRef(0)
  const resumeLocked = useRef(false)
  const resumeFloor = useRef(0)
  const mountedAt = useRef(Date.now())
  const sessionRef = useRef(session)
  sessionRef.current = session

  const metaRef = useRef({
    tmdbId,
    title,
    posterPath,
    mediaType,
    seasonNumber,
    episodeNumber,
    duration,
  })
  metaRef.current = {
    tmdbId,
    title,
    posterPath,
    mediaType,
    seasonNumber,
    episodeNumber,
    duration,
  }

  const emitResume = (seconds: number) => {
    if (resumeLocked.current) return
    const floor = Math.floor(seconds)
    if (floor <= 15) return
    if (floor <= bestResume.current) return
    bestResume.current = floor
    resumeFloor.current = Math.max(resumeFloor.current, floor)
    onResumeTime?.(floor)
  }

  useEffect(() => {
    bestResume.current = 0
    resumeFloor.current = 0
    resumeLocked.current = false
    mountedAt.current = Date.now()
    const lockTimer = window.setTimeout(() => {
      resumeLocked.current = true
    }, RESUME_LOCK_MS)
    return () => window.clearTimeout(lockTimer)
  }, [mediaType, tmdbId, seasonNumber, episodeNumber])

  useEffect(() => {
    const key = localKey(mediaType, tmdbId, seasonNumber, episodeNumber)
    try {
      const raw = localStorage.getItem(key)
      if (!raw) return
      const parsed = JSON.parse(raw) as {
        timestamp?: number
        duration?: number
      }
      if (typeof parsed.timestamp === 'number' && parsed.timestamp > 0) {
        latest.current = {
          currentTime: Math.floor(parsed.timestamp),
          duration:
            typeof parsed.duration === 'number' && parsed.duration > 0
              ? parsed.duration
              : latest.current.duration,
        }
        emitResume(Math.floor(parsed.timestamp))
      }
    } catch {
      // ignore
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mediaType, tmdbId, seasonNumber, episodeNumber])

  // Targeted resume fetch — one row, not the full history list
  useEffect(() => {
    if (!session?.user) return

    const loadRemote = async () => {
      try {
        const params = new URLSearchParams({
          tmdbId: String(tmdbId),
          mediaType,
        })
        if (seasonNumber != null) params.set('season', String(seasonNumber))
        if (episodeNumber != null) params.set('episode', String(episodeNumber))

        const res = await fetch(`/api/watch-history/resume?${params}`)
        if (!res.ok) return
        const json = await res.json()
        const ts = json?.resume?.timestamp
        if (typeof ts === 'number' && ts > 0) {
          emitResume(Math.floor(ts))
        }
      } catch {
        // ignore
      }
    }

    void loadRemote()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, tmdbId, mediaType, seasonNumber, episodeNumber])

  const writeLocal = (
    timestamp: number,
    dur: number,
    itemTitle: string,
    poster: string | null | undefined,
    type: string,
    id: number,
    season?: number,
    episode?: number
  ) => {
    // Never clobber a real local resume with a zero/empty tick
    if (timestamp <= 0) return
    const key = localKey(type, id, season, episode)
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          timestamp,
          duration: dur,
          title: itemTitle,
          posterPath: poster,
          updatedAt: Date.now(),
        })
      )
    } catch {
      // ignore
    }
  }

  const postProgress = async (
    timestamp: number,
    dur: number,
    force: boolean,
    keepalive = false
  ) => {
    const {
      tmdbId: id,
      title: itemTitle,
      posterPath: poster,
      mediaType: type,
      seasonNumber: season,
      episodeNumber: episode,
    } = metaRef.current

    if (!sessionRef.current?.user) return

    const body = JSON.stringify({
      tmdbId: id,
      title: itemTitle,
      posterPath: poster,
      mediaType: type,
      seasonNumber: season,
      episodeNumber: episode,
      timestamp,
      duration: dur || 1,
    })

    if (keepalive && typeof navigator !== 'undefined' && 'sendBeacon' in navigator) {
      try {
        const blob = new Blob([body], { type: 'application/json' })
        if (navigator.sendBeacon('/api/watch-history', blob)) return
      } catch {
        // fall through to fetch
      }
    }

    await fetch('/api/watch-history', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body,
      keepalive,
    })
  }

  const persist = async (
    currentTime: number,
    nextDuration: number,
    force = false,
    keepalive = false
  ) => {
    const timestamp = Math.max(0, Math.floor(currentTime))
    const dur = Math.max(
      0,
      Math.floor(nextDuration || metaRef.current.duration || 0)
    )

    // Early post-resume ticks from a missed seek must not wipe a known position
    const floor = resumeFloor.current
    const age = Date.now() - mountedAt.current
    if (
      floor > 60 &&
      timestamp > 0 &&
      timestamp < floor - 45 &&
      age < RESUME_GRACE_MS
    ) {
      return
    }

    if (timestamp > 0) {
      latest.current = { currentTime: timestamp, duration: dur }
    } else if (dur > latest.current.duration) {
      latest.current = { ...latest.current, duration: dur }
    }

    const {
      tmdbId: id,
      title: itemTitle,
      posterPath: poster,
      mediaType: type,
      seasonNumber: season,
      episodeNumber: episode,
    } = metaRef.current

    writeLocal(timestamp, dur, itemTitle, poster, type, id, season, episode)

    if (!sessionRef.current?.user) return
    if (timestamp <= 0 && !force) return

    const now = Date.now()
    const minGap = force ? FORCE_SAVE_INTERVAL_MS : SAVE_INTERVAL_MS
    if (!force && now - lastSaved.current < minGap) return

    if (inFlight.current) {
      pendingSave.current = { currentTime: timestamp, duration: dur, force }
      return
    }

    lastSaved.current = now
    inFlight.current = true

    try {
      await postProgress(timestamp, dur, force, keepalive)
    } catch (error) {
      console.error('Failed to save watch progress:', error)
    } finally {
      inFlight.current = false
      const queued = pendingSave.current
      if (queued) {
        pendingSave.current = null
        void persist(queued.currentTime, queued.duration, queued.force)
      }
    }
  }

  // Ensure Continue Watching has a row without wiping resume timestamps
  useEffect(() => {
    if (!session?.user) return

    const ensureRow = async () => {
      try {
        await fetch('/api/watch-history', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            tmdbId,
            title,
            posterPath,
            mediaType,
            seasonNumber,
            episodeNumber,
            timestamp: 0,
            duration: Math.max(duration || 0, 1),
          }),
        })
      } catch {
        // ignore — server ignores zero when existing progress exists
      }
    }

    void ensureRow()
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user?.id, tmdbId, mediaType, seasonNumber, episodeNumber])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const payload = parsePlayerMessage(event.data)
      if (!payload) return
      const currentTime =
        typeof payload.currentTime === 'number' ? payload.currentTime : 0
      const nextDuration =
        typeof payload.duration === 'number' && payload.duration > 0
          ? payload.duration
          : metaRef.current.duration
      const eventName = payload.event || 'timeupdate'

      const force = eventName === 'pause' || eventName === 'ended'
      if (currentTime > 0 || force) {
        void persist(currentTime, nextDuration, force)
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  useEffect(() => {
    const flush = () => {
      const { currentTime, duration: dur } = latest.current
      if (currentTime > 0) {
        void persist(currentTime, dur, true, true)
      }
    }
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      window.removeEventListener('beforeunload', flush)
      document.removeEventListener('visibilitychange', onVisibility)
      flush()
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [])

  return null
}
