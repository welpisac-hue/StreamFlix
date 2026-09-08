import { NextResponse, after } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { tmdb } from '@/lib/tmdb'
import type { Movie, TVShow } from '@/lib/tmdb'
import type { Prisma } from '@prisma/client'
import { cleanMediaTitle } from '@/lib/media-title'

const CACHE_TTL_MS = 2 * 60 * 60 * 1000
const SOFT_REFRESH_MS = 60 * 60 * 1000
const SEVEN_DAYS_MS = 7 * 24 * 60 * 60 * 1000
const ABANDON_DAYS_MS = 14 * 24 * 60 * 60 * 1000
const TWO_HOURS_MS = 2 * 60 * 60 * 1000
/** Hard cap so one genre (e.g. Marvel/Action) can't dominate */
const MAX_PER_PRIMARY_GENRE = 2
const BECAUSE_LIMIT = 16
const RECOMMENDED_LIMIT = 18

type RecItem = (Movie | TVShow) & {
  mediaType: 'movie' | 'tv'
  recScore?: number
  becauseYouWatched?: string
  seedGenreIds?: number[]
}

type RecPayload = {
  becauseYouWatched: { title: string; items: RecItem[] } | null
  recommended: RecItem[]
}

function shuffle<T>(arr: T[]): T[] {
  const copy = [...arr]
  for (let i = copy.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[copy[i], copy[j]] = [copy[j], copy[i]]
  }
  return copy
}

function progressRatio(timestamp: number, duration: number): number {
  if (!duration || duration <= 0) return 0
  return Math.min(timestamp / duration, 1)
}

function scoreTitle(opts: {
  completed: boolean
  progress: number
  highRating: boolean
  lowRating: boolean
  inWatchLater: boolean
  abandoned: boolean
  lastWatched: Date
}): number {
  if (opts.abandoned && !opts.highRating && !opts.inWatchLater) return -5

  let base = 1
  if (opts.completed) base = 4
  else if (opts.progress > 0.5) base = 2
  else if (opts.progress < 0.1) base = 0.25

  if (opts.highRating) base += 5
  if (opts.lowRating) base -= 3
  if (opts.inWatchLater) base += 3

  const recent =
    Date.now() - opts.lastWatched.getTime() <= SEVEN_DAYS_MS ? 1.5 : 1
  return base * recent
}

function stripMeta(item: RecItem): RecItem {
  const { recScore: _s, seedGenreIds: _g, ...rest } = item
  return rest as RecItem
}

function applyDiversity(items: RecItem[], limit: number): RecItem[] {
  const picked: RecItem[] = []
  const genreCounts = new Map<number, number>()
  const deferred: RecItem[] = []
  let movies = 0
  let shows = 0

  for (const item of items) {
    const genres = item.genre_ids?.length
      ? item.genre_ids
      : item.seedGenreIds || []
    const primary = genres[0]

    // Keep movie/TV mix roughly balanced
    if (item.mediaType === 'movie' && movies >= Math.ceil(limit * 0.65)) {
      deferred.push(item)
      continue
    }
    if (item.mediaType === 'tv' && shows >= Math.ceil(limit * 0.65)) {
      deferred.push(item)
      continue
    }

    if (primary != null) {
      const count = genreCounts.get(primary) || 0
      if (count >= MAX_PER_PRIMARY_GENRE) {
        deferred.push(item)
        continue
      }
      genreCounts.set(primary, count + 1)
    }

    picked.push(item)
    if (item.mediaType === 'movie') movies++
    else shows++
    if (picked.length >= limit) break
  }

  for (const item of deferred) {
    if (picked.length >= limit) break
    picked.push(item)
  }

  return picked
}

async function persistCache(userId: string, payload: RecPayload) {
  const clean: RecPayload = {
    becauseYouWatched: payload.becauseYouWatched
      ? {
          title: payload.becauseYouWatched.title,
          items: payload.becauseYouWatched.items.map(stripMeta),
        }
      : null,
    recommended: payload.recommended.map(stripMeta),
  }
  await prisma.userPreferences.upsert({
    where: { userId },
    create: {
      userId,
      favoriteGenres: [],
      preferredMoods: [],
      watchHistory: [],
      cachedRecs: clean as unknown as Prisma.InputJsonValue,
      cachedRecsAt: new Date(),
    },
    update: {
      cachedRecs: clean as unknown as Prisma.InputJsonValue,
      cachedRecsAt: new Date(),
    },
  })
}

function isRecPayload(value: unknown): value is RecPayload {
  return (
    !!value &&
    typeof value === 'object' &&
    !Array.isArray(value) &&
    'recommended' in value
  )
}

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const userId = session.user.id

    const [watchHistory, reviews, watchLater, preferences] = await Promise.all([
      prisma.watchHistory.findMany({
        where: { userId, mediaType: { in: ['movie', 'tv'] } },
        orderBy: { lastWatched: 'desc' },
      }),
      prisma.review.findMany({ where: { userId } }),
      prisma.watchLater.findMany({
        where: { userId, mediaType: { in: ['movie', 'tv'] } },
      }),
      prisma.userPreferences.findUnique({ where: { userId } }),
    ])

    const cacheAge = preferences?.cachedRecsAt
      ? Date.now() - preferences.cachedRecsAt.getTime()
      : Infinity
    const cachedRaw = preferences?.cachedRecs

    if (
      isRecPayload(cachedRaw) &&
      cacheAge < CACHE_TTL_MS &&
      ((cachedRaw.becauseYouWatched?.items.length || 0) > 0 ||
        cachedRaw.recommended.length > 0)
    ) {
      if (cacheAge >= SOFT_REFRESH_MS) {
        after(async () => {
          try {
            const fresh = await generateRecommendations({
              watchHistory,
              reviews,
              watchLater,
            })
            await persistCache(userId, fresh)
          } catch (err) {
            console.error('Soft recommendation refresh failed:', err)
          }
        })
      }
      return NextResponse.json({
        becauseYouWatched: cachedRaw.becauseYouWatched
          ? {
              title: cachedRaw.becauseYouWatched.title,
              items: shuffle(cachedRaw.becauseYouWatched.items),
            }
          : null,
        recommended: shuffle(cachedRaw.recommended),
      })
    }

    const recommendations = await generateRecommendations({
      watchHistory,
      reviews,
      watchLater,
    })

    await persistCache(userId, recommendations)

    return NextResponse.json({
      becauseYouWatched: recommendations.becauseYouWatched
        ? {
            title: recommendations.becauseYouWatched.title,
            items: shuffle(
              recommendations.becauseYouWatched.items.map(stripMeta)
            ),
          }
        : null,
      recommended: shuffle(recommendations.recommended.map(stripMeta)),
    })
  } catch (error) {
    console.error('Error generating recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}

async function generateRecommendations(input: {
  watchHistory: Array<{
    tmdbId: number
    mediaType: string
    title: string
    timestamp: number
    duration: number
    completed: boolean
    genreIds: number[]
    lastWatched: Date
  }>
  reviews: Array<{ tmdbId: number; rating: number }>
  watchLater: Array<{ tmdbId: number; mediaType: string }>
}): Promise<RecPayload> {
  const { watchHistory, reviews, watchLater } = input

  const watchedIds = new Set(watchHistory.map((h) => h.tmdbId))
  const reviewByTmdb = new Map(reviews.map((r) => [r.tmdbId, r.rating]))
  const watchLaterKeys = new Set(
    watchLater.map((w) => `${w.mediaType}:${w.tmdbId}`)
  )

  type Seed = {
    tmdbId: number
    mediaType: 'movie' | 'tv'
    score: number
    genreIds: number[]
    title: string
    maxProgress: number
    visitCount: number
    lastWatched: Date
  }

  const seedMap = new Map<string, Seed>()

  for (const item of watchHistory) {
    if (item.mediaType !== 'movie' && item.mediaType !== 'tv') continue
    const key = `${item.mediaType}:${item.tmdbId}`
    const progress = progressRatio(item.timestamp, item.duration)
    const existing = seedMap.get(key)
    const visitCount = (existing?.visitCount || 0) + 1
    const maxProgress = Math.max(existing?.maxProgress || 0, progress)
    const lastWatched =
      !existing || item.lastWatched > existing.lastWatched
        ? item.lastWatched
        : existing.lastWatched

    const abandoned =
      maxProgress < 0.1 &&
      !item.completed &&
      Date.now() - lastWatched.getTime() > ABANDON_DAYS_MS &&
      visitCount <= 2

    const score = scoreTitle({
      completed: item.completed || maxProgress >= 0.9,
      progress: maxProgress,
      highRating: (reviewByTmdb.get(item.tmdbId) ?? 0) >= 8,
      lowRating: (reviewByTmdb.get(item.tmdbId) ?? 10) <= 3,
      inWatchLater: watchLaterKeys.has(key),
      abandoned,
      lastWatched,
    })

    const cleanTitle = cleanMediaTitle(item.title || existing?.title || '')

    if (!existing || score > existing.score) {
      seedMap.set(key, {
        tmdbId: item.tmdbId,
        mediaType: item.mediaType,
        score,
        genreIds: item.genreIds?.length
          ? item.genreIds
          : existing?.genreIds || [],
        title: cleanTitle || existing?.title || '',
        maxProgress,
        visitCount,
        lastWatched,
      })
    } else {
      existing.visitCount = visitCount
      existing.maxProgress = maxProgress
      existing.lastWatched = lastWatched
      if (item.genreIds?.length && !existing.genreIds.length) {
        existing.genreIds = item.genreIds
      }
      if (cleanTitle && (!existing.title || existing.title.length < cleanTitle.length)) {
        // Prefer shorter cleaned title if we had episode suffix before
        existing.title = cleanMediaTitle(existing.title) || cleanTitle
      }
      const aggAbandoned =
        existing.maxProgress < 0.1 &&
        Date.now() - existing.lastWatched.getTime() > ABANDON_DAYS_MS &&
        existing.visitCount <= 2
      existing.score = scoreTitle({
        completed: item.completed,
        progress: existing.maxProgress,
        highRating: (reviewByTmdb.get(item.tmdbId) ?? 0) >= 8,
        lowRating: (reviewByTmdb.get(item.tmdbId) ?? 10) <= 3,
        inWatchLater: watchLaterKeys.has(key),
        abandoned: aggAbandoned,
        lastWatched: existing.lastWatched,
      })
    }
  }

  for (const item of watchLater) {
    if (item.mediaType !== 'movie' && item.mediaType !== 'tv') continue
    const key = `${item.mediaType}:${item.tmdbId}`
    if (seedMap.has(key)) continue
    seedMap.set(key, {
      tmdbId: item.tmdbId,
      mediaType: item.mediaType as 'movie' | 'tv',
      score: scoreTitle({
        completed: false,
        progress: 0,
        highRating: (reviewByTmdb.get(item.tmdbId) ?? 0) >= 8,
        lowRating: false,
        inWatchLater: true,
        abandoned: false,
        lastWatched: new Date(),
      }),
      genreIds: [],
      title: '',
      maxProgress: 0,
      visitCount: 0,
      lastWatched: new Date(),
    })
  }

  const positiveSeeds = [...seedMap.values()]
    .filter((s) => s.score > 0)
    .sort((a, b) => b.score - a.score)

  if (positiveSeeds.length === 0) {
    const trending = await fallbackTrending(watchedIds)
    return { becauseYouWatched: null, recommended: trending }
  }

  // Rotate which seed powers the "Because you watched" row every 2 hours
  const slot = Math.floor(Date.now() / TWO_HOURS_MS)
  const primaryPool = positiveSeeds.slice(0, Math.min(5, positiveSeeds.length))
  const primarySeed = primaryPool[slot % primaryPool.length]

  // Extra seeds for the general recommended mix (different titles/genres)
  const supportSeeds = positiveSeeds
    .filter((s) => s.tmdbId !== primarySeed.tmdbId)
    .slice(0, 3)

  const becauseMap = new Map<string, RecItem>()
  const generalMap = new Map<string, RecItem>()

  const addTo = (
    map: Map<string, RecItem>,
    items: Array<Movie | TVShow>,
    mediaType: 'movie' | 'tv',
    weight: number,
    becauseLabel?: string
  ) => {
    for (const item of items) {
      if (!item?.id || watchedIds.has(item.id)) continue
      // Don't recommend the seed itself
      if (item.id === primarySeed.tmdbId) continue
      const key = `${mediaType}:${item.id}`
      const vote = item.vote_average || 0
      const pop = item.popularity || 0
      const recScore = vote * 2 + Math.log10(pop + 1) * weight
      const existing = map.get(key)
      if (!existing || recScore > (existing.recScore || 0)) {
        map.set(key, {
          ...item,
          mediaType,
          recScore,
          becauseYouWatched: becauseLabel,
          seedGenreIds: item.genre_ids,
        })
      }
    }
  }

  // Primary seed → TMDB recommendations + similar (true "if you liked X" signal)
  try {
    if (primarySeed.mediaType === 'movie') {
      const [recs, similar] = await Promise.all([
        tmdb.getMovieRecommendations(primarySeed.tmdbId),
        tmdb.getMovieSimilar(primarySeed.tmdbId),
      ])
      addTo(becauseMap, recs, 'movie', 4, primarySeed.title)
      addTo(becauseMap, similar, 'movie', 3, primarySeed.title)
      // Cross-media: also try TV discover from seed genres for variety inside the row
      if (primarySeed.genreIds[0]) {
        const tv = await tmdb.discoverTV({ genre: primarySeed.genreIds[0] })
        addTo(becauseMap, tv.slice(0, 6), 'tv', 1.5, primarySeed.title)
      }
    } else {
      const [recs, similar] = await Promise.all([
        tmdb.getTVRecommendations(primarySeed.tmdbId),
        tmdb.getTVSimilar(primarySeed.tmdbId),
      ])
      addTo(becauseMap, recs, 'tv', 4, primarySeed.title)
      addTo(becauseMap, similar, 'tv', 3, primarySeed.title)
      if (primarySeed.genreIds[0]) {
        const movies = await tmdb.discoverMovies({
          genre: primarySeed.genreIds[0],
        })
        addTo(becauseMap, movies.slice(0, 6), 'movie', 1.5, primarySeed.title)
      }
    }
  } catch (error) {
    console.error('Primary seed recommendations failed:', error)
  }

  // Support seeds → general recommended pool (no because label)
  await Promise.all(
    supportSeeds.map(async (seed) => {
      try {
        if (seed.mediaType === 'movie') {
          const recs = await tmdb.getMovieRecommendations(seed.tmdbId)
          addTo(generalMap, recs, 'movie', 2.5)
        } else {
          const recs = await tmdb.getTVRecommendations(seed.tmdbId)
          addTo(generalMap, recs, 'tv', 2.5)
        }
      } catch {
        // ignore
      }
    })
  )

  // Genre filler from multiple different seed genres (not just one)
  const genreSet = new Set<number>()
  for (const seed of [primarySeed, ...supportSeeds]) {
    for (const g of seed.genreIds || []) genreSet.add(g)
  }
  const fillerGenres = [...genreSet].slice(0, 4)

  if (fillerGenres.length > 0) {
    await Promise.all(
      fillerGenres.map(async (genreId) => {
        try {
          const [movies, shows] = await Promise.all([
            tmdb.discoverMovies({ genre: genreId }),
            tmdb.discoverTV({ genre: genreId }),
          ])
          addTo(generalMap, movies.slice(0, 5), 'movie', 1)
          addTo(generalMap, shows.slice(0, 5), 'tv', 1)
        } catch {
          // ignore
        }
      })
    )
  }

  let becauseItems = applyDiversity(
    [...becauseMap.values()].sort((a, b) => (b.recScore || 0) - (a.recScore || 0)),
    BECAUSE_LIMIT
  )

  const becauseKeys = new Set(
    becauseItems.map((i) => `${i.mediaType}:${i.id}`)
  )

  let recommended = applyDiversity(
    [...generalMap.values()]
      .filter((i) => !becauseKeys.has(`${i.mediaType}:${i.id}`))
      .sort((a, b) => (b.recScore || 0) - (a.recScore || 0)),
    RECOMMENDED_LIMIT
  )

  if (recommended.length < 8) {
    const trending = await fallbackTrending(watchedIds)
    for (const item of trending) {
      const key = `${item.mediaType}:${item.id}`
      if (becauseKeys.has(key)) continue
      if (recommended.some((r) => `${r.mediaType}:${r.id}` === key)) continue
      recommended.push(item)
      if (recommended.length >= RECOMMENDED_LIMIT) break
    }
    recommended = applyDiversity(recommended, RECOMMENDED_LIMIT)
  }

  if (becauseItems.length < 4) {
    // Fall back: use some general recs under the because label
    const fill = recommended
      .filter((i) => !becauseKeys.has(`${i.mediaType}:${i.id}`))
      .slice(0, BECAUSE_LIMIT - becauseItems.length)
      .map((i) => ({
        ...i,
        becauseYouWatched: primarySeed.title,
      }))
    becauseItems = [...becauseItems, ...fill]
    const used = new Set(becauseItems.map((i) => `${i.mediaType}:${i.id}`))
    recommended = recommended.filter(
      (i) => !used.has(`${i.mediaType}:${i.id}`)
    )
  }

  return {
    becauseYouWatched:
      primarySeed.title && becauseItems.length > 0
        ? {
            title: primarySeed.title,
            items: becauseItems,
          }
        : null,
    recommended,
  }
}

async function fallbackTrending(watchedIds: Set<number>): Promise<RecItem[]> {
  try {
    const [movies, shows] = await Promise.all([
      tmdb.getTrendingMovies(),
      tmdb.getTrendingTV(),
    ])
    const out: RecItem[] = []
    for (const m of movies) {
      if (!watchedIds.has(m.id)) out.push({ ...m, mediaType: 'movie' })
    }
    for (const t of shows) {
      if (!watchedIds.has(t.id)) out.push({ ...t, mediaType: 'tv' })
    }
    return applyDiversity(out, RECOMMENDED_LIMIT)
  } catch (error) {
    console.error('Trending fallback failed:', error)
    return []
  }
}
