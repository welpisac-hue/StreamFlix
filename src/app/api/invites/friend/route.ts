import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import {
  formatRemaining,
  friendInviteCooldownMs,
  generateFriendInviteCode,
  nextCooldownPreview,
  resolveInviteAvailability,
} from '@/lib/friend-invites'
import { clientKey, rateLimit } from '@/lib/rate-limit'

async function getFriendInviteStatus(userId: string) {
  const [createdInvites, pending, redemption, user] = await Promise.all([
    prisma.inviteCode.findMany({
      where: { createdById: userId, kind: 'FRIEND' },
      orderBy: { createdAt: 'desc' },
      include: {
        redemptions: {
          include: {
            user: { select: { id: true, username: true, name: true } },
          },
        },
      },
    }),
    prisma.inviteCode.findFirst({
      where: {
        createdById: userId,
        kind: 'FRIEND',
        isActive: true,
        usedCount: 0,
      },
      orderBy: { createdAt: 'desc' },
    }),
    prisma.inviteRedemption.findUnique({
      where: { userId },
      include: {
        inviteCode: { select: { kind: true } },
      },
    }),
    prisma.user.findUnique({
      where: { id: userId },
      select: { createdAt: true },
    }),
  ])

  const redeemedCount = createdInvites.reduce(
    (sum, invite) => sum + invite.redemptions.length,
    0
  )
  const createdCount = createdInvites.length
  const lastCreated = createdInvites[0] || null
  const wasFriendInvited = redemption?.inviteCode.kind === 'FRIEND'
  const joinedAt = redemption?.redeemedAt ?? user?.createdAt ?? new Date()

  const { nextAvailableAt, remainingMs, firstInviteGate } =
    resolveInviteAvailability({
      createdCount,
      redeemedCount,
      lastCreatedAt: lastCreated?.createdAt ?? null,
      wasFriendInvited,
      joinedAt,
    })

  const canCreate = !pending && remainingMs <= 0

  let reason: string | null = null
  if (pending) {
    reason = 'You already have an unused invite waiting to be redeemed.'
  } else if (remainingMs > 0 && firstInviteGate && createdCount === 0) {
    reason = `Friend-invited accounts wait 30 days before generating their first invite. Available in ${formatRemaining(remainingMs)}.`
  } else if (remainingMs > 0) {
    reason = `Next invite available in ${formatRemaining(remainingMs)}.`
  }

  return {
    canCreate,
    reason,
    wasFriendInvited,
    firstInviteGate: firstInviteGate && remainingMs > 0 && createdCount === 0,
    redeemedCount,
    createdCount,
    cooldownMs: friendInviteCooldownMs(redeemedCount),
    cooldownLabel: firstInviteGate && createdCount === 0
      ? '30 days (friend invite)'
      : nextCooldownPreview(redeemedCount),
    nextCooldownAfterRedeem: nextCooldownPreview(redeemedCount + 1),
    nextAvailableAt: nextAvailableAt?.toISOString() ?? null,
    remainingMs,
    pending: pending
      ? {
          id: pending.id,
          code: pending.code,
          createdAt: pending.createdAt.toISOString(),
        }
      : null,
    invites: createdInvites.map((invite) => ({
      id: invite.id,
      code: invite.code,
      createdAt: invite.createdAt.toISOString(),
      isActive: invite.isActive,
      usedCount: invite.usedCount,
      maxUses: invite.maxUses,
      redeemedBy: invite.redemptions.map((r) => ({
        id: r.user.id,
        username: r.user.username,
        name: r.user.name,
        redeemedAt: r.redeemedAt.toISOString(),
      })),
    })),
  }
}

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limited = rateLimit(`friend-invite:get:${session.user.id}`, {
    limit: 60,
    windowMs: 60_000,
  })
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      {
        status: 429,
        headers: { 'Retry-After': String(limited.retryAfterSec) },
      }
    )
  }

  try {
    const status = await getFriendInviteStatus(session.user.id)
    return NextResponse.json(status)
  } catch (error) {
    console.error('Friend invite GET error:', error)
    return NextResponse.json(
      { error: 'Failed to load invite status' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limited = rateLimit(
    `friend-invite:post:${session.user.id}:${clientKey(request)}`,
    { limit: 5, windowMs: 60_000 }
  )
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests. Try again later.' },
      {
        status: 429,
        headers: { 'Retry-After': String(limited.retryAfterSec) },
      }
    )
  }

  try {
    const userId = session.user.id
    const status = await getFriendInviteStatus(userId)

    if (!status.canCreate) {
      return NextResponse.json(
        { error: status.reason || 'Cannot create invite right now' },
        { status: 400 }
      )
    }

    const username = session.user.username || 'USER'
    let code = generateFriendInviteCode(username)
    for (let i = 0; i < 5; i++) {
      const exists = await prisma.inviteCode.findUnique({ where: { code } })
      if (!exists) break
      code = generateFriendInviteCode(username)
    }

    const invite = await prisma.inviteCode.create({
      data: {
        code,
        kind: 'FRIEND',
        createdById: userId,
        maxUses: 1,
        usedCount: 0,
        isActive: true,
        grantsAdmin: false,
        note: `Friend invite from @${username}`,
      },
    })

    const refreshed = await getFriendInviteStatus(userId)

    return NextResponse.json(
      {
        invite: {
          id: invite.id,
          code: invite.code,
          createdAt: invite.createdAt.toISOString(),
        },
        ...refreshed,
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Friend invite POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    )
  }
}
