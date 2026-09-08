export interface SeasonEpisodeCount {
  season: number
  episodes: number
}

export interface RawWatchHistoryItem {
  id: string
  tmdbId: number
  title: string
  posterPath: string | null
  mediaType: string
  seasonNumber: number | null
  episodeNumber: number | null
  timestamp: number
  duration: number
  completed: boolean
  totalEpisodes?: number | null
  seasonEpisodeCounts?: SeasonEpisodeCount[] | null
  lastWatched: string | Date
}

export interface AggregatedWatchItem {
  /** Lead row id (most recent / resume target) */
  id: string
  /** All underlying row ids for this movie or series */
  ids: string[]
  tmdbId: number
  title: string
  posterPath: string | null
  mediaType: string
  seasonNumber: number | null
  episodeNumber: number | null
  timestamp: number
  duration: number
  /** True only when the movie is done, or every episode of the show is done */
  completed: boolean
  /** 0–100 series/movie completion for progress UI */
  progressPercent: number
  completedEpisodes: number | null
  totalEpisodes: number | null
  lastWatched: string
  isSeries: boolean
}

function toIso(value: string | Date): string {
  if (value instanceof Date) return value.toISOString()
  return value
}

function episodeProgress(timestamp: number, duration: number): number {
  if (!duration || duration <= 0) return 0
  return Math.min((timestamp / duration) * 100, 100)
}

function parseSeasonCounts(
  raw: RawWatchHistoryItem['seasonEpisodeCounts']
): Map<number, number> {
  const map = new Map<number, number>()
  if (!Array.isArray(raw)) return map
  for (const entry of raw) {
    if (
      entry &&
      typeof entry.season === 'number' &&
      typeof entry.episodes === 'number' &&
      entry.season > 0 &&
      entry.episodes > 0
    ) {
      map.set(entry.season, entry.episodes)
    }
  }
  return map
}

function episodeKey(
  mediaType: string,
  season: number | null | undefined,
  episode: number | null | undefined
): string {
  if (mediaType === 'anime') return `e${episode ?? 0}`
  return `s${season ?? 0}e${episode ?? 0}`
}

/**
 * After finishing an episode, find the next one to resume.
 * Anime: sequential episode numbers.
 * TV: uses per-season episode counts when available.
 */
export function resolveNextEpisode(opts: {
  mediaType: string
  season: number
  episode: number
  seasonCounts: Map<number, number>
  totalEpisodes: number | null
}): { season: number; episode: number } | null {
  const { mediaType, season, episode, seasonCounts, totalEpisodes } = opts

  if (mediaType === 'anime') {
    const next = episode + 1
    if (totalEpisodes != null && totalEpisodes > 0 && next > totalEpisodes) {
      return null
    }
    return { season: 1, episode: next }
  }

  const countInSeason = seasonCounts.get(season)
  if (countInSeason != null) {
    if (episode < countInSeason) {
      return { season, episode: episode + 1 }
    }
    const nextSeason = season + 1
    const nextCount = seasonCounts.get(nextSeason)
    if (nextCount != null && nextCount > 0) {
      return { season: nextSeason, episode: 1 }
    }
    // Unknown next season length — still try S+1 E1 if we haven't hit total
    if (totalEpisodes == null || episode < totalEpisodes) {
      return { season: nextSeason, episode: 1 }
    }
    return null
  }

  // No season map: assume next episode in same season
  return { season, episode: episode + 1 }
}

function pickResumeTarget(
  group: RawWatchHistoryItem[],
  sortedByRecent: RawWatchHistoryItem[],
  mediaType: string,
  seasonCounts: Map<number, number>,
  totalEpisodes: number | null
): RawWatchHistoryItem & { _synthetic?: boolean } {
  // Prefer most recent incomplete episode (still in progress)
  const inProgress = sortedByRecent.find(
    (e) =>
      !e.completed &&
      episodeProgress(e.timestamp, e.duration) > 0
  )
  if (inProgress) return inProgress

  // Any incomplete row
  const incomplete = sortedByRecent.find((e) => !e.completed)
  if (incomplete) return incomplete

  // All watched episodes completed → advance to next
  const ordered = [...group].sort((a, b) => {
    const sa = a.seasonNumber ?? 0
    const sb = b.seasonNumber ?? 0
    if (sa !== sb) return sa - sb
    return (a.episodeNumber ?? 0) - (b.episodeNumber ?? 0)
  })
  const furthest = ordered[ordered.length - 1]
  if (!furthest || !furthest.completed) {
    return sortedByRecent[0]
  }

  const next = resolveNextEpisode({
    mediaType,
    season: furthest.seasonNumber ?? 1,
    episode: furthest.episodeNumber ?? 1,
    seasonCounts,
    totalEpisodes,
  })

  if (!next) return furthest

  // If we already have a row for the next episode, use it
  const existing = group.find(
    (e) =>
      (mediaType === 'anime'
        ? e.episodeNumber === next.episode
        : e.seasonNumber === next.season && e.episodeNumber === next.episode)
  )
  if (existing) return existing

  // Synthetic resume pointer (no history row yet)
  return {
    ...furthest,
    seasonNumber: next.season,
    episodeNumber: next.episode,
    timestamp: 0,
    duration: 0,
    completed: false,
    _synthetic: true,
  }
}

/**
 * Collapse TV/anime episode rows into one card per show.
 * Movies are also collapsed by tmdbId so duplicate history rows don't clutter Completed.
 * A series is "completed" only when every episode (per totalEpisodes) has been marked completed.
 */
export function aggregateWatchHistory(
  items: RawWatchHistoryItem[]
): AggregatedWatchItem[] {
  const movieMap = new Map<string, RawWatchHistoryItem[]>()
  const seriesMap = new Map<string, RawWatchHistoryItem[]>()

  for (const item of items) {
    const isSeries = item.mediaType === 'tv' || item.mediaType === 'anime'
    const key = `${item.mediaType}:${item.tmdbId}`
    if (isSeries) {
      const group = seriesMap.get(key)
      if (group) group.push(item)
      else seriesMap.set(key, [item])
    } else {
      const group = movieMap.get(key)
      if (group) group.push(item)
      else movieMap.set(key, [item])
    }
  }

  const movies: AggregatedWatchItem[] = []
  for (const group of movieMap.values()) {
    const sorted = [...group].sort(
      (a, b) =>
        new Date(toIso(b.lastWatched)).getTime() -
        new Date(toIso(a.lastWatched)).getTime()
    )
    // Prefer a completed row if any, else most recent
    const best =
      sorted.find((g) => g.completed) || sorted[0]
    movies.push({
      id: best.id,
      ids: group.map((g) => g.id),
      tmdbId: best.tmdbId,
      title: best.title,
      posterPath: best.posterPath,
      mediaType: best.mediaType,
      seasonNumber: null,
      episodeNumber: null,
      timestamp: best.timestamp,
      duration: best.duration,
      completed: group.some((g) => g.completed),
      progressPercent: group.some((g) => g.completed)
        ? 100
        : episodeProgress(best.timestamp, best.duration),
      completedEpisodes: null,
      totalEpisodes: null,
      lastWatched: toIso(sorted[0].lastWatched),
      isSeries: false,
    })
  }

  const series: AggregatedWatchItem[] = []

  for (const group of seriesMap.values()) {
    const sorted = [...group].sort(
      (a, b) =>
        new Date(toIso(b.lastWatched)).getTime() -
        new Date(toIso(a.lastWatched)).getTime()
    )
    const latest = sorted[0]
    const mediaType = latest.mediaType
    const totalEpisodes =
      Math.max(
        0,
        ...group.map((g) =>
          typeof g.totalEpisodes === 'number' && g.totalEpisodes > 0
            ? g.totalEpisodes
            : 0
        )
      ) || null

    let seasonCounts = new Map<number, number>()
    for (const g of group) {
      const parsed = parseSeasonCounts(g.seasonEpisodeCounts)
      for (const [s, c] of parsed) seasonCounts.set(s, c)
    }

    const episodeMap = new Map<string, RawWatchHistoryItem>()
    for (const ep of group) {
      const season = ep.seasonNumber ?? 0
      if (ep.mediaType === 'tv' && season === 0) continue
      const key = episodeKey(ep.mediaType, ep.seasonNumber, ep.episodeNumber)
      const existing = episodeMap.get(key)
      if (!existing) {
        episodeMap.set(key, ep)
        continue
      }
      if (ep.completed && !existing.completed) {
        episodeMap.set(key, ep)
        continue
      }
      if (
        !existing.completed &&
        episodeProgress(ep.timestamp, ep.duration) >
          episodeProgress(existing.timestamp, existing.duration)
      ) {
        episodeMap.set(key, ep)
      }
    }

    const uniqueEps = [...episodeMap.values()]
    const completedEpisodes = uniqueEps.filter((e) => e.completed).length

    const seriesCompleted =
      totalEpisodes != null &&
      totalEpisodes > 0 &&
      completedEpisodes >= totalEpisodes

    const progressPercent =
      totalEpisodes != null && totalEpisodes > 0
        ? Math.min((completedEpisodes / totalEpisodes) * 100, 100)
        : uniqueEps.length > 0
          ? Math.min(
              (completedEpisodes / Math.max(uniqueEps.length, 1)) * 100,
              99
            )
          : 0

    const resumeTarget = seriesCompleted
      ? latest
      : pickResumeTarget(group, sorted, mediaType, seasonCounts, totalEpisodes)

    series.push({
      id: resumeTarget.id,
      ids: group.map((g) => g.id),
      tmdbId: latest.tmdbId,
      title: latest.title,
      posterPath: latest.posterPath,
      mediaType: latest.mediaType,
      seasonNumber:
        resumeTarget.seasonNumber && resumeTarget.seasonNumber > 0
          ? resumeTarget.seasonNumber
          : null,
      episodeNumber:
        resumeTarget.episodeNumber && resumeTarget.episodeNumber > 0
          ? resumeTarget.episodeNumber
          : null,
      timestamp: resumeTarget.timestamp,
      duration: resumeTarget.duration,
      completed: seriesCompleted,
      progressPercent: seriesCompleted ? 100 : progressPercent,
      completedEpisodes,
      totalEpisodes,
      lastWatched: toIso(latest.lastWatched),
      isSeries: true,
    })
  }

  return [...movies, ...series].sort(
    (a, b) =>
      new Date(b.lastWatched).getTime() - new Date(a.lastWatched).getTime()
  )
}
