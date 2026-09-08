'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import {
  FastForward,
  Info,
  Maximize2,
  Minimize2,
  Play,
  Settings2,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { getMovieEmbedUrl, getTVEmbedUrl } from '@/lib/embeds'
import StreamReportButton from './StreamReportButton'
import { playSound, isSoundEnabled, setSoundEnabled } from '@/lib/sound'
import {
  getPlayerSettings,
  setInfoEnabled,
  setStillWatchingEnabled,
  setStillWatchingEpisodes,
  incrementBingeCount,
  resetBingeCount,
  type PlayerSettings,
} from '@/lib/player-settings'
import { getImageUrl } from '@/lib/tmdb/images'

type MovieProps = {
  mediaType: 'movie'
  tmdbId: string | number
  title: string
  overview?: string | null
  posterPath?: string | null
  startAt?: number
  nextHref?: string
}

type TVProps = {
  mediaType: 'tv' | 'anime'
  tmdbId: string | number
  title: string
  overview?: string | null
  posterPath?: string | null
  episodeTitle?: string | null
  season?: string | number
  episode?: string | number
  startAt?: number
  nextHref?: string
}

type VideoPlayerProps = MovieProps | TVProps

const IDLE_MS = 20_000

export default function VideoPlayer(props: VideoPlayerProps) {
  const router = useRouter()
  const [theaterMode, setTheaterMode] = useState(false)
  const [ambientGlow, setAmbientGlow] = useState(true)
  const [soundActive, setSoundActive] = useState(true)
  const [settings, setSettings] = useState<PlayerSettings>(() => ({
    infoEnabled: true,
    stillWatchingEnabled: true,
    stillWatchingEpisodes: 2,
  }))
  const [settingsOpen, setSettingsOpen] = useState(false)
  const [showInfoOverlay, setShowInfoOverlay] = useState(true)
  const [idleInfo, setIdleInfo] = useState(false)
  const [isPaused, setIsPaused] = useState(false)
  const [showSkipIntro, setShowSkipIntro] = useState(false)
  const [skipIntroDuration, setSkipIntroDuration] = useState(0)
  const [introVisible, setIntroVisible] = useState(false)
  const [autoPlayCountdown, setAutoPlayCountdown] = useState<number | null>(null)
  const [stillWatchingPrompt, setStillWatchingPrompt] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const introTimerRef = useRef<NodeJS.Timeout | null>(null)
  const idleTimerRef = useRef<NodeJS.Timeout | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const currentTimeRef = useRef<number>(0)
  const endHandledRef = useRef(false)
  const nearEndSinceRef = useRef<number | null>(null)
  const mountAtRef = useRef(Date.now())
  const startAtRef = useRef(props.startAt || 0)
  startAtRef.current = props.startAt || 0
  const [embedUrl, setEmbedUrl] = useState<string | null>(null)
  const urlBuiltRef = useRef(false)
  /** Movies: one-shot resume seek (URL progress= locks Vidking movie scrubber) */
  const movieResumeSeekDoneRef = useRef(false)

  const seasonKey =
    props.mediaType === 'movie' ? 0 : Number((props as TVProps).season || 1)
  const episodeKey =
    props.mediaType === 'movie' ? 0 : Number((props as TVProps).episode || 1)
  const mediaKey = `${props.mediaType}-${props.tmdbId}-${seasonKey}-${episodeKey}`

  useEffect(() => {
    setSoundActive(isSoundEnabled())
    const s = getPlayerSettings()
    setSettings(s)
    // Info preference defaults ON: show briefly at start, then fade
    if (s.infoEnabled) {
      setShowInfoOverlay(true)
      const t = setTimeout(() => setShowInfoOverlay(false), 6000)
      return () => clearTimeout(t)
    }
    setShowInfoOverlay(false)
  }, [])

  const buildEmbedUrl = useCallback(
    (progressSeconds: number) => {
      // Movies: never bake progress into the iframe URL — Vidking's movie player
      // often locks/scrubs-fight when ?progress= is set. Resume via postMessage.
      if (props.mediaType === 'movie') {
        return getMovieEmbedUrl(props.tmdbId)
      }
      const progress =
        progressSeconds > 15 ? Math.floor(progressSeconds) : undefined
      return getTVEmbedUrl(
        props.tmdbId,
        (props as TVProps).season || 1,
        (props as TVProps).episode || 1,
        { progress }
      )
    },
    // mediaKey fields only — must not rebuild when startAt changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [mediaKey]
  )

  const seekMovieResume = useCallback((seconds: number) => {
    if (props.mediaType !== 'movie') return
    if (movieResumeSeekDoneRef.current) return
    if (seconds <= 15) return
    movieResumeSeekDoneRef.current = true
    try {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'PLAYER_COMMAND',
          data: { command: 'seek', time: Math.floor(seconds) },
        },
        '*'
      )
    } catch {
      // ignore
    }
  }, [props.mediaType])

  /**
   * Mount embed once per title.
   * Movies: immediate clean URL (no progress=).
   * TV: short settle wait, then URL with progress=.
   */
  useEffect(() => {
    setEmbedUrl(null)
    urlBuiltRef.current = false
    movieResumeSeekDoneRef.current = false
    mountAtRef.current = Date.now()
    nearEndSinceRef.current = null
    endHandledRef.current = false

    let cancelled = false

    const commit = () => {
      if (cancelled || urlBuiltRef.current) return
      urlBuiltRef.current = true
      setEmbedUrl(buildEmbedUrl(startAtRef.current))
    }

    if (props.mediaType === 'movie') {
      // Movies resume via postMessage after play — no need to delay mount.
      commit()
      return () => {
        cancelled = true
      }
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
  }, [mediaKey, buildEmbedUrl, props.mediaType])

  // TV only: if resume arrives after min window but before commit, mount once.
  useEffect(() => {
    if (props.mediaType === 'movie') return
    const seconds = Math.floor(props.startAt || 0)
    if (seconds <= 15 || urlBuiltRef.current) return
    if (Date.now() - mountAtRef.current < 400) return
    urlBuiltRef.current = true
    setEmbedUrl(buildEmbedUrl(seconds))
  }, [props.startAt, buildEmbedUrl, props.mediaType])

  // Fetch intro info for TV shows only
  useEffect(() => {
    setShowSkipIntro(false)
    setIntroVisible(false)
    setSkipIntroDuration(0)
    endHandledRef.current = false
    setStillWatchingPrompt(false)
    setAutoPlayCountdown(null)
    if (props.mediaType === 'movie') return

    const season = (props as TVProps).season || 1
    const episode = (props as TVProps).episode || 1

    fetch(
      `/api/intro?tmdbId=${props.tmdbId}&season=${season}&episode=${episode}&mediaType=${props.mediaType}`
    )
      .then((r) => r.json())
      .then((data) => {
        if (data.hasIntro && data.duration > 0) {
          setSkipIntroDuration(data.duration)
          setShowSkipIntro(true)
          setIntroVisible(true)
          introTimerRef.current = setTimeout(() => {
            setIntroVisible(false)
          }, 10000)
        }
      })
      .catch(() => {})

    return () => {
      if (introTimerRef.current) clearTimeout(introTimerRef.current)
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [props.tmdbId, (props as TVProps).season, (props as TVProps).episode, props.mediaType])

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
    idleTimerRef.current = setTimeout(() => {
      setIdleInfo(true)
    }, IDLE_MS)
  }, [clearIdleTimer, isPaused, settings.infoEnabled])

  // Idle-while-paused → show info; any interaction dismisses it
  useEffect(() => {
    if (isPaused) {
      armIdleTimer()
    } else {
      dismissIdleInfo()
    }
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

  const handleSkipIntro = () => {
    playSound.click()
    setShowSkipIntro(false)
    setIntroVisible(false)
    if (introTimerRef.current) clearTimeout(introTimerRef.current)
    const seekTo = (currentTimeRef.current || 0) + skipIntroDuration
    try {
      iframeRef.current?.contentWindow?.postMessage(
        { type: 'PLAYER_COMMAND', data: { command: 'seek', time: seekTo } },
        '*'
      )
    } catch {
      // ignore
    }
  }

  const triggerNextEpisodeFlow = useCallback(() => {
    if (!props.nextHref || endHandledRef.current) return
    endHandledRef.current = true

    const isSeries = props.mediaType === 'tv' || props.mediaType === 'anime'
    if (isSeries && settings.stillWatchingEnabled) {
      const binge = incrementBingeCount(props.mediaType, props.tmdbId)
      if (binge >= settings.stillWatchingEpisodes) {
        setStillWatchingPrompt(true)
        try {
          iframeRef.current?.contentWindow?.postMessage(
            { type: 'PLAYER_COMMAND', data: { command: 'pause' } },
            '*'
          )
        } catch {
          // ignore
        }
        return
      }
    }

    setAutoPlayCountdown(5)
  }, [props.nextHref, props.mediaType, props.tmdbId, settings])

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      // Ignore messages from other frames/windows (ads, extensions, stale iframes)
      if (
        iframeRef.current?.contentWindow &&
        event.source &&
        event.source !== iframeRef.current.contentWindow
      ) {
        return
      }

      let data: any = event.data
      if (typeof data === 'string') {
        try {
          data = JSON.parse(data)
        } catch {
          return
        }
      }
      if (!data || data.type !== 'PLAYER_EVENT') return
      const payload = data.data
      if (!payload) return

      if (typeof payload.currentTime === 'number') {
        currentTimeRef.current = payload.currentTime
      }

      if (payload.event === 'pause' || payload.paused === true) {
        setIsPaused(true)
      }
      if (payload.event === 'play' || payload.paused === false) {
        setIsPaused(false)
        dismissIdleInfo()
      }

      // Movie resume: seek once after the player is actually alive.
      // Skipping ?progress= in the URL avoids Vidking's movie scrubber lock.
      if (
        props.mediaType === 'movie' &&
        !movieResumeSeekDoneRef.current &&
        startAtRef.current > 15
      ) {
        const eventName = payload.event || ''
        const ready =
          eventName === 'play' ||
          eventName === 'timeupdate' ||
          eventName === 'loaded' ||
          eventName === 'ready'
        if (ready) {
          const at =
            typeof payload.currentTime === 'number' ? payload.currentTime : 0
          // Already near the resume point (or user scrubbed) — don't yank them.
          if (at < startAtRef.current - 20) {
            seekMovieResume(startAtRef.current)
          } else {
            movieResumeSeekDoneRef.current = true
          }
        }
      }

      if (!props.nextHref || endHandledRef.current) return

      // Grace period: embeds often emit bogus near-end timestamps on load
      const mountedFor = Date.now() - mountAtRef.current
      if (mountedFor < 20_000) {
        nearEndSinceRef.current = null
        return
      }

      const explicitEnd = payload.event === 'ended'
      const nearEnd =
        typeof payload.currentTime === 'number' &&
        typeof payload.duration === 'number' &&
        payload.duration > 60 &&
        payload.currentTime > 60 &&
        payload.currentTime >= payload.duration - 5

      if (explicitEnd) {
        triggerNextEpisodeFlow()
        return
      }

      // Require near-end to hold for 3s so one bad timeupdate can't skip episodes
      if (nearEnd) {
        if (nearEndSinceRef.current == null) {
          nearEndSinceRef.current = Date.now()
        } else if (Date.now() - nearEndSinceRef.current >= 3000) {
          triggerNextEpisodeFlow()
        }
      } else {
        nearEndSinceRef.current = null
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [
    props.nextHref,
    props.mediaType,
    triggerNextEpisodeFlow,
    dismissIdleInfo,
    seekMovieResume,
  ])

  // Late movie resume (remote arrived after mount): one seek if still near start.
  useEffect(() => {
    if (props.mediaType !== 'movie') return
    const seconds = Math.floor(props.startAt || 0)
    if (seconds <= 15 || movieResumeSeekDoneRef.current) return
    if (Date.now() - mountAtRef.current > 8_000) return

    const t = window.setTimeout(() => {
      if (movieResumeSeekDoneRef.current) return
      const at = currentTimeRef.current
      if (at >= seconds - 20) {
        movieResumeSeekDoneRef.current = true
        return
      }
      // Only yank if playback clearly started near zero (missed the play-handler race).
      if (at > 2 && at < 45) {
        seekMovieResume(seconds)
      }
    }, 1200)

    return () => window.clearTimeout(t)
  }, [props.startAt, props.mediaType, seekMovieResume])

  useEffect(() => {
    if (autoPlayCountdown === null) return
    if (autoPlayCountdown <= 0) {
      if (props.nextHref) {
        playSound.chime()
        router.push(props.nextHref)
      }
      setAutoPlayCountdown(null)
      return
    }

    timerRef.current = setTimeout(() => {
      setAutoPlayCountdown((prev) => (prev !== null ? prev - 1 : null))
    }, 1000)

    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [autoPlayCountdown, props.nextHref, router])

  const toggleTheaterMode = () => {
    playSound.click()
    setTheaterMode((prev) => !prev)
  }

  const toggleSoundPref = () => {
    const next = !soundActive
    setSoundActive(next)
    setSoundEnabled(next)
    if (next) playSound.click()
  }

  const toggleInfo = () => {
    playSound.click()
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
  }

  const infoVisible =
    idleInfo ||
    (settings.infoEnabled &&
      showInfoOverlay &&
      !stillWatchingPrompt &&
      autoPlayCountdown === null)

  const posterUrl = props.posterPath
    ? props.posterPath.startsWith('http')
      ? props.posterPath
      : getImageUrl(props.posterPath, 'w500')
    : null

  const episodeLabel =
    props.mediaType !== 'movie' && (props as TVProps).season != null
      ? `S${(props as TVProps).season} · E${(props as TVProps).episode}`
      : null

  return (
    <div className={`relative transition-all duration-500 ${theaterMode ? 'z-[100]' : ''}`}>
      {theaterMode && (
        <div
          onClick={toggleTheaterMode}
          className="fixed inset-0 z-[-1] bg-black/90 backdrop-blur-md transition-opacity duration-500"
          aria-label="Exit Theater Mode"
        />
      )}

      <div className="mb-2.5 flex items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={toggleTheaterMode}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 transition ${
              theaterMode
                ? 'border-[var(--primary)] bg-[var(--primary)]/20 text-white'
                : 'border-white/10 bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            {theaterMode ? <Minimize2 className="h-3.5 w-3.5" /> : <Maximize2 className="h-3.5 w-3.5" />}
            {theaterMode ? 'Exit Theater' : 'Theater Mode'}
          </button>

          <button
            type="button"
            onClick={() => {
              playSound.hover()
              setAmbientGlow((prev) => !prev)
            }}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 transition ${
              ambientGlow
                ? 'border-purple-500/40 bg-purple-500/10 text-purple-300'
                : 'border-white/10 bg-white/5 text-zinc-400'
            }`}
            title="Toggle backlight glow"
          >
            <Sparkles className="h-3.5 w-3.5" />
            Ambient Glow
          </button>

          <button
            type="button"
            onClick={toggleInfo}
            className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 transition ${
              settings.infoEnabled
                ? 'border-sky-500/40 bg-sky-500/10 text-sky-300'
                : 'border-white/10 bg-white/5 text-zinc-400'
            }`}
            title="Toggle title info overlay"
          >
            <Info className="h-3.5 w-3.5" />
            Info
          </button>

          <button
            type="button"
            onClick={toggleSoundPref}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-zinc-400 hover:text-white"
            title="Toggle UI Sounds"
          >
            {soundActive ? (
              <Volume2 className="h-3.5 w-3.5 text-emerald-400" />
            ) : (
              <VolumeX className="h-3.5 w-3.5 text-zinc-500" />
            )}
          </button>

          {(props.mediaType === 'tv' || props.mediaType === 'anime') && (
            <div className="relative">
              <button
                type="button"
                onClick={() => {
                  playSound.click()
                  setSettingsOpen((o) => !o)
                }}
                className={`inline-flex items-center gap-1.5 rounded-lg border px-2.5 py-1 transition ${
                  settings.stillWatchingEnabled
                    ? 'border-amber-500/40 bg-amber-500/10 text-amber-200'
                    : 'border-white/10 bg-white/5 text-zinc-400'
                }`}
                title="Still watching settings"
              >
                <Settings2 className="h-3.5 w-3.5" />
                Still watching
              </button>
              {settingsOpen && (
                <div className="absolute left-0 top-full z-40 mt-2 w-64 rounded-xl border border-white/10 bg-zinc-950 p-3 shadow-2xl">
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
                      className="h-4 w-4 accent-[var(--primary)]"
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
                  <p className="mt-2 text-[10px] leading-relaxed text-zinc-500">
                    Default: on, after 2 episodes of this series in a row.
                  </p>
                </div>
              )}
            </div>
          )}
        </div>

        <div className="flex items-center gap-2">
          <StreamReportButton
            tmdbId={Number(props.tmdbId)}
            mediaType={props.mediaType}
            seasonNumber={
              props.mediaType !== 'movie'
                ? Number((props as TVProps).season || 1)
                : undefined
            }
            episodeNumber={
              props.mediaType !== 'movie'
                ? Number((props as TVProps).episode || 1)
                : undefined
            }
            title={props.title}
          />
        </div>
      </div>

      <div className="relative">
        {ambientGlow && (
          <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-r from-red-600/30 via-purple-600/30 to-sky-600/30 opacity-65 blur-2xl transition-opacity duration-700" />
        )}

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
          <div className="aspect-video w-full">
            {embedUrl ? (
              <iframe
                ref={iframeRef}
                key={mediaKey}
                src={embedUrl}
                className="h-full w-full"
                allowFullScreen
                allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
                referrerPolicy="origin"
                title={props.title}
              />
            ) : (
              <div className="flex h-full w-full items-center justify-center bg-black">
                <div className="h-8 w-8 animate-pulse rounded-full bg-[var(--primary)]" />
              </div>
            )}
          </div>

          {/* Info overlay — preference ON by default; also after 20s idle while paused */}
          {infoVisible && (
            <div
              className="pointer-events-none absolute inset-0 z-20 bg-gradient-to-t from-black via-black/55 to-transparent"
              aria-hidden={!infoVisible}
            >
              <div className="absolute bottom-0 left-0 right-0 flex items-end gap-4 p-5 md:p-7">
                {posterUrl && (
                  <img
                    src={posterUrl}
                    alt=""
                    className="hidden h-28 w-[4.5rem] shrink-0 rounded-md object-cover shadow-lg sm:block md:h-36 md:w-24"
                  />
                )}
                <div className="min-w-0 flex-1 pb-1">
                  <p className="text-[10px] font-semibold uppercase tracking-[0.2em] text-zinc-400">
                    {idleInfo ? 'Paused' : 'Now playing'}
                  </p>
                  <h3 className="mt-1 font-display text-2xl tracking-wide text-white md:text-3xl">
                    {props.title}
                  </h3>
                  {episodeLabel && (
                    <p className="mt-1 text-sm text-zinc-300">
                      {episodeLabel}
                      {(props as TVProps).episodeTitle
                        ? ` — ${(props as TVProps).episodeTitle}`
                        : ''}
                    </p>
                  )}
                  {props.overview && (
                    <p className="mt-2 line-clamp-3 max-w-2xl text-sm leading-relaxed text-zinc-400">
                      {props.overview}
                    </p>
                  )}
                </div>
              </div>
            </div>
          )}

          {showSkipIntro && (
            <div
              className={`absolute bottom-12 right-6 z-30 transition-opacity duration-700 ${
                introVisible ? 'opacity-100' : 'pointer-events-none opacity-0'
              }`}
            >
              <button
                type="button"
                onClick={handleSkipIntro}
                className="group inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black/80 px-4 py-2 text-xs font-bold text-white shadow-2xl backdrop-blur transition hover:scale-105 hover:border-[var(--primary)] hover:bg-black"
              >
                <FastForward className="h-4 w-4 text-[var(--primary)] group-hover:animate-pulse" />
                Skip Intro
              </button>
            </div>
          )}

          {stillWatchingPrompt && props.nextHref && (
            <div className="absolute inset-0 z-40 flex items-center justify-center bg-black/90 backdrop-blur-md">
              <div className="max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-6 text-center shadow-2xl">
                <p className="text-xs uppercase tracking-wider text-zinc-400">
                  Binge check
                </p>
                <p className="mt-2 font-display text-2xl text-white">
                  Are you still watching?
                </p>
                <p className="mt-2 text-sm text-zinc-400">
                  You&apos;ve finished {settings.stillWatchingEpisodes} episode
                  {settings.stillWatchingEpisodes === 1 ? '' : 's'} in a row.
                </p>
                <div className="mt-5 flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setStillWatchingPrompt(false)
                      endHandledRef.current = true
                    }}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white"
                  >
                    Stop
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSound.chime()
                      resetBingeCount(props.mediaType, props.tmdbId)
                      setStillWatchingPrompt(false)
                      router.push(props.nextHref!)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white hover:brightness-110"
                  >
                    <Play className="h-3.5 w-3.5 fill-white" />
                    Continue watching
                  </button>
                </div>
              </div>
            </div>
          )}

          {autoPlayCountdown !== null && props.nextHref && !stillWatchingPrompt && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 backdrop-blur-md">
              <div className="max-w-sm rounded-2xl border border-white/10 bg-zinc-950 p-6 text-center shadow-2xl">
                <p className="text-xs uppercase tracking-wider text-zinc-400">Up Next</p>
                <p className="mt-1 font-display text-xl text-white">Next Episode</p>

                <div className="my-4 flex items-center justify-center">
                  <div className="relative flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--primary)] text-2xl font-bold text-white">
                    {autoPlayCountdown}
                  </div>
                </div>

                <div className="flex items-center justify-center gap-3">
                  <button
                    type="button"
                    onClick={() => setAutoPlayCountdown(null)}
                    className="rounded-lg border border-white/10 bg-white/5 px-4 py-2 text-xs font-semibold text-zinc-300 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      playSound.chime()
                      router.push(props.nextHref!)
                    }}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-[var(--primary)] px-4 py-2 text-xs font-bold text-white hover:brightness-110"
                  >
                    <Play className="h-3.5 w-3.5 fill-white" />
                    Play Now
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
