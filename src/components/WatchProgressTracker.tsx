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
  /** Called once with saved resume position (seconds) when available */
  onResumeTime?: (seconds: number) => void
}

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
  const latest = useRef({ currentTime: 0, duration: duration || 0 })
  const resumed = useRef(false)

  useEffect(() => {
    const key = localKey(mediaType, tmdbId, seasonNumber, episodeNumber)
    try {
      const raw = localStorage.getItem(key)
      if (raw) {
        const parsed = JSON.parse(raw) as {
          timestamp?: number
          duration?: number
        }
        if (
          typeof parsed.timestamp === 'number' &&
          parsed.timestamp > 15 &&
          !resumed.current
        ) {
          resumed.current = true
          onResumeTime?.(Math.floor(parsed.timestamp))
        }
      }
    } catch {
      // ignore
    }
  }, [mediaType, tmdbId, seasonNumber, episodeNumber, onResumeTime])

  useEffect(() => {
    if (!session?.user) return

    const loadRemote = async () => {
      try {
        const filter =
          mediaType === 'anime' ? 'anime' : mediaType === 'movie' || mediaType === 'tv' ? 'movies' : ''
        const res = await fetch(
          `/api/watch-history?mediaType=${filter || 'movies'}`
        )
        if (!res.ok) return
        const list = await res.json()
        if (!Array.isArray(list)) return
        const match = list.find(
          (item: any) =>
            item.tmdbId === tmdbId &&
            item.mediaType === mediaType &&
            (seasonNumber == null || item.seasonNumber === seasonNumber) &&
            (episodeNumber == null || item.episodeNumber === episodeNumber)
        )
        if (
          match &&
          typeof match.timestamp === 'number' &&
          match.timestamp > 15 &&
          !resumed.current
        ) {
          resumed.current = true
          onResumeTime?.(Math.floor(match.timestamp))
        }
      } catch {
        // ignore
      }
    }

    loadRemote()
  }, [
    session?.user,
    tmdbId,
    mediaType,
    seasonNumber,
    episodeNumber,
    onResumeTime,
  ])

  const persist = async (
    currentTime: number,
    nextDuration: number,
    force = false
  ) => {
    const timestamp = Math.max(0, Math.floor(currentTime))
    const dur = Math.max(0, Math.floor(nextDuration || duration || 0))
    latest.current = { currentTime: timestamp, duration: dur }

    const key = localKey(mediaType, tmdbId, seasonNumber, episodeNumber)
    try {
      localStorage.setItem(
        key,
        JSON.stringify({
          timestamp,
          duration: dur,
          title,
          posterPath,
          updatedAt: Date.now(),
        })
      )
    } catch {
      // ignore
    }

    if (!session?.user) return

    const now = Date.now()
    if (!force && now - lastSaved.current < 5000) return
    lastSaved.current = now

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
          timestamp,
          duration: dur || 1,
        }),
      })
    } catch (error) {
      console.error('Failed to save watch progress:', error)
    }
  }

  // Seed an initial history row so Continue Watching populates immediately
  useEffect(() => {
    if (!session?.user) return
    persist(1, duration || 1, true)
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [session?.user, tmdbId, mediaType, seasonNumber, episodeNumber])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const payload = parsePlayerMessage(event.data)
      if (!payload) return
      const currentTime =
        typeof payload.currentTime === 'number' ? payload.currentTime : 0
      const nextDuration =
        typeof payload.duration === 'number' && payload.duration > 0
          ? payload.duration
          : duration
      const eventName = payload.event || 'timeupdate'
      const force =
        eventName === 'pause' ||
        eventName === 'ended' ||
        eventName === 'seeked'
      if (currentTime > 0 || force) {
        void persist(currentTime, nextDuration, force || eventName === 'ended')
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [
    session?.user,
    tmdbId,
    title,
    posterPath,
    mediaType,
    seasonNumber,
    episodeNumber,
    duration,
  ])

  // Flush on leave
  useEffect(() => {
    const flush = () => {
      const { currentTime, duration: dur } = latest.current
      if (currentTime > 0) {
        void persist(currentTime, dur, true)
      }
    }
    window.addEventListener('beforeunload', flush)
    document.addEventListener('visibilitychange', () => {
      if (document.visibilityState === 'hidden') flush()
    })
    return () => {
      window.removeEventListener('beforeunload', flush)
      flush()
    }
  }, [])

  return null
}
