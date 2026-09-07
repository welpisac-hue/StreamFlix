import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

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
    const cleanTitle = String(title || '').trim().slice(0, 300)
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
    const parsedSeason =
      seasonNumber !== undefined && seasonNumber !== null
        ? parseInt(String(seasonNumber), 10)
        : null
    const parsedEpisode =
      episodeNumber !== undefined && episodeNumber !== null
        ? parseInt(String(episodeNumber), 10)
        : null

    if (
      (parsedSeason != null &&
        (!Number.isFinite(parsedSeason) || parsedSeason < 0)) ||
      (parsedEpisode != null &&
        (!Number.isFinite(parsedEpisode) || parsedEpisode < 0))
    ) {
      return NextResponse.json({ error: 'Invalid episode fields' }, { status: 400 })
    }

    const existingEntry = await prisma.watchHistory.findFirst({
      where: {
        userId,
        tmdbId: parsedTmdbId,
        mediaType: cleanMedia,
        seasonNumber: parsedSeason,
        episodeNumber: parsedEpisode,
      },
    })

    const incomingTimestamp =
      typeof timestamp === 'number' && Number.isFinite(timestamp) && timestamp >= 0
        ? Math.min(timestamp, 60 * 60 * 24)
        : existingEntry?.timestamp ?? 0
    const incomingDuration =
      typeof duration === 'number' && Number.isFinite(duration) && duration >= 0
        ? Math.min(duration, 60 * 60 * 24)
        : existingEntry?.duration ?? 0

    const nextTimestamp = existingEntry
      ? Math.max(existingEntry.timestamp || 0, incomingTimestamp)
      : incomingTimestamp
    const nextDuration = Math.max(
      existingEntry?.duration || 0,
      incomingDuration
    )
    const completed =
      nextDuration > 0 ? nextTimestamp / nextDuration >= 0.9 : false

    if (existingEntry) {
      const updatedEntry = await prisma.watchHistory.update({
        where: { id: existingEntry.id },
        data: {
          timestamp: nextTimestamp,
          duration: nextDuration,
          lastWatched: new Date(),
          completed,
          title: cleanTitle,
          posterPath: cleanPoster,
        },
      })

      return NextResponse.json(updatedEntry)
    }

    const watchHistory = await prisma.watchHistory.create({
      data: {
        userId,
        tmdbId: parsedTmdbId,
        title: cleanTitle,
        posterPath: cleanPoster,
        mediaType: cleanMedia,
        seasonNumber: parsedSeason,
        episodeNumber: parsedEpisode,
        timestamp: nextTimestamp,
        duration: nextDuration,
        completed: false,
      },
    })

    return NextResponse.json(watchHistory, { status: 201 })
  } catch (error) {
    console.error('Error creating watch history:', error)
    return NextResponse.json(
      { error: 'Failed to create watch history' },
      { status: 500 }
    )
  }
}
