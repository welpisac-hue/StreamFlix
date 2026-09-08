/** Client-side playback preferences (localStorage). */

const INFO_KEY = 'sf-player-info'
const STILL_ENABLED_KEY = 'sf-still-watching-enabled'
const STILL_EPISODES_KEY = 'sf-still-watching-episodes'
const BINGE_PREFIX = 'sf-binge:'

export type PlayerSettings = {
  /** Title/overview overlay preference — default ON */
  infoEnabled: boolean
  /** "Are you still watching?" for TV/anime binge — default ON */
  stillWatchingEnabled: boolean
  /** Ask after this many consecutive episodes — default 2 */
  stillWatchingEpisodes: number
}

const DEFAULTS: PlayerSettings = {
  infoEnabled: true,
  stillWatchingEnabled: true,
  stillWatchingEpisodes: 2,
}

function readBool(key: string, fallback: boolean): boolean {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    return raw === '1' || raw === 'true'
  } catch {
    return fallback
  }
}

function writeBool(key: string, value: boolean) {
  try {
    localStorage.setItem(key, value ? '1' : '0')
  } catch {
    // ignore
  }
}

function readInt(key: string, fallback: number, min: number, max: number): number {
  if (typeof window === 'undefined') return fallback
  try {
    const raw = localStorage.getItem(key)
    if (raw === null) return fallback
    const n = parseInt(raw, 10)
    if (!Number.isFinite(n)) return fallback
    return Math.min(max, Math.max(min, n))
  } catch {
    return fallback
  }
}

export function getPlayerSettings(): PlayerSettings {
  return {
    infoEnabled: readBool(INFO_KEY, DEFAULTS.infoEnabled),
    stillWatchingEnabled: readBool(STILL_ENABLED_KEY, DEFAULTS.stillWatchingEnabled),
    stillWatchingEpisodes: readInt(
      STILL_EPISODES_KEY,
      DEFAULTS.stillWatchingEpisodes,
      1,
      20
    ),
  }
}

export function setInfoEnabled(value: boolean) {
  writeBool(INFO_KEY, value)
}

export function setStillWatchingEnabled(value: boolean) {
  writeBool(STILL_ENABLED_KEY, value)
}

export function setStillWatchingEpisodes(value: number) {
  const n = Math.min(20, Math.max(1, Math.floor(value) || 2))
  try {
    localStorage.setItem(STILL_EPISODES_KEY, String(n))
  } catch {
    // ignore
  }
}

function bingeKey(mediaType: string, tmdbId: string | number) {
  return `${BINGE_PREFIX}${mediaType}:${tmdbId}`
}

/** Episodes finished in this browser session for a series. */
export function getBingeCount(mediaType: string, tmdbId: string | number): number {
  if (typeof window === 'undefined') return 0
  try {
    const raw = sessionStorage.getItem(bingeKey(mediaType, tmdbId))
    const n = parseInt(raw || '0', 10)
    return Number.isFinite(n) && n > 0 ? n : 0
  } catch {
    return 0
  }
}

export function incrementBingeCount(
  mediaType: string,
  tmdbId: string | number
): number {
  const next = getBingeCount(mediaType, tmdbId) + 1
  try {
    sessionStorage.setItem(bingeKey(mediaType, tmdbId), String(next))
  } catch {
    // ignore
  }
  return next
}

export function resetBingeCount(mediaType: string, tmdbId: string | number) {
  try {
    sessionStorage.removeItem(bingeKey(mediaType, tmdbId))
  } catch {
    // ignore
  }
}
