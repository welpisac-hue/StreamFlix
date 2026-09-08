'use client'

import { useState } from 'react'
import { useRouter } from 'next/navigation'
import { Info, Play, Star, X } from 'lucide-react'
import Link from 'next/link'
import WatchLaterButton from './WatchLaterButton'
import StartWatchPartyButton from './StartWatchPartyButton'
import AddToPlaylistButton from './AddToPlaylistButton'
import { getImageUrl } from '@/lib/tmdb/images'
import { playSound } from '@/lib/sound'

interface QuickPreviewModalProps {
  tmdbId: number
  mediaType: 'movie' | 'tv' | 'anime'
  title: string
  posterPath: string | null
  rating?: number
  year?: string
}

export default function QuickPreviewModal({
  tmdbId,
  mediaType,
  title,
  posterPath,
  rating,
  year,
}: QuickPreviewModalProps) {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [overview, setOverview] = useState<string | null>(null)
  const [loading, setLoading] = useState(false)

  const handleOpen = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    playSound.hover()
    setOpen(true)
    if (overview) return

    setLoading(true)
    try {
      const endpoint =
        mediaType === 'anime'
          ? `/api/anime?id=${tmdbId}`
          : mediaType === 'movie'
            ? `/api/tmdb/movie/${tmdbId}`
            : `/api/tmdb/tv/${tmdbId}`

      const res = await fetch(endpoint)
      if (res.ok) {
        const data = await res.json()
        const rawOverview = data.overview || data.description
        const cleanText = rawOverview
          ? String(rawOverview).replace(/<[^>]*>/g, '')
          : 'No synopsis available.'
        setOverview(cleanText)
      }
    } catch {
      setOverview('Failed to load synopsis.')
    } finally {
      setLoading(false)
    }
  }

  const detailsHref =
    mediaType === 'movie'
      ? `/movie/${tmdbId}`
      : mediaType === 'anime'
        ? `/anime/${tmdbId}`
        : `/tv/${tmdbId}`

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-full bg-black/60 p-2 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:bg-black/90 hover:scale-110"
        title="Quick preview"
      >
        <Info className="h-4 w-4" />
      </button>

      {open && (
        <div className="fixed inset-0 z-[170] flex items-center justify-center bg-black/75 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-white/10 bg-zinc-950 shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-3 top-3 z-10 rounded-full bg-black/60 p-1.5 text-white backdrop-blur hover:bg-black/90"
            >
              <X className="h-4 w-4" />
            </button>

            {/* Poster Header */}
            <div className="relative aspect-video w-full bg-zinc-900">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={
                  posterPath?.startsWith('http')
                    ? posterPath
                    : getImageUrl(posterPath, 'w500')
                }
                alt={title}
                className="h-full w-full object-cover"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/20 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4">
                <span className="rounded bg-[var(--primary)] px-2 py-0.5 text-[10px] uppercase font-bold text-white">
                  {mediaType}
                </span>
                <h3 className="mt-1 font-display text-2xl tracking-wide text-white">{title}</h3>
                <div className="mt-1 flex items-center gap-3 text-xs text-zinc-300">
                  {rating != null && (
                    <span className="flex items-center gap-1 text-amber-400 font-semibold">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      {rating.toFixed(1)}
                    </span>
                  )}
                  {year && <span>{year}</span>}
                </div>
              </div>
            </div>

            {/* Content Body */}
            <div className="p-5 space-y-4">
              <p className="text-xs leading-relaxed text-zinc-300 line-clamp-4">
                {loading ? 'Loading details…' : overview}
              </p>

              <div className="flex flex-wrap items-center gap-2 pt-2">
                <button
                  type="button"
                  onClick={() => {
                    playSound.click()
                    router.push(
                      mediaType === 'movie'
                        ? `/watch/movie/${tmdbId}`
                        : mediaType === 'anime'
                          ? `/watch/anime/${tmdbId}/1`
                          : `/watch/tv/${tmdbId}/1/1`
                    )
                    setOpen(false)
                  }}
                  className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-2.5 text-xs font-bold text-white shadow-lg hover:brightness-110 transition"
                >
                  <Play className="h-4 w-4 fill-white" />
                  Play Now
                </button>

                <Link
                  href={detailsHref}
                  onClick={() => setOpen(false)}
                  className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-3 py-2.5 text-xs font-semibold text-zinc-300 hover:bg-white/10 hover:text-white"
                >
                  <Info className="h-3.5 w-3.5" />
                  Details
                </Link>

                <WatchLaterButton
                  tmdbId={tmdbId}
                  title={title}
                  posterPath={posterPath}
                  mediaType={mediaType}
                />

                <AddToPlaylistButton
                  tmdbId={tmdbId}
                  title={title}
                  posterPath={posterPath}
                  mediaType={mediaType}
                  variant="icon"
                />

                <StartWatchPartyButton
                  tmdbId={tmdbId}
                  title={title}
                  mediaType={mediaType}
                  variant="icon"
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
