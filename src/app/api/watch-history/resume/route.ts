import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { normalizeWatchEpisodeFields } from '@/lib/watch-history-fields'
import { aggregateWatchHistory } from '@/lib/watch-history-aggregate'

const MEDIA_TYPES = new Set(['movie', 'tv', 'anime'])

/**
 * GET /api/watch-history/resume?tmdbId=123&mediaType=tv&season=1&episode=2
 * Optional season/episode: when omitted for tv/anime, returns best series resume target.
 */
export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const tmdbId = parseInt(String(searchParams.get('tmdbId') || ''), 10)
    const mediaType = String(searchParams.get('mediaType') || '')
    const seasonRaw = searchParams.get('season')
    const episodeRaw = searchParams.get('episode')

    if (!Number.isFinite(tmdbId) || tmdbId <= 0 || !MEDIA_TYPES.has(mediaType)) {
      return NextResponse.json(
        { error: 'tmdbId and mediaType are required' },
        { status: 400 }
      )
    }

    const hasEpisodeScope =
      seasonRaw != null ||
      episodeRaw != null ||
      mediaType === 'movie'

    if (hasEpisodeScope) {
      const { seasonNumber, episodeNumber } = normalizeWatchEpisodeFields(
        mediaType,
        seasonRaw != null ? parseInt(seasonRaw, 10) : null,
        episodeRaw != null ? parseInt(episodeRaw, 10) : null
      )

      const entry = await prisma.watchHistory.findFirst({
        where: {
          userId: session.user.id,
          tmdbId,
          mediaType,
          seasonNumber,
          episodeNumber,
        },
      })

      if (!entry) {
        return NextResponse.json({ resume: null })
      }

      return NextResponse.json({
        resume: {
          tmdbId: entry.tmdbId,
          mediaType: entry.mediaType,
          seasonNumber: entry.seasonNumber || null,
          episodeNumber: entry.episodeNumber || null,
          timestamp: entry.timestamp,
          duration: entry.duration,
          completed: entry.completed,
          title: entry.title,
          posterPath: entry.posterPath,
        },
      })
    }

    // Series-level resume (best incomplete episode)
    const rows = await prisma.watchHistory.findMany({
      where: {
        userId: session.user.id,
        tmdbId,
        mediaType,
      },
      orderBy: { lastWatched: 'desc' },
    })

    if (rows.length === 0) {
      return NextResponse.json({ resume: null })
    }

    const aggregated = aggregateWatchHistory(
      rows.map((row) => ({
        id: row.id,
        tmdbId: row.tmdbId,
        title: row.title,
        posterPath: row.posterPath,
        mediaType: row.mediaType,
        seasonNumber: row.seasonNumber,
        episodeNumber: row.episodeNumber,
        timestamp: row.timestamp,
        duration: row.duration,
        completed: row.completed,
        totalEpisodes: row.totalEpisodes,
        seasonEpisodeCounts: Array.isArray(row.seasonEpisodeCounts)
          ? (row.seasonEpisodeCounts as { season: number; episodes: number }[])
          : null,
        lastWatched: row.lastWatched,
      }))
    )
    const match = aggregated.find(
      (item) => item.tmdbId === tmdbId && item.mediaType === mediaType
    )

    if (!match) {
      return NextResponse.json({ resume: null })
    }

    return NextResponse.json({
      resume: {
        tmdbId: match.tmdbId,
        mediaType: match.mediaType,
        seasonNumber: match.seasonNumber,
        episodeNumber: match.episodeNumber,
        timestamp: match.timestamp,
        duration: match.duration,
        completed: match.completed,
        title: match.title,
        posterPath: match.posterPath,
      },
    })
  } catch (error) {
    console.error('Error fetching watch resume:', error)
    return NextResponse.json(
      { error: 'Failed to fetch resume position' },
      { status: 500 }
    )
  }
}
