'use client'

import { useEffect, useMemo, useRef, useState } from 'react'
import { getAnimeEmbedUrl, type AnimeLang } from '@/lib/embeds'
import { defaultEmbedLang } from '@/lib/anime-language'
import { useAnimeLanguageOptional } from '@/components/anime/AnimeLanguageContext'

interface AnimePlayerProps {
  anilistId: string | number
  episode: string | number
  title: string
  startAt?: number
  onProgress?: (payload: {
    currentTime: number
    duration: number
    paused: boolean
  }) => void
}

export default function AnimePlayer({
  anilistId,
  episode,
  title,
  startAt = 0,
  onProgress,
}: AnimePlayerProps) {
  const langCtx = useAnimeLanguageOptional()
  const preferred = langCtx?.language ?? 'en'
  const [lang, setLang] = useState<AnimeLang>(() => defaultEmbedLang(preferred))
  const iframeRef = useRef<HTMLIFrameElement>(null)
  const lastSent = useRef(0)
  const syncedPref = useRef<string | null>(null)

  useEffect(() => {
    if (!langCtx?.ready) return
    if (syncedPref.current === preferred) return
    syncedPref.current = preferred
    setLang(defaultEmbedLang(preferred))
  }, [preferred, langCtx?.ready])

  const embedUrl = useMemo(
    () =>
      getAnimeEmbedUrl(anilistId, episode, lang, {
        autoplay: true,
        autoSkip: true,
        startAt: startAt > 15 ? startAt : undefined,
      }),
    [anilistId, episode, lang, startAt]
  )

  useEffect(() => {
    const onMessage = (event: MessageEvent) => {
      const data = event.data
      if (!data || data.type !== 'PLAYER_EVENT') return
      const payload = data.data
      if (!payload || typeof payload.currentTime !== 'number') return

      const now = Date.now()
      if (now - lastSent.current < 2000 && payload.event === 'timeupdate') return
      lastSent.current = now

      onProgress?.({
        currentTime: payload.currentTime,
        duration: payload.duration || 0,
        paused: !!payload.paused,
      })
    }

    window.addEventListener('message', onMessage)
    return () => window.removeEventListener('message', onMessage)
  }, [onProgress])

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center justify-between gap-3">
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
        <p className="text-xs text-zinc-500">
          TryEmbed · AniList #{anilistId} · default{' '}
          {defaultEmbedLang(preferred).toUpperCase()} for your language
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl border border-fuchsia-400/20 bg-black shadow-[0_24px_80px_rgba(192,38,211,0.25)]">
        <div className="aspect-video w-full">
          <iframe
            key={embedUrl}
            ref={iframeRef}
            src={embedUrl}
            className="h-full w-full"
            allowFullScreen
            allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
            referrerPolicy="origin"
            title={title}
          />
        </div>
      </div>
    </div>
  )
}
