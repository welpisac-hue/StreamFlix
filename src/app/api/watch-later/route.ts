import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { invalidateRecommendationCache } from '@/lib/recommendation-cache'

export async function GET(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const mediaType = searchParams.get('mediaType')

    const watchLater = await prisma.watchLater.findMany({
      where: {
        userId: session.user.id,
        ...(mediaType === 'anime'
          ? { mediaType: 'anime' }
          : mediaType === 'movies'
            ? { mediaType: { in: ['movie', 'tv'] } }
            : {}),
      },
      orderBy: { addedAt: 'desc' },
    })

    return NextResponse.json(watchLater)
  } catch (error) {
    console.error('Error fetching watch later:', error)
    return NextResponse.json(
      { error: 'Failed to fetch watch later' },
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
    const parsedTmdbId = parseInt(String(body.tmdbId), 10)
    const title = String(body.title || '').trim().slice(0, 300)
    const mediaType = String(body.mediaType || '')
    const posterPath =
      body.posterPath == null || body.posterPath === ''
        ? null
        : String(body.posterPath).trim().slice(0, 500)

    if (
      !Number.isFinite(parsedTmdbId) ||
      parsedTmdbId <= 0 ||
      !title ||
      !MEDIA_TYPES.has(mediaType)
    ) {
      return NextResponse.json(
        { error: 'Missing or invalid required fields' },
        { status: 400 }
      )
    }

    const userId = session.user.id

    const existingEntry = await prisma.watchLater.findUnique({
      where: {
        userId_tmdbId_mediaType: {
          userId,
          tmdbId: parsedTmdbId,
          mediaType,
        },
      },
    })

    if (existingEntry) {
      await prisma.watchLater.delete({
        where: { id: existingEntry.id },
      })

      await invalidateRecommendationCache(userId)

      return NextResponse.json({
        message: 'Removed from watch later',
        removed: true,
      })
    }

    const watchLater = await prisma.watchLater.create({
      data: {
        userId,
        tmdbId: parsedTmdbId,
        title,
        posterPath,
        mediaType,
      },
    })

    await invalidateRecommendationCache(userId)

    return NextResponse.json(
      { ...watchLater, message: 'Added to watch later', removed: false },
      { status: 201 }
    )
  } catch (error) {
    console.error('Error updating watch later:', error)
    return NextResponse.json(
      { error: 'Failed to update watch later' },
      { status: 500 }
    )
  }
}
