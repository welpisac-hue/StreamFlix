'use client'

import { useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { Info, Play, Star, X } from 'lucide-react'
import Link from 'next/link'
import WatchLaterButton from './WatchLaterButton'
import StartWatchPartyButton from './StartWatchPartyButton'
import AddToPlaylistButton from './AddToPlaylistButton'
import { getImageUrl } from '@/lib/tmdb/images'
import { playSound } from '@/lib/sound'
import { pickYoutubeTrailerKey } from '@/lib/home-catalog'

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
  const [backdropPath, setBackdropPath] = useState<string | null>(null)
  const [trailerKey, setTrailerKey] = useState<string | null>(null)
  const [showTrailer, setShowTrailer] = useState(false)
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (!open) {
      setShowTrailer(false)
      return
    }
    if (!trailerKey) return
    const t = window.setTimeout(() => setShowTrailer(true), 5000)
    return () => window.clearTimeout(t)
  }, [open, trailerKey])

  const handleOpen = async (e: React.MouseEvent) => {
    e.preventDefault()
    e.stopPropagation()
    playSound.hover()
    setOpen(true)
    setShowTrailer(false)
    if (overview && (trailerKey || mediaType === 'anime')) return

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

        if (data.backdrop_path) setBackdropPath(data.backdrop_path)
        else if (data.bannerImage) setBackdropPath(data.bannerImage)

        if (mediaType === 'anime') {
          setTrailerKey(data.trailerYoutubeId || null)
        } else {
          setTrailerKey(pickYoutubeTrailerKey(data.videos))
        }
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

  const posterSrc = posterPath?.startsWith('http')
    ? posterPath
    : getImageUrl(posterPath, 'w500')

  const backdropSrc = backdropPath
    ? backdropPath.startsWith('http')
      ? backdropPath
      : getImageUrl(backdropPath, 'w780')
    : null

  return (
    <>
      <button
        type="button"
        onClick={handleOpen}
        className="rounded-full bg-black/60 p-2 text-white opacity-0 backdrop-blur transition group-hover:opacity-100 hover:scale-110 hover:bg-black/90"
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
              className="absolute right-3 top-3 z-20 rounded-full bg-black/60 p-1.5 text-white backdrop-blur hover:bg-black/90"
            >
              <X className="h-4 w-4" />
            </button>

            <div className="relative aspect-video w-full overflow-hidden bg-zinc-900">
              {/* Backdrop fits 16:9; poster uses contain so it isn't cropped */}
              {backdropSrc ? (
                <img
                  src={backdropSrc}
                  alt=""
                  className={`absolute inset-0 h-full w-full object-cover transition-opacity duration-700 ${
                    showTrailer && trailerKey ? 'opacity-0' : 'opacity-100'
                  }`}
                />
              ) : (
                <div
                  className={`absolute inset-0 flex items-center justify-center bg-zinc-950 transition-opacity duration-700 ${
                    showTrailer && trailerKey ? 'opacity-0' : 'opacity-100'
                  }`}
                >
                  <img
                    src={posterSrc}
                    alt={title}
                    className="max-h-full max-w-full object-contain"
                  />
                </div>
              )}

              {trailerKey && (
                <iframe
                  key={trailerKey}
                  src={`https://www.youtube.com/embed/${trailerKey}?autoplay=1&mute=1&controls=0&rel=0&loop=1&playlist=${trailerKey}&modestbranding=1&playsinline=1`}
                  className={`absolute inset-0 h-full w-full border-0 transition-opacity duration-700 ${
                    showTrailer ? 'opacity-100' : 'pointer-events-none opacity-0'
                  }`}
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                  title={`${title} trailer`}
                />
              )}

              <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-zinc-950 via-zinc-950/30 to-transparent" />
              <div className="absolute bottom-4 left-4 right-4 z-10">
                <span className="rounded bg-[var(--primary)] px-2 py-0.5 text-[10px] font-bold uppercase text-white">
                  {mediaType}
                </span>
                <h3 className="mt-1 font-display text-2xl tracking-wide text-white">
                  {title}
                </h3>
                <div className="mt-1 flex items-center gap-3 text-xs text-zinc-300">
                  {rating != null && (
                    <span className="flex items-center gap-1 font-semibold text-amber-400">
                      <Star className="h-3.5 w-3.5 fill-amber-400" />
                      {rating.toFixed(1)}
                    </span>
                  )}
                  {year && <span>{year}</span>}
                </div>
              </div>
            </div>

            <div className="space-y-4 p-5">
              <p className="line-clamp-4 text-xs leading-relaxed text-zinc-300">
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
                  className="inline-flex flex-1 items-center justify-center gap-2 rounded-xl bg-[var(--primary)] py-2.5 text-xs font-bold text-white shadow-lg transition hover:brightness-110"
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
