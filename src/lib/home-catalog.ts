import type { Movie, TVShow, Video } from '@/lib/tmdb/types'

/** Prefer official YouTube Trailer, then any YouTube Trailer/Teaser. */
export function pickYoutubeTrailerKey(
  videos?: { results?: Video[] } | Video[] | null
): string | null {
  const results = Array.isArray(videos)
    ? videos
    : videos?.results || []
  const yt = results.filter((v) => v.site === 'YouTube')
  const trailer =
    yt.find((v) => v.type === 'Trailer' && v.official) ||
    yt.find((v) => v.type === 'Trailer') ||
    yt.find((v) => v.type === 'Teaser') ||
    yt[0]
  return trailer?.key || null
}

type WithId = { id: number }

/**
 * Pick items not already used on the homepage, marking them as used.
 */
export function takeExclusive<T extends WithId>(
  items: T[],
  used: Set<number>,
  limit = 18
): T[] {
  const out: T[] = []
  for (const item of items) {
    if (!item?.id || used.has(item.id)) continue
    used.add(item.id)
    out.push(item)
    if (out.length >= limit) break
  }
  return out
}

/** Keep only titles with a future (or today) US-style release date. */
export function filterComingSoon(movies: Movie[], today = new Date()): Movie[] {
  const y = today.getFullYear()
  const m = String(today.getMonth() + 1).padStart(2, '0')
  const d = String(today.getDate()).padStart(2, '0')
  const todayStr = `${y}-${m}-${d}`

  return movies
    .filter((movie) => {
      if (!movie.release_date) return false
      return movie.release_date >= todayStr
    })
    .sort((a, b) =>
      (a.release_date || '').localeCompare(b.release_date || '')
    )
}

export type HomeCard = (Movie | TVShow) & {
  mediaType: 'movie' | 'tv'
  displayTitle: string
  year?: string
}
