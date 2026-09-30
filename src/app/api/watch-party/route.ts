import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

// In-memory active viewers registry: code -> Map<viewerIdOrIp, lastPingTimeMs>
const activeViewersRegistry = new Map<string, Map<string, number>>()

function recordViewerPresence(code: string, viewerId: string): number {
  let roomViewers = activeViewersRegistry.get(code)
  if (!roomViewers) {
    roomViewers = new Map<string, number>()
    activeViewersRegistry.set(code, roomViewers)
  }
  const now = Date.now()
  roomViewers.set(viewerId, now)

  // Prune viewer pings older than 12 seconds
  for (const [id, lastPing] of roomViewers.entries()) {
    if (now - lastPing > 12000) {
      roomViewers.delete(id)
    }
  }

  return Math.max(1, roomViewers.size)
}

function generateRoomCode(): string {
  const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  let code = ''
  for (let i = 0; i < 6; i++) {
    code += chars.charAt(Math.floor(Math.random() * chars.length))
  }
  return code
}

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')?.toUpperCase()

    // Return active rooms for homepage hero
    if (!code) {
      const rooms = await prisma.watchPartyRoom.findMany({
        orderBy: { createdAt: 'desc' },
        take: 1,
        include: {
          host: { select: { username: true, id: true } },
          _count: { select: { messages: true } },
        },
      })
      return NextResponse.json({ rooms })
    }

    const room = await prisma.watchPartyRoom.findUnique({
      where: { code },
      include: {
        host: { select: { username: true, id: true } },
        messages: {
          take: 100,
          orderBy: { createdAt: 'asc' },
          include: { user: { select: { username: true, id: true } } },
        },
      },
    })

    if (!room) {
      return NextResponse.json({ error: 'Watch party room not found' }, { status: 404 })
    }

    // Track active viewer presence
    const session = await getServerSession(authOptions)
    const viewerId = session?.user?.id || request.headers.get('x-forwarded-for') || 'guest-' + request.headers.get('user-agent')?.slice(0, 20) || 'guest'
    const liveViewerCount = recordViewerPresence(code, viewerId)

    // Calculate dynamic live playback time & state
    const now = new Date()
    let liveCurrentTime = room.currentTime
    let liveIsPlaying = room.isPlaying

    if (room.scheduledStartTime) {
      const schedTime = new Date(room.scheduledStartTime).getTime()
      const nowTime = now.getTime()
      if (nowTime < schedTime) {
        liveCurrentTime = 0
        liveIsPlaying = false
      } else {
        // Scheduled time reached! Live position starts counting up
        liveIsPlaying = true
        liveCurrentTime = Math.max(0, (nowTime - schedTime) / 1000)
      }
    } else if (room.isPlaying) {
      const elapsedSec = (now.getTime() - new Date(room.updatedAt).getTime()) / 1000
      liveCurrentTime = Math.max(0, room.currentTime + elapsedSec)
    }

    // Shape messages for the client (flatten user relation)
    const messages = room.messages.map((m: any) => ({
      id: m.id,
      sender: m.user?.username || m.sender || 'User',
      userId: m.userId,
      text: m.text,
      createdAt: m.createdAt,
    }))

    return NextResponse.json({
      room: {
        ...room,
        currentTime: liveCurrentTime,
        isPlaying: liveIsPlaying,
        messages,
        viewerCount: liveViewerCount,
      },
    })
  } catch (error) {
    console.error('Watch party GET error:', error)
    return NextResponse.json({ error: 'Failed to fetch watch party' }, { status: 500 })
  }
}

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    // Only ADMIN users can create watch party rooms
    if (session.user.role !== 'ADMIN') {
      return NextResponse.json(
        { error: 'Only administrators can create Watch Party rooms.' },
        { status: 403 }
      )
    }

    const limited = await rateLimit(`party:create:${session.user.id}`, {
      limit: 20,
      windowMs: 60 * 60 * 1000,
    })
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many party rooms created' }, { status: 429 })
    }

    const body = await request.json()
    const { tmdbId, title, mediaType, seasonNumber, episodeNumber, maxUsers, scheduledInMinutes, provider } = body

    const parsedTmdbId = parseInt(String(tmdbId), 10)
    if (!Number.isFinite(parsedTmdbId) || parsedTmdbId <= 0 || !title || !mediaType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    let code = generateRoomCode()
    let existing = await prisma.watchPartyRoom.findUnique({ where: { code } })
    while (existing) {
      code = generateRoomCode()
      existing = await prisma.watchPartyRoom.findUnique({ where: { code } })
    }

    let scheduledStartTime: Date | null = null
    if (typeof scheduledInMinutes === 'number' && scheduledInMinutes > 0) {
      scheduledStartTime = new Date(Date.now() + scheduledInMinutes * 60 * 1000)
    }

    const room = await prisma.watchPartyRoom.create({
      data: {
        code,
        hostUserId: session.user.id,
        tmdbId: parsedTmdbId,
        title: String(title),
        mediaType: String(mediaType),
        seasonNumber: seasonNumber ? parseInt(String(seasonNumber), 10) : null,
        episodeNumber: episodeNumber ? parseInt(String(episodeNumber), 10) : null,
        maxUsers: maxUsers ? Math.max(2, Math.min(500, parseInt(String(maxUsers), 10))) : 50,
        isPlaying: !scheduledStartTime,
        scheduledStartTime,
        provider: provider === 'cinesrc' ? 'cinesrc' : 'vidcore',
      },
    })

    // Delete any existing WatchHistory entry for this content so watch parties don't populate Continue Watching
    try {
      await prisma.watchHistory.deleteMany({
        where: { userId: session.user.id, tmdbId: parsedTmdbId },
      })
    } catch {
      // Ignore if none
    }

    return NextResponse.json({ room }, { status: 201 })
  } catch (error) {
    console.error('Watch party POST error:', error)
    return NextResponse.json({ error: 'Failed to create watch party' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json()
    const {
      code, action, text, currentTime, isPlaying, muteUserId, isChatMuted,
      chatCooldownSec, scheduledInMinutes, scheduledStartTime
    } = body

    if (!code) {
      return NextResponse.json({ error: 'code required' }, { status: 400 })
    }

    const room = await prisma.watchPartyRoom.findUnique({ where: { code } })
    if (!room) {
      return NextResponse.json({ error: 'Room not found' }, { status: 404 })
    }

    const isHost = room.hostUserId === session.user.id

    // Post chat message
    if (action === 'chat' && text) {
      if (room.isChatMuted && !isHost) {
        return NextResponse.json({ error: 'Chat is currently muted by the host.' }, { status: 403 })
      }
      if (room.mutedUserIds.includes(session.user.id) && !isHost) {
        return NextResponse.json({ error: 'You have been muted in this room.' }, { status: 403 })
      }

      const msg = await prisma.watchPartyMessage.create({
        data: {
          roomId: room.id,
          userId: session.user.id,
          sender: session.user.username || session.user.name || 'User',
          text: String(text).slice(0, 500),
        },
      })
      return NextResponse.json({ ok: true, message: msg })
    }

    // Host-only actions
    if (!isHost) {
      return NextResponse.json({ error: 'Only the host can perform this action' }, { status: 403 })
    }

    // Host manually sets scheduled start time (e.g. starting in X minutes)
    if (action === 'setScheduledTime') {
      let targetTime: Date | null = null
      if (typeof scheduledInMinutes === 'number' && scheduledInMinutes > 0) {
        targetTime = new Date(Date.now() + scheduledInMinutes * 60 * 1000)
      } else if (scheduledStartTime) {
        targetTime = new Date(scheduledStartTime)
      }

      const updated = await prisma.watchPartyRoom.update({
        where: { id: room.id },
        data: {
          scheduledStartTime: targetTime,
          isPlaying: false,
          currentTime: 0,
        },
      })
      return NextResponse.json({ ok: true, room: updated })
    }

    // Host clicks "Start Now" (bypasses countdown and starts live)
    if (action === 'startNow') {
      const now = new Date()
      const updated = await prisma.watchPartyRoom.update({
        where: { id: room.id },
        data: {
          scheduledStartTime: now,
          isPlaying: true,
          currentTime: 0,
        },
      })
      return NextResponse.json({ ok: true, room: updated })
    }

    // Host changes the embed server provider
    if (action === 'setProvider') {
      const newProvider = body.provider === 'cinesrc' ? 'cinesrc' : 'vidcore'
      const updated = await prisma.watchPartyRoom.update({
        where: { id: room.id },
        data: { provider: newProvider },
      })
      return NextResponse.json({ ok: true, room: updated })
    }

    // Sync playback position / state
    if (action === 'sync') {
      const updated = await prisma.watchPartyRoom.update({
        where: { id: room.id },
        data: {
          ...(typeof currentTime === 'number' ? { currentTime } : {}),
          ...(typeof isPlaying === 'boolean' ? { isPlaying } : {}),
          scheduledStartTime: null, // manual override clears countdown
        },
      })
      return NextResponse.json({ ok: true, room: updated })
    }

    // Mute a specific user
    if (action === 'muteUser' && muteUserId) {
      const alreadyMuted = room.mutedUserIds.includes(muteUserId)
      const updated = await prisma.watchPartyRoom.update({
        where: { id: room.id },
        data: {
          mutedUserIds: alreadyMuted
            ? room.mutedUserIds.filter((id) => id !== muteUserId)
            : [...room.mutedUserIds, muteUserId],
        },
      })
      return NextResponse.json({ ok: true, muted: !alreadyMuted, room: updated })
    }

    // Toggle room-wide chat mute
    if (action === 'toggleChatMute') {
      const updated = await prisma.watchPartyRoom.update({
        where: { id: room.id },
        data: { isChatMuted: !room.isChatMuted },
      })
      return NextResponse.json({ ok: true, isChatMuted: updated.isChatMuted })
    }

    // Set chat cooldown
    if (action === 'setCooldown' && typeof chatCooldownSec === 'number') {
      const updated = await prisma.watchPartyRoom.update({
        where: { id: room.id },
        data: { chatCooldownSec: Math.max(0, Math.min(60, chatCooldownSec)) },
      })
      return NextResponse.json({ ok: true, chatCooldownSec: updated.chatCooldownSec })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Watch party PATCH error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }
    const { searchParams } = new URL(request.url)
    const code = searchParams.get('code')
    if (!code) return NextResponse.json({ error: 'code required' }, { status: 400 })

    await prisma.watchPartyRoom.deleteMany({ where: { code } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Watch party DELETE error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}
