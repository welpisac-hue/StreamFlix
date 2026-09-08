/**
 * Normalize season/episode for WatchHistory uniqueness.
 * Movies and anime-without-season use 0 (never null — Postgres UNIQUE treats NULLs as distinct).
 */
export function normalizeWatchEpisodeFields(
  mediaType: string,
  seasonNumber?: number | null,
  episodeNumber?: number | null
): { seasonNumber: number; episodeNumber: number } {
  if (mediaType === 'movie') {
    return { seasonNumber: 0, episodeNumber: 0 }
  }
  if (mediaType === 'anime') {
    const ep =
      episodeNumber != null && Number.isFinite(episodeNumber)
        ? Math.max(0, Math.floor(episodeNumber))
        : 0
    return { seasonNumber: 0, episodeNumber: ep }
  }
  // tv
  const season =
    seasonNumber != null && Number.isFinite(seasonNumber)
      ? Math.max(0, Math.floor(seasonNumber))
      : 0
  const episode =
    episodeNumber != null && Number.isFinite(episodeNumber)
      ? Math.max(0, Math.floor(episodeNumber))
      : 0
  return { seasonNumber: season, episodeNumber: episode }
}

/** Resolve next playback timestamp — allow rewind; ignore seed zeros that would clobber. */
export function resolveWatchTimestamp(
  existingTimestamp: number | undefined,
  incomingTimestamp: number
): number {
  const existing = existingTimestamp ?? 0
  // Seed / empty progress must not wipe a real position
  if (incomingTimestamp <= 0 && existing > 0) return existing
  // Missed-resume play-from-start: tiny early ticks must not erase a real position.
  // Real rewinds past ~45s (or within 60s of the saved spot) still win.
  if (
    existing >= 90 &&
    incomingTimestamp > 0 &&
    incomingTimestamp < 45 &&
    incomingTimestamp < existing - 60
  ) {
    return existing
  }
  return incomingTimestamp
}
