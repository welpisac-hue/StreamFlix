import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

export async function GET() {
  try {
    const featured = await prisma.featuredContent.findMany({
      orderBy: { order: 'asc' },
    })
    return NextResponse.json({ featured })
  } catch (error) {
    console.error('Featured GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch featured content' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const { tmdbId, title, overview, posterPath, backdropPath, mediaType, badgeText } = body

    const parsedTmdbId = parseInt(String(tmdbId), 10)
    if (!Number.isFinite(parsedTmdbId) || parsedTmdbId <= 0 || !title) {
      return NextResponse.json({ error: 'tmdbId and title required' }, { status: 400 })
    }

    const maxOrder = await prisma.featuredContent.aggregate({
      _max: { order: true },
    })
    const nextOrder = (maxOrder._max.order ?? 0) + 1

    const created = await prisma.featuredContent.create({
      data: {
        tmdbId: parsedTmdbId,
        title: String(title),
        overview: overview ? String(overview) : null,
        posterPath: posterPath ? String(posterPath) : null,
        backdropPath: backdropPath ? String(backdropPath) : null,
        mediaType: mediaType ? String(mediaType) : 'movie',
        badgeText: badgeText ? String(badgeText) : null,
        order: nextOrder,
        isActive: true,
      },
    })

    return NextResponse.json({ item: created }, { status: 201 })
  } catch (error) {
    console.error('Featured POST error:', error)
    return NextResponse.json({ error: 'Failed to create featured item' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    await prisma.featuredContent.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Featured DELETE error:', error)
    return NextResponse.json({ error: 'Failed to delete item' }, { status: 500 })
  }
}
