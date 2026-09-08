'use client'

import { useMemo, useState, useEffect, useRef } from 'react'
import { useRouter } from 'next/navigation'
import {
  FastForward,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Sparkles,
  Volume2,
  VolumeX,
} from 'lucide-react'
import { getMovieEmbedUrl, getTVEmbedUrl } from '@/lib/embeds'
import StreamReportButton from './StreamReportButton'
import { playSound, isSoundEnabled, setSoundEnabled } from '@/lib/sound'

type MovieProps = {
  mediaType: 'movie'
  tmdbId: string | number
  title: string
  startAt?: number
  nextHref?: string
}

type TVProps = {
  mediaType: 'tv' | 'anime'
  tmdbId: string | number
  title: string
  season?: string | number
  episode?: string | number
  startAt?: number
  nextHref?: string
}

type VideoPlayerProps = MovieProps | TVProps

export default function VideoPlayer(props: VideoPlayerProps) {
  const router = useRouter()
  const [theaterMode, setTheaterMode] = useState(false)
  const [ambientGlow, setAmbientGlow] = useState(true)
  const [soundActive, setSoundActive] = useState(true)
  const [showSkipIntro, setShowSkipIntro] = useState(true)
  const [seekOffset, setSeekOffset] = useState(0)
  const [autoPlayCountdown, setAutoPlayCountdown] = useState<number | null>(null)
  const timerRef = useRef<NodeJS.Timeout | null>(null)
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const currentTimeRef = useRef<number>(0)

  useEffect(() => {
    setSoundActive(isSoundEnabled())
  }, [])

  const embedUrl = useMemo(() => {
    const baseProgress = props.startAt && props.startAt > 15 ? props.startAt : 0
    const progress = baseProgress + seekOffset > 15 ? baseProgress + seekOffset : undefined
    if (props.mediaType === 'movie') {
      return getMovieEmbedUrl(props.tmdbId, { progress })
    }
    return getTVEmbedUrl(props.tmdbId, props.season || 1, props.episode || 1, {
      progress,
    })
  }, [props, seekOffset])

  // Handle Skip Intro (+85 seconds iframe refresh or seek trigger)
  const handleSkipIntro = () => {
    playSound.click()
    setShowSkipIntro(false)
    setSeekOffset((prev) => prev + 85)
    try {
      iframeRef.current?.contentWindow?.postMessage(
        {
          type: 'PLAYER_COMMAND',
          data: { command: 'seek', time: (currentTimeRef.current || 0) + 85 },
        },
        '*'
      )
    } catch {
      // ignore
    }
  }

  // Listen to embedded player postMessage events (VidKing / vidsrc / AniList)
  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
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

      // If stream ended or approaching end within 10s and next episode exists
      const isFinished =
        payload.event === 'ended' ||
        (typeof payload.currentTime === 'number' &&
          typeof payload.duration === 'number' &&
          payload.duration > 30 &&
          payload.currentTime >= payload.duration - 8)

      if (isFinished && props.nextHref && autoPlayCountdown === null) {
        setAutoPlayCountdown(5)
      }
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [props.nextHref, autoPlayCountdown])

  // Handle Auto-Play Next Episode countdown
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

  return (
    <div className={`relative transition-all duration-500 ${theaterMode ? 'z-[100]' : ''}`}>
      {/* Theater Mode Overlay */}
      {theaterMode && (
        <div
          onClick={toggleTheaterMode}
          className="fixed inset-0 z-[-1] bg-black/90 backdrop-blur-md transition-opacity duration-500"
          aria-label="Exit Theater Mode"
        />
      )}

      {/* Control Bar Top */}
      <div className="mb-2.5 flex items-center justify-between gap-3 text-xs text-zinc-400">
        <div className="flex items-center gap-2">
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
            onClick={toggleSoundPref}
            className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-2.5 py-1 text-zinc-400 hover:text-white"
            title="Toggle UI Sounds"
          >
            {soundActive ? <Volume2 className="h-3.5 w-3.5 text-emerald-400" /> : <VolumeX className="h-3.5 w-3.5 text-zinc-500" />}
          </button>
        </div>

        <div className="flex items-center gap-2">
          <StreamReportButton
            tmdbId={Number(props.tmdbId)}
            mediaType={props.mediaType}
            seasonNumber={props.mediaType !== 'movie' ? Number(props.season || 1) : undefined}
            episodeNumber={props.mediaType !== 'movie' ? Number(props.episode || 1) : undefined}
            title={props.title}
          />
        </div>
      </div>

      {/* Main Video Frame & Backlight */}
      <div className="relative">
        {/* Ambient Backlight Halo */}
        {ambientGlow && (
          <div className="pointer-events-none absolute -inset-4 rounded-3xl bg-gradient-to-r from-red-600/30 via-purple-600/30 to-sky-600/30 blur-2xl opacity-65 transition-opacity duration-700" />
        )}

        <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.7)]">
          <div className="aspect-video w-full">
            <iframe
              ref={iframeRef}
              key={embedUrl}
              src={embedUrl}
              className="h-full w-full"
              allowFullScreen
              allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
              referrerPolicy="origin"
              title={props.title}
            />
          </div>

          {/* Skip Intro Overlay Button */}
          {showSkipIntro && (
            <div className="absolute bottom-12 right-6 z-20">
              <button
                type="button"
                onClick={handleSkipIntro}
                className="group inline-flex items-center gap-2 rounded-xl border border-white/20 bg-black/80 px-4 py-2 text-xs font-bold text-white shadow-2xl backdrop-blur transition hover:scale-105 hover:border-[var(--primary)] hover:bg-black"
              >
                <FastForward className="h-4 w-4 text-[var(--primary)] group-hover:animate-pulse" />
                Skip Intro (+85s)
              </button>
            </div>
          )}

          {/* Auto-Play Next Episode Countdown Overlay */}
          {autoPlayCountdown !== null && props.nextHref && (
            <div className="absolute inset-0 z-30 flex items-center justify-center bg-black/85 backdrop-blur-md">
              <div className="max-w-sm text-center p-6 rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
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
