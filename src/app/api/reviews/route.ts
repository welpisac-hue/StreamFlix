import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import { invalidateRecommendationCache } from '@/lib/recommendation-cache'

const userSelect = {
  id: true,
  name: true,
  username: true,
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const tmdbId = searchParams.get('tmdbId')

    if (!tmdbId) {
      return NextResponse.json(
        { error: 'TMDB ID is required' },
        { status: 400 }
      )
    }

    const parsedTmdbId = parseInt(tmdbId, 10)
    if (!Number.isFinite(parsedTmdbId) || parsedTmdbId <= 0) {
      return NextResponse.json({ error: 'Invalid TMDB ID' }, { status: 400 })
    }

    const reviews = await prisma.review.findMany({
      where: { tmdbId: parsedTmdbId },
      include: {
        user: { select: userSelect },
      },
      orderBy: {
        createdAt: 'desc',
      },
      take: 100,
    })

    return NextResponse.json(reviews)
  } catch (error) {
    console.error('Error fetching reviews:', error)
    return NextResponse.json(
      { error: 'Failed to fetch reviews' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await rateLimit(`reviews:post:${session.user.id}`, {
      limit: 20,
      windowMs: 60 * 60 * 1000,
    })
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'Too many reviews. Try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(limited.retryAfterSec) },
        }
      )
    }

    const body = await request.json()
    const title = String(body.title || '').trim().slice(0, 120)
    const comment = String(body.comment || '').trim().slice(0, 2000)
    const rating = Number(body.rating)
    const parsedTmdbId = parseInt(String(body.tmdbId), 10)

    if (
      !Number.isFinite(parsedTmdbId) ||
      parsedTmdbId <= 0 ||
      !title ||
      !comment ||
      !Number.isInteger(rating) ||
      rating < 1 ||
      rating > 10
    ) {
      return NextResponse.json(
        { error: 'Invalid review fields' },
        { status: 400 }
      )
    }

    const review = await prisma.review.upsert({
      where: {
        userId_tmdbId: {
          userId: session.user.id,
          tmdbId: parsedTmdbId,
        },
      },
      update: {
        title,
        rating,
        comment,
      },
      create: {
        userId: session.user.id,
        tmdbId: parsedTmdbId,
        title,
        rating,
        comment,
      },
      include: {
        user: { select: userSelect },
      },
    })

    if (rating >= 8) {
      await invalidateRecommendationCache(session.user.id)
    }

    return NextResponse.json(review)
  } catch (error) {
    console.error('Error creating review:', error)
    return NextResponse.json(
      { error: 'Failed to create review' },
      { status: 500 }
    )
  }
}
