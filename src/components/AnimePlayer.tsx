'use client'

import { useCallback, useEffect, useRef, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Info, Play, Settings2 } from 'lucide-react'
import { getAnimeEmbedUrl, type AnimeLang } from '@/lib/embeds'
import { defaultEmbedLang } from '@/lib/anime-language'
import { useAnimeLanguageOptional } from '@/components/anime/AnimeLanguageContext'
import { getImageUrl } from '@/lib/tmdb/images'
import {
  getPlayerSettings,
  setInfoEnabled,
  setStillWatchingEnabled,
  setStillWatchingEpisodes,
  incrementBingeCount,
  resetBingeCount,
  type PlayerSettings,
} from '@/lib/player-settings'
import { playSound } from '@/lib/sound'

interface AnimePlayerProps {
  anilistId: string | number
  episode: string | number
  title: string
  overview?: string | null
  posterPath?: string | null
  startAt?: number
  nextHref?: string
  onProgress?: (payload: {
    currentTime: number
    duration: number
    paused: boolean
  }) => void
}

const IDLE_MS = 20_000

export default function AnimePlayer({
  anilistId,
  episode,
  title,
  overview,
  posterPath,
  startAt = 0,
  nextHref,
  onProgress,
}: AnimePlayerProps) {
  const router = useRouter()
  const langCtx = useAnimeLanguageOptional()
  const preferred = langCtx?.language ?? 'en'
  const [lang, setLang] = useState<AnimeLang>(() => defaultEmbedLang(preferred))
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const lastSent = useRef(0)
  const syncedPref = useRef<string | null>(null)
  const endHandledRef = useRef(false)
  const nearEndSinceRef = useRef<number | null>(null)
  const mountAtRef = useRef(Date.now())
  const idleTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const countdownRef = useRef<ReturnType<typeof setTimeout> | null>(null)
  const startAtRef = useRef(startAt)
  startAtRef.current = startAt
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const urlBuiltRef = useRef(false)

  const mediaKey = `anime-${anilistId}-${episode}-${lang}`

  const [settings, setSettings] = useState<PlayerSettings>(() => ({
    infoEnabled: true,
    stillWatchingEnabled: true,
    stillWatchingEpisodes: 2,
  }))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showInfoOverlay, setShowInfoOverlay] = useState(true)
  const [idleInfo, setIdleInfo] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [autoPlayCountdown, setAutoPlayCountdown] = useState<number | null>(null)
  const [stillWatchingPrompt, setStillWatchingPrompt] = useState(false)

  useEffect(() => {
    const s = getPlayerSettings()
    setSettings(s)
    if (s.infoEnabled) {
      setShowInfoOverlay(true)
      const t = setTimeout(() => setShowInfoOverlay(false), 6000)
      return () => clearTimeout(t)
    }
    setShowInfoOverlay(false)
  }, [])

  useEffect(() => {
    endHandledRef.current = false
    nearEndSinceRef.current = null
    setStillWatchingPrompt(false)
    setAutoPlayCountdown(null)
  }, [anilistId, episode])

  useEffect(() => {
    if (!langCtx?.ready) return
    if (syncedPref.current === preferred) return
    syncedPref.current = preferred
    setLang(defaultEmbedLang(preferred))
  }, [preferred, langCtx?.ready])

  /**
   * Wait for resume to settle, then mount iframe once with startAt.
   * Avoids progress URL + late postMessage seek fighting the scrubber.
   */
  useEffect(() => {
    setEmbedUrl(null)
    urlBuiltRef.current = false
    mountAtRef.current = Date.now()
    nearEndSinceRef.current = null
    endHandledRef.current = false

    let cancelled = false

    const commit = () => {
      if (cancelled || urlBuiltRef.current) return
      urlBuiltRef.current = true
      const progress =
        startAtRef.current > 15 ? Math.floor(startAtRef.current) : undefined
      setEmbedUrl(
        getAnimeEmbedUrl(anilistId, episode, lang, {
          autoplay: true,
          autoSkip: true,
          autoNext: false,
          startAt: progress,
        })
      )
    }

    const minTimer = window.setTimeout(() => {
      if (startAtRef.current > 15) commit()
    }, 400)
    const maxTimer = window.setTimeout(commit, 1500)

    return () => {
      cancelled = true
      window.clearTimeout(minTimer)
      window.clearTimeout(maxTimer)
    }
  }, [anilistId, episode, lang])

  // Resume after min window → mount once. Never postMessage-seek for resume.
  useEffect(() => {
    const seconds = Math.floor(startAt)
    if (seconds <= 15 || urlBuiltRef.current) return
    if (Date.now() - mountAtRef.current < 400) return
    urlBuiltRef.current = true
    setEmbedUrl(
      getAnimeEmbedUrl(anilistId, episode, lang, {
        autoplay: true,
        autoSkip: true,
        autoNext: false,
        startAt: seconds,
      })
    )
  }, [startAt, anilistId, episode, lang])

  const clearIdleTimer = useCallback(() => {
    if (idleTimerRef.current) {
      clearTimeout(idleTimerRef.current)
      idleTimerRef.current = null
    }
  }, [])

  const dismissIdleInfo = useCallback(() => {
    clearIdleTimer()
    setIdleInfo(false)
  }, [clearIdleTimer])

  const armIdleTimer = useCallback(() => {
    clearIdleTimer()
    if (!isPaused || !settings.infoEnabled) return
    idleTimerRef.current = setTimeout(() => setIdleInfo(true), IDLE_MS)
  }, [clearIdleTimer, isPaused, settings.infoEnabled])

  useEffect(() => {
    if (isPaused) armIdleTimer()
    else dismissIdleInfo()
    return clearIdleTimer
  }, [isPaused, armIdleTimer, dismissIdleInfo, clearIdleTimer])

  useEffect(() => {
    const onActivity = () => {
      if (idleInfo) dismissIdleInfo()
      else if (isPaused) armIdleTimer()
    }
    const events: Array<keyof WindowEventMap> = [
      'mousemove',
      'mousedown',
      'keydown',
      'touchstart',
      'scroll',
      'focus',
    ]
    for (const ev of events) window.addEventListener(ev, onActivity, { passive: true })
    return () => {
      for (const ev of events) window.removeEventListener(ev, onActivity)
    }
  }, [idleInfo, isPaused, dismissIdleInfo, armIdleTimer])

  const triggerNext = useCallback(() => {
    if (!nextHref || endHandledRef.current) return
    endHandledRef.current = true

    if (settings.stillWatchingEnabled) {
      const binge = incrementBingeCount('anime', anilistId)
      if (binge >= settings.stillWatchingEpisodes) {
        setStillWatchingPrompt(true)
        return
      }
    }
    setAutoPlayCountdown(5)
  }, [nextHref, settings, anilistId])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      if (
        iframeRef.current?.contentWindow &&
        event.source &&
        event.source !== iframeRef.current.contentWindow
      ) {
        return
      }

      const data = event.data
      if (!data || data.type !== 'PLAYER_EVENT') return
      const payload = data.data
      if (!payload || typeof payload.currentTime !== 'number') return

      if (payload.event === 'pause' || payload.paused === true) setIsPaused(true)
      if (payload.event === 'play' || payload.paused === false) {
        setIsPaused(false)
        dismissIdleInfo()
      }

      const now = Date.now()
      if (now - lastSent.current < 2000 && payload.event === 'timeupdate') return
      lastSent.current = now

      onProgress?.({
        currentTime: payload.currentTime,
        duration: payload.duration || 0,
        paused: !!payload.paused,
      })

      if (!nextHref || endHandledRef.current) return

      const mountedFor = Date.now() - mountAtRef.current
      if (mountedFor < 20_000) {
        nearEndSinceRef.current = null
        return
      }

      const explicitEnd = payload.event === 'ended'
      const nearEnd =
        typeof payload.duration === 'number' &&
        payload.duration > 60 &&
        payload.currentTime > 60 &&
        payload.currentTime >= payload.duration - 5

      if (explicitEnd) {
        triggerNext()
        return
      }

      if (nearEnd) {
        if (nearEndSinceRef.current == null) {
          nearEndSinceRef.current = Date.now()
        } else if (Date.now() - nearEndSinceRef.current >= 3000) {
          triggerNext()
        }
      } else {
        nearEndSinceRef.current = null
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onProgress, nextHref, triggerNext, dismissIdleInfo])

  useEffect(() => {
    if (autoPlayCountdown === null) return
    if (autoPlayCountdown <= 0) {
      if (nextHref) {
        playSound.chime()
        router.push(nextHref)
      }
      setAutoPlayCountdown(null)
      return
    }
    countdownRef.current = setTimeout(() => {
      setAutoPlayCountdown((p) => (p !== null ? p - 1 : null))
    }, 1000)
    return () => {
      if (countdownRef.current) clearTimeout(countdownRef.current)
    }
  }, [autoPlayCountdown, nextHref, router])

  const infoVisible =
    idleInfo ||
    (settings.infoEnabled &&
      showInfoOverlay &&
      !stillWatchingPrompt &&
      autoPlayCountdown === null)

  const posterUrl = posterPath
    ? posterPath.startsWith('http')
      ? posterPath
      : getImageUrl(posterPath, 'w500')
    : null

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div className="flex flex-wrap items-center gap-2">
          <div className="inline-flex rounded-lg border border-fuchsia-400/20 bg-white/5 p-1">
            {(['sub', 'dub'] as AnimeLang[]).map((option) => (
              <button
                key={option}
                type="button"
                onClick={() => setLang(option)}
                className={`rounded-md px-3 py-1.5 text-sm font-semibold uppercase transition ${
                  lang === option
                    ? 'bg-gradient-to-r from-fuchsia-500 to-cyan-400 text-black'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                {option}
              </button>
            ))}
          </div>

          <button
            type="button"
            onClick={() => {
              const next = !settings.infoEnabled
              setInfoEnabled(next)
              setSettings((s) => ({ ...s, infoEnabled: next }))
              if (next) {
                setShowInfoOverlay(true)
                setTimeout(() => setShowInfoOverlay(false), 6000)
              } else {
                setShowInfoOverlay(false)
                setIdleInfo(false)
              }
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition ${
              settings.infoEnabled
                ? 'border-cyan-400/40 bg-cyan-400/10 text-cyan-200'
                : 'border-white/10 bg-white/5 text-zinc-400'
            }`}
          >
            <Info className="h-3.5 w-3.5" />
            Info
          </button>

          <div className="relative">
            <button
              type="button"
              onClick={() => setSettingsOpen((o) => !o)}
              className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 text-xs transition ${
                settings.stillWatchingEnabled
                  ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                  : 'border-white/10 bg-white/5 text-zinc-400'
              }`}
            >
              <Settings2 className="h-3.5 w-3.5" />
              Still watching
            </button>
            {settingsOpen && (
              <div className="absolute left-0 top-full z-40 mt-2 w-64 rounded-xl border border-fuchsia-400/20 bg-zinc-950 p-3 shadow-2xl">
                <label className="flex items-center justify-between gap-3 text-xs text-zinc-300">
                  <span>Ask if still watching</span>
                  <input
                    type="checkbox"
                    checked={settings.stillWatchingEnabled}
                    onChange={(e) => {
                      const on = e.target.checked
                      setStillWatchingEnabled(on)
                      setSettings((s) => ({ ...s, stillWatchingEnabled: on }))
                    }}
                    className="h-4 w-4 accent-fuchsia-500"
                  />
                </label>
                <label className="mt-3 block text-xs text-zinc-400">
                  After how many episodes?
                  <select
                    value={settings.stillWatchingEpisodes}
                    disabled={!settings.stillWatchingEnabled}
                    onChange={(e) => {
                      const n = parseInt(e.target.value, 10)
                      setStillWatchingEpisodes(n)
                      setSettings((s) => ({ ...s, stillWatchingEpisodes: n }))
                    }}
                    className="mt-1.5 w-full rounded-lg border border-white/10 bg-black/60 px-2 py-1.5 text-sm text-white disabled:opacity-40"
                  >
                    {Array.from({ length: 10 }, (_, i) => i + 1).map((n) => (
                      <option key={n} value={n}>
                        {n} episode{n === 1 ? '' : 's'}
                      </option>
                    ))}
                  </select>
                </label>
              </div>
            )}
          </div>
        </div>
        <p className="text-xs text-zinc-500">
          TryEmbed · AniList #{anilistId} · default{' '}
          {defaultEmbedLang(preferred).toUpperCase()} for your language
        </p>
      </div>

      <div className="relative overflow-hidden rounded-2xl border border-fuchsia-400/20 bg-black shadow-[0_24px_80px_rgba(192,38,211,0.25)]">
        <div className="aspect-video w-full">
          {embedUrl ? (
            <iframe
              key={mediaKey}
              ref={iframeRef}
              src={embedUrl}
              className="h-full w-full"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="origin"
              title={title}
            />
          ) : (
            <div className="flex h-full w-full items-center justify-center bg-black">
              <div className="h-8 w-8 animate-pulse rounded-full bg-fuchsia-500" />
            </div>
          )}
        </div>

        {infoVisible && (
          <div className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black via-black/55 to-transparent">
            <div className="absolute bottom-0 left-0 right-0 flex items-end gap-4 p-5 md:p-7">
              {posterUrl && (
                <img
                  src={posterUrl}
                  alt=""
                  className="hidden h-28 w-[4.5rem] shrink-0 rounded-md object-cover sm:block"
                />
              )}
              <div className="min-w-0 flex-1">
                <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                  {idleInfo ? 'Paused' : 'Now playing'}
                </p>
                <h3 className="mt-1 font-[family-name:var(--font-anime-display)] text-2xl text-white">
                  {title}
                </h3>
                <p className="mt-1 text-sm text-zinc-300">Episode {episode}</p>
                {overview && (
                  <p className="mt-2 line-clamp-3 max-w-2xl text-sm text-zinc-400">
                    {overview}
                  </p>
                )}
              </div>
            </div>
          </div>
        )}

        {stillWatchingPrompt && nextHref && (
          <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-md">
            <div className="max-w-sm rounded-2xl border border-fuchsia-400/20 bg-zinc-950 p-6 text-center">
              <p className="font-[family-name:var(--font-anime-display)] text-2xl text-white">
                Are you still watching?
              </p>
              <p className="mt-2 text-sm text-zinc-400">
                You&apos;ve finished {settings.stillWatchingEpisodes} episode
                {settings.stillWatchingEpisodes === 1 ? '' : 's'} in a row.
              </p>
              <div className="mt-5 flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setStillWatchingPrompt(false)}
                  className="rounded-lg border border-white/10 px-4 py-2 text-xs text-zinc-300"
                >
                  Stop
                </button>
                <button
                  type="button"
                  onClick={() => {
                    playSound.chime()
                    resetBingeCount('anime', anilistId)
                    router.push(nextHref)
                  }}
                  className="inline-flex items-center gap-1.5 rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-4 py-2 text-xs font-bold text-black"
                >
                  <Play className="h-3.5 w-3.5 fill-black" />
                  Continue
                </button>
              </div>
            </div>
          </div>
        )}

        {autoPlayCountdown !== null && nextHref && !stillWatchingPrompt && (
          <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 backdrop-blur-md">
            <div className="rounded-2xl border border-fuchsia-400/20 bg-zinc-950 p-6 text-center">
              <p className="text-xs uppercase text-zinc-400">Up Next</p>
              <div className="my-4 text-3xl font-bold text-white">
                {autoPlayCountdown}
              </div>
              <div className="flex justify-center gap-3">
                <button
                  type="button"
                  onClick={() => setAutoPlayCountdown(null)}
                  className="rounded-lg border border-white/10 px-4 py-2 text-xs text-zinc-300"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={() => router.push(nextHref)}
                  className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-4 py-2 text-xs font-bold text-black"
                >
                  Play Now
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}
