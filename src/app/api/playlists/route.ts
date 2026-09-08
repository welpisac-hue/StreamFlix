import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const playlistId = searchParams.get('id')
    const userId = searchParams.get('userId')

    if (playlistId) {
      const playlist = await prisma.playlist.findUnique({
        where: { id: playlistId },
        include: {
          user: { select: { username: true, id: true } },
          items: { orderBy: { order: 'asc' } },
        },
      })
      if (!playlist) {
        return NextResponse.json({ error: 'Playlist not found' }, { status: 404 })
      }
      return NextResponse.json({ playlist })
    }

    const playlists = await prisma.playlist.findMany({
      where: userId ? { userId } : { isPublic: true },
      orderBy: { createdAt: 'desc' },
      take: 30,
      include: {
        user: { select: { username: true } },
        _count: { select: { items: true } },
      },
    })

    return NextResponse.json({ playlists })
  } catch (error) {
    console.error('Playlists GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch playlists' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = rateLimit(`playlist:create:${session.user.id}`, {
      limit: 15,
      windowMs: 60 * 60 * 1000,
    })
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many playlists created' }, { status: 429 })
    }

    const body = await request.json()
    const { action, title, description, isPublic, playlistId, tmdbId, itemTitle, posterPath, mediaType } = body

    // Create Playlist
    if (action === 'create') {
      if (!title) {
        return NextResponse.json({ error: 'Title required' }, { status: 400 })
      }
      const playlist = await prisma.playlist.create({
        data: {
          userId: session.user.id,
          title: String(title).slice(0, 150),
          description: description ? String(description).slice(0, 500) : null,
          isPublic: isPublic !== false,
        },
      })
      return NextResponse.json({ playlist }, { status: 201 })
    }

    // Add item to Playlist
    if (action === 'addItem') {
      if (!playlistId || !tmdbId || !itemTitle || !mediaType) {
        return NextResponse.json({ error: 'Missing required item fields' }, { status: 400 })
      }

      const playlist = await prisma.playlist.findUnique({
        where: { id: playlistId },
      })
      if (!playlist || playlist.userId !== session.user.id) {
        return NextResponse.json({ error: 'Playlist not found or forbidden' }, { status: 403 })
      }

      const parsedTmdbId = parseInt(String(tmdbId), 10)
      const existing = await prisma.playlistItem.findUnique({
        where: {
          playlistId_tmdbId_mediaType: {
            playlistId,
            tmdbId: parsedTmdbId,
            mediaType,
          },
        },
      })

      if (existing) {
        return NextResponse.json({ message: 'Item already in playlist' }, { status: 200 })
      }

      const item = await prisma.playlistItem.create({
        data: {
          playlistId,
          tmdbId: parsedTmdbId,
          title: String(itemTitle).slice(0, 300),
          posterPath: posterPath ? String(posterPath) : null,
          mediaType: String(mediaType),
        },
      })

      return NextResponse.json({ item }, { status: 201 })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Playlists POST error:', error)
    return NextResponse.json({ error: 'Failed to update playlist' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const { searchParams } = new URL(request.url)
    const playlistId = searchParams.get('id')
    const itemId = searchParams.get('itemId')

    if (itemId) {
      await prisma.playlistItem.delete({ where: { id: itemId } })
      return NextResponse.json({ ok: true })
    }

    if (playlistId) {
      const playlist = await prisma.playlist.findUnique({ where: { id: playlistId } })
      if (!playlist || playlist.userId !== session.user.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
      }
      await prisma.playlist.delete({ where: { id: playlistId } })
      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'id required' }, { status: 400 })
  } catch (error) {
    console.error('Playlists DELETE error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
