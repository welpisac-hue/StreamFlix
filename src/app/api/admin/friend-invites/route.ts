import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import {
  formatCooldownDuration,
  friendInviteCooldownMs,
} from '@/lib/friend-invites'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const [friendInvites, users] = await Promise.all([
      prisma.inviteCode.findMany({
        where: { kind: 'FRIEND' },
        orderBy: { createdAt: 'desc' },
        include: {
          createdBy: { select: { id: true, username: true, role: true } },
          redemptions: {
            include: {
              user: { select: { id: true, username: true } },
            },
          },
        },
      }),
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        select: {
          id: true,
          username: true,
          role: true,
          createdAt: true,
          createdInvites: {
            where: { kind: 'FRIEND' },
            select: {
              id: true,
              usedCount: true,
              createdAt: true,
              _count: { select: { redemptions: true } },
            },
          },
        },
      }),
    ])

    const userStats = users
      .map((user) => {
        const created = user.createdInvites.length
        const redeemed = user.createdInvites.reduce(
          (sum, inv) => sum + inv._count.redemptions,
          0
        )
        const pending = user.createdInvites.filter(
          (inv) => inv.usedCount === 0
        ).length
        const lastCreated = user.createdInvites.reduce<Date | null>(
          (latest, inv) => {
            if (!latest || inv.createdAt > latest) return inv.createdAt
            return latest
          },
          null
        )
        const cooldownMs = friendInviteCooldownMs(redeemed)
        let nextAvailableAt: string | null = null
        if (lastCreated && cooldownMs > 0) {
          nextAvailableAt = new Date(
            lastCreated.getTime() + cooldownMs
          ).toISOString()
        }

        return {
          id: user.id,
          username: user.username,
          role: user.role,
          createdAt: user.createdAt.toISOString(),
          friendInvitesCreated: created,
          friendsInvited: redeemed,
          pendingInvites: pending,
          currentCooldown: formatCooldownDuration(cooldownMs),
          nextAvailableAt,
        }
      })
      .sort((a, b) => b.friendsInvited - a.friendsInvited || b.friendInvitesCreated - a.friendInvitesCreated)

    return NextResponse.json({
      summary: {
        totalFriendInvites: friendInvites.length,
        redeemedFriendInvites: friendInvites.filter((i) => i.usedCount > 0)
          .length,
        pendingFriendInvites: friendInvites.filter(
          (i) => i.isActive && i.usedCount === 0
        ).length,
        usersWhoInvited: userStats.filter((u) => u.friendInvitesCreated > 0)
          .length,
      },
      invites: friendInvites.map((invite) => ({
        id: invite.id,
        code: invite.code,
        createdAt: invite.createdAt.toISOString(),
        isActive: invite.isActive,
        usedCount: invite.usedCount,
        maxUses: invite.maxUses,
        createdBy: invite.createdBy,
        redeemedBy: invite.redemptions.map((r) => ({
          id: r.user.id,
          username: r.user.username,
          redeemedAt: r.redeemedAt.toISOString(),
        })),
      })),
      userStats,
    })
  } catch (error) {
    console.error('Admin friend-invites error:', error)
    return NextResponse.json(
      { error: 'Failed to load friend invite audit' },
      { status: 500 }
    )
  }
}
