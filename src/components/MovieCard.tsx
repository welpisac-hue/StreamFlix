'use client'

import { Play, Star } from 'lucide-react'
import { getImageUrl } from '@/lib/tmdb/images'
import Link from 'next/link'

interface MediaCardProps {
  id: number
  title: string
  /** TMDB path OR full absolute image URL (AniList/Jikan) */
  posterPath: string | null
  rating?: number | null
  mediaType: 'movie' | 'tv' | 'anime'
  year?: string | number | null
  className?: string
  /** Optional stagger index kept for call-site compatibility */
  index?: number
}

function resolvePoster(posterPath: string | null): string {
  if (!posterPath) return '/placeholder.svg'
  if (posterPath.startsWith('http')) return posterPath
  return getImageUrl(posterPath, 'w500')
}

export default function MovieCard({
  id,
  title,
  posterPath,
  rating,
  mediaType,
  year,
  className = '',
}: MediaCardProps) {
  const imageUrl = resolvePoster(posterPath)
  const href = mediaType === 'anime' ? `/anime/${id}` : `/${mediaType}/${id}`
  const score =
    rating != null && rating > 0
      ? rating > 10
        ? (rating / 10).toFixed(1)
        : rating.toFixed(1)
      : null

  return (
    <Link href={href} className={`group block w-full min-w-0 ${className}`}>
      <div className="relative aspect-[2/3] overflow-hidden rounded-2xl bg-zinc-900 ring-1 ring-white/5 transition duration-300 group-hover:-translate-y-1 group-hover:ring-[var(--primary)]/45 group-hover:shadow-[0_16px_40px_rgba(229,9,20,0.22)]">
        <img
          src={imageUrl}
          alt={title}
          loading="lazy"
          className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/20 to-transparent opacity-80 transition group-hover:opacity-100" />

        <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
          <span className="flex h-12 w-12 items-center justify-center rounded-full bg-[var(--primary)] text-white shadow-lg">
            <Play className="ml-0.5 h-5 w-5 fill-white" />
          </span>
        </div>

        {mediaType === 'anime' && (
          <span className="absolute left-2 top-2 rounded-md bg-[var(--primary)]/90 px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">
            Anime
          </span>
        )}

        {score && (
          <div className="absolute right-2 top-2 inline-flex items-center gap-1 rounded-md bg-black/75 px-1.5 py-0.5 text-xs font-semibold text-white backdrop-blur-sm">
            <Star className="h-3 w-3 fill-amber-400 text-amber-400" />
            {score}
          </div>
        )}
      </div>

      <div className="mt-2.5 space-y-0.5">
        <h3 className="truncate text-sm font-semibold text-zinc-100 transition group-hover:text-white">
          {title}
        </h3>
        {year != null && year !== '' && (
          <p className="text-xs text-zinc-500">{year}</p>
        )}
      </div>
    </Link>
  )
}
