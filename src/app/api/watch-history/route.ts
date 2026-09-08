import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { tmdb } from '@/lib/tmdb'
import { invalidateRecommendationCache } from '@/lib/recommendation-cache'
import { cleanMediaTitle } from '@/lib/media-title'
import {
  normalizeWatchEpisodeFields,
  resolveWatchTimestamp,
} from '@/lib/watch-history-fields'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mediaType = searchParams.get('mediaType')

    const watchHistory = await prisma.watchHistory.findMany({
      where: {
        userId: session.user.id,
        ...(mediaType === 'anime'
          ? { mediaType: 'anime' }
          : mediaType === 'movies'
            ? { mediaType: { in: ['movie', 'tv'] } }
            : {}),
      },
      orderBy: { lastWatched: 'desc' },
    })

    return NextResponse.json(watchHistory)
  } catch (error) {
    console.error('Error fetching watch history:', error)
    return NextResponse.json(
      { error: 'Failed to fetch watch history' },
      { status: 500 }
    )
  }
}

const MEDIA_TYPES = new Set(['movie', 'tv', 'anime'])

async function fetchMediaMeta(
  mediaType: string,
  tmdbId: number
): Promise<{
  genreIds: number[]
  totalEpisodes: number | null
  seasonEpisodeCounts: { season: number; episodes: number }[] | null
}> {
  try {
    if (mediaType === 'movie') {
      const details = await tmdb.getMovieDetails(tmdbId)
      return {
        genreIds: (details.genres || []).map((g) => g.id),
        totalEpisodes: null,
        seasonEpisodeCounts: null,
      }
    }

    if (mediaType === 'tv') {
      const details = await tmdb.getTVShowDetails(tmdbId)
      const seasonEpisodeCounts = (details.seasons || [])
        .filter((s) => s.season_number > 0 && s.episode_count > 0)
        .map((s) => ({
          season: s.season_number,
          episodes: s.episode_count,
        }))
      return {
        genreIds: (details.genres || []).map((g) => g.id),
        totalEpisodes:
          typeof details.number_of_episodes === 'number' &&
          details.number_of_episodes > 0
            ? details.number_of_episodes
            : null,
        seasonEpisodeCounts:
          seasonEpisodeCounts.length > 0 ? seasonEpisodeCounts : null,
      }
    }

    if (mediaType === 'anime') {
      const { animeApi } = await import('@/lib/anilist')
      const details = await animeApi.getDetails(tmdbId)
      return {
        genreIds: [],
        totalEpisodes:
          details?.episodes && details.episodes > 0 ? details.episodes : null,
        seasonEpisodeCounts: null,
      }
    }
  } catch (error) {
    console.error('Error fetching media meta for watch history:', error)
  }

  return { genreIds: [], totalEpisodes: null, seasonEpisodeCounts: null }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      tmdbId,
      title,
      posterPath,
      mediaType,
      seasonNumber,
      episodeNumber,
      timestamp,
      duration,
    } = body

    const parsedTmdbId = parseInt(String(tmdbId), 10)
    const cleanTitle =
      cleanMediaTitle(String(title || '').trim()).slice(0, 300) ||
      String(title || '').trim().slice(0, 300)
    const cleanMedia = String(mediaType || '')
    const cleanPoster =
      posterPath == null || posterPath === ''
        ? null
        : String(posterPath).trim().slice(0, 500)

    if (
      !Number.isFinite(parsedTmdbId) ||
      parsedTmdbId <= 0 ||
      !cleanTitle ||
      !MEDIA_TYPES.has(cleanMedia)
    ) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      )
    }

    const userId = session.user.id
    const rawSeason =
      seasonNumber !== undefined && seasonNumber !== null
        ? parseInt(String(seasonNumber), 10)
        : null
    const rawEpisode =
      episodeNumber !== undefined && episodeNumber !== null
        ? parseInt(String(episodeNumber), 10)
        : null

    if (
      (rawSeason != null && (!Number.isFinite(rawSeason) || rawSeason < 0)) ||
      (rawEpisode != null && (!Number.isFinite(rawEpisode) || rawEpisode < 0))
    ) {
      return NextResponse.json({ error: 'Invalid episode fields' }, { status: 400 })
    }

    const { seasonNumber: season, episodeNumber: episode } =
      normalizeWatchEpisodeFields(cleanMedia, rawSeason, rawEpisode)

    const episodeWhere = {
      userId,
      tmdbId: parsedTmdbId,
      mediaType: cleanMedia,
      seasonNumber: season,
      episodeNumber: episode,
    }

    const existingEntry = await prisma.watchHistory.findFirst({
      where: episodeWhere,
    })

    const incomingTimestamp =
      typeof timestamp === 'number' && Number.isFinite(timestamp) && timestamp >= 0
        ? Math.min(timestamp, 60 * 60 * 24)
        : 0
    const incomingDuration =
      typeof duration === 'number' && Number.isFinite(duration) && duration >= 0
        ? Math.min(duration, 60 * 60 * 24)
        : 0

    const nextTimestamp = resolveWatchTimestamp(
      existingEntry?.timestamp,
      incomingTimestamp
    )
    const nextDuration = Math.max(
      existingEntry?.duration || 0,
      incomingDuration
    )
    const completed =
      nextDuration >= 60 ? nextTimestamp / nextDuration >= 0.9 : false

    if (existingEntry) {
      const needsMeta =
        (existingEntry.genreIds?.length ?? 0) === 0 ||
        ((cleanMedia === 'tv' || cleanMedia === 'anime') &&
          (existingEntry.totalEpisodes == null ||
            existingEntry.totalEpisodes <= 0)) ||
        (cleanMedia === 'tv' && existingEntry.seasonEpisodeCounts == null)

      let genreIds = existingEntry.genreIds || []
      let totalEpisodes = existingEntry.totalEpisodes
      let seasonEpisodeCounts = existingEntry.seasonEpisodeCounts

      if (needsMeta) {
        const meta = await fetchMediaMeta(cleanMedia, parsedTmdbId)
        if (genreIds.length === 0 && meta.genreIds.length > 0) {
          genreIds = meta.genreIds
        }
        if (
          (totalEpisodes == null || totalEpisodes <= 0) &&
          meta.totalEpisodes
        ) {
          totalEpisodes = meta.totalEpisodes
        }
        if (seasonEpisodeCounts == null && meta.seasonEpisodeCounts) {
          seasonEpisodeCounts = meta.seasonEpisodeCounts
        }
      }

      const updatedEntry = await prisma.watchHistory.update({
        where: { id: existingEntry.id },
        data: {
          timestamp: nextTimestamp,
          duration: nextDuration,
          lastWatched: new Date(),
          completed,
          title: cleanTitle,
          posterPath: cleanPoster,
          genreIds,
          totalEpisodes,
          seasonEpisodeCounts:
            seasonEpisodeCounts === null
              ? undefined
              : (seasonEpisodeCounts as object),
        },
      })

      if (completed && !existingEntry.completed) {
        await invalidateRecommendationCache(userId)
      }

      return NextResponse.json(updatedEntry)
    }

    const meta = await fetchMediaMeta(cleanMedia, parsedTmdbId)

    try {
      const watchHistory = await prisma.watchHistory.create({
        data: {
          userId,
          tmdbId: parsedTmdbId,
          title: cleanTitle,
          posterPath: cleanPoster,
          mediaType: cleanMedia,
          seasonNumber: season,
          episodeNumber: episode,
          timestamp: nextTimestamp,
          duration: nextDuration,
          completed,
          genreIds: meta.genreIds,
          totalEpisodes: meta.totalEpisodes,
          seasonEpisodeCounts: meta.seasonEpisodeCounts ?? undefined,
        },
      })

      await invalidateRecommendationCache(userId)
      return NextResponse.json(watchHistory, { status: 201 })
    } catch (createError: unknown) {
      // Race: another request created the row — update instead
      const code =
        createError &&
        typeof createError === 'object' &&
        'code' in createError
          ? String((createError as { code: string }).code)
          : ''
      if (code !== 'P2002') throw createError

      const racedRow = await prisma.watchHistory.findFirst({
        where: episodeWhere,
      })
      if (!racedRow) throw createError

      const raced = await prisma.watchHistory.update({
        where: { id: racedRow.id },
        data: {
          timestamp: nextTimestamp,
          duration: nextDuration,
          lastWatched: new Date(),
          completed,
          title: cleanTitle,
          posterPath: cleanPoster,
        },
      })
      return NextResponse.json(raced)
    }
  } catch (error) {
    console.error('Error creating watch history:', error)
    return NextResponse.json(
      { error: 'Failed to create watch history' },
      { status: 500 }
    )
  }
}
