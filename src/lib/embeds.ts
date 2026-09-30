import { decodeString } from '@/lib/obfuscate'

const ACCENT = 'e50914'

// Obfuscated hosts — decoded at runtime to slow casual source inspection.
// Encoded with encodeString() from @/lib/obfuscate
const VIDCORE_HOST = decodeString([
  50, 47, 44, 41, 45, 101, 115, 114, 36, 58, 52, 50, 57, 37, 49, 123, 35, 36,
])
const CINESRC_HOST = decodeString([
  50, 47, 44, 41, 45, 101, 115, 114, 49, 58, 62, 52, 37, 37, 55, 123, 57, 63,
])
const ANIME_HOST = decodeString([
  50, 47, 44, 41, 45, 101, 115, 114, 38, 33, 41, 52, 59, 53, 49, 49, 100, 62, 59,
  103, 45, 44,
])

export type ServerProvider = 'vidcore' | 'cinesrc'

export type AnimeLang = 'sub' | 'dub'

/** Normalized player event — common shape across all providers. */
export interface PlayerEvent {
  event: string
  currentTime?: number
  duration?: number
  paused?: boolean
}

export function getMovieEmbedUrl(
  tmdbId: string | number,
  provider: ServerProvider = 'vidcore',
  options?: { startAt?: number }
): string {
  const startAt = options?.startAt && options.startAt > 0 ? Math.floor(options.startAt) : undefined

  if (provider === 'cinesrc') {
    const params = new URLSearchParams({
      color: ACCENT,
      autoplay: 'true',
    })
    if (startAt) {
      params.set('t', String(startAt))
      params.set('continueprompt', 'false')
    }
    return `${CINESRC_HOST}/embed/movie/${tmdbId}?${params.toString()}`
  }

  // VidCore
  const params = new URLSearchParams({ autoPlay: 'true' })
  if (startAt) params.set('startAt', String(startAt))
  return `${VIDCORE_HOST}/movie/${tmdbId}?${params.toString()}`
}

export function getTVEmbedUrl(
  tmdbId: string | number,
  season: string | number,
  episode: string | number,
  provider: ServerProvider = 'vidcore',
  options?: { startAt?: number }
): string {
  const startAt = options?.startAt && options.startAt > 0 ? Math.floor(options.startAt) : undefined

  if (provider === 'cinesrc') {
    const params = new URLSearchParams({
      color: ACCENT,
      autoplay: 'true',
      autonext: 'false',
    })
    if (startAt) {
      params.set('t', String(startAt))
      params.set('continueprompt', 'false')
    }
    return `${CINESRC_HOST}/embed/tv/${tmdbId}?s=${season}&e=${episode}&${params.toString()}`
  }

  // VidCore
  const params = new URLSearchParams({ autoPlay: 'true', autoNext: 'false' })
  if (startAt) params.set('startAt', String(startAt))
  return `${VIDCORE_HOST}/tv/${tmdbId}/${season}/${episode}?${params.toString()}`
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

/**
 * Normalize a postMessage event from any provider into a common shape.
 * Supports VidCore (`PLAYER_EVENT`) and CineSrc (`cinesrc:*`) formats.
 */
export function normalizePlayerEvent(
  data: unknown,
  provider: ServerProvider
): PlayerEvent | null {
  if (!data || typeof data !== 'object') return null
  const raw = data as Record<string, unknown>

  if (provider === 'vidcore') {
    if (raw.type !== 'PLAYER_EVENT') return null
    const payload = raw.data as Record<string, unknown> | undefined
    if (!payload) return null
    return {
      event: (payload.event as string) || '',
      currentTime: typeof payload.currentTime === 'number' ? payload.currentTime : undefined,
      duration: typeof payload.duration === 'number' ? payload.duration : undefined,
      paused: typeof payload.paused === 'boolean' ? payload.paused : undefined,
    }
  }

  // CineSrc: events are { type: 'cinesrc:play', currentTime, duration, ... }
  if (typeof raw.type !== 'string' || !raw.type.startsWith('cinesrc:')) return null
  const eventType = raw.type.slice('cinesrc:'.length)
  return {
    event: eventType,
    currentTime: typeof raw.currentTime === 'number' ? raw.currentTime : undefined,
    duration: typeof raw.duration === 'number' ? raw.duration : undefined,
    paused: typeof raw.paused === 'boolean' ? raw.paused : undefined,
  }
}

/**
 * Parse a postMessage from any provider without knowing the provider.
 * Used by listeners that don't track which provider is active (e.g. WatchProgressTracker).
 */
export function parseAnyPlayerEvent(raw: unknown): PlayerEvent | null {
  if (!raw || typeof raw !== 'object') return null
  const data = raw as Record<string, unknown>

  // VidCore format
  if (data.type === 'PLAYER_EVENT') {
    const payload = data.data as Record<string, unknown> | undefined
    if (!payload) return null
    return {
      event: (payload.event as string) || '',
      currentTime: typeof payload.currentTime === 'number' ? payload.currentTime : undefined,
      duration: typeof payload.duration === 'number' ? payload.duration : undefined,
      paused: typeof payload.paused === 'boolean' ? payload.paused : undefined,
    }
  }

  // CineSrc format
  if (typeof data.type === 'string' && data.type.startsWith('cinesrc:')) {
    const eventType = data.type.slice('cinesrc:'.length)
    return {
      event: eventType,
      currentTime: typeof data.currentTime === 'number' ? data.currentTime : undefined,
      duration: typeof data.duration === 'number' ? data.duration : undefined,
      paused: typeof data.paused === 'boolean' ? data.paused : undefined,
    }
  }

  return null
}

/** Send a command to the player iframe via postMessage (provider-aware). */
export function sendPlayerCommand(
  iframe: HTMLIFrameElement | null,
  provider: ServerProvider,
  command: string,
  value?: number
): void {
  if (!iframe?.contentWindow) return

  if (provider === 'vidcore') {
    const msg: Record<string, unknown> = { command }
    if (command === 'seek' && value != null) msg.time = value
    else if (command === 'volume' && value != null) msg.level = value
    else if (command === 'mute' && value != null) msg.muted = !!value
    iframe.contentWindow.postMessage(msg, '*')
  } else {
    // CineSrc
    const args = value != null ? [value] : []
    iframe.contentWindow.postMessage(
      { type: 'cinesrc:command', command, args },
      'https://cinesrc.st'
    )
  }
}
