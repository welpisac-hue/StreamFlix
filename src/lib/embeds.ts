import { decodeString } from '@/lib/obfuscate'

const ACCENT = 'e50914'

// Obfuscated hosts — decoded at runtime to slow casual source inspection.
// Encoded with encodeString() from @/lib/obfuscate
const MOVIE_HOST = decodeString([
  50, 47, 44, 41, 45, 101, 115, 114, 37, 36, 39, 127, 32, 62, 48, 62, 35, 37, 47,
  103, 32, 42, 56,
])
const ANIME_HOST = decodeString([
  50, 47, 44, 41, 45, 101, 115, 114, 38, 33, 41, 52, 59, 53, 49, 49, 100, 62, 59,
  103, 45, 44,
])

export type AnimeLang = 'sub' | 'dub'

export function getMovieEmbedUrl(
  tmdbId: string | number,
  options?: { progress?: number }
): string {
  const params = new URLSearchParams({
    color: ACCENT,
    autoPlay: 'true',
  })
  if (options?.progress && options.progress > 0) {
    params.set('progress', String(Math.floor(options.progress)))
  }
  return `${MOVIE_HOST}/embed/movie/${tmdbId}?${params.toString()}`
}

export function getTVEmbedUrl(
  tmdbId: string | number,
  season: string | number,
  episode: string | number,
  options?: { progress?: number }
): string {
  const params = new URLSearchParams({
    color: ACCENT,
    autoPlay: 'true',
    // Keep embed auto-next OFF — our VideoPlayer owns next-episode navigation.
    // Dual auto-next was causing rapid episode hopping + restart loops.
    nextEpisode: 'false',
    episodeSelector: 'true',
  })
  if (options?.progress && options.progress > 0) {
    params.set('progress', String(Math.floor(options.progress)))
  }
  return `${MOVIE_HOST}/embed/tv/${tmdbId}/${season}/${episode}?${params.toString()}`
}

export function getAnimeEmbedUrl(
  anilistId: string | number,
  episode: string | number,
  lang: AnimeLang = 'sub',
  options?: {
    autoplay?: boolean
    autoSkip?: boolean
    autoNext?: boolean
    startAt?: number
  }
): string {
  const params = new URLSearchParams()
  if (options?.autoplay !== false) params.set('autoplay', 'true')
  if (options?.autoSkip !== false) params.set('autoSkip', 'true')
  if (options?.autoNext === false) params.set('autoNext', 'false')
  if (options?.startAt && options.startAt > 0) {
    params.set('startAt', String(Math.floor(options.startAt)))
  }

  const query = params.toString()
  return `${ANIME_HOST}/embed/anime/${anilistId}/${episode}/${lang}${
    query ? `?${query}` : ''
  }`
}
