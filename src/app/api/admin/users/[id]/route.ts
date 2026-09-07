import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

type Params = { params: Promise<{ id: string }> }

export async function GET(_request: Request, { params }: Params) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const { id } = await params

  try {
    const user = await prisma.user.findUnique({
      where: { id },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        image: true,
        bannedAt: true,
        banReason: true,
        lastLoginAt: true,
        lastLogoutAt: true,
        adminMessage: true,
        adminMessageAt: true,
        createdAt: true,
        inviteRedemption: {
          select: {
            redeemedAt: true,
            inviteCode: { select: { code: true, kind: true } },
          },
        },
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const [recentWatches, watchLater] = await Promise.all([
      prisma.watchHistory.findMany({
        where: { userId: id },
        orderBy: { lastWatched: 'desc' },
        take: 30,
      }),
      prisma.watchLater.findMany({
        where: { userId: id },
        orderBy: { addedAt: 'desc' },
        take: 50,
      }),
    ])

    return NextResponse.json({
      user: {
        ...user,
        bannedAt: user.bannedAt?.toISOString() ?? null,
        lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
        lastLogoutAt: user.lastLogoutAt?.toISOString() ?? null,
        adminMessageAt: user.adminMessageAt?.toISOString() ?? null,
        createdAt: user.createdAt.toISOString(),
        inviteRedemption: user.inviteRedemption
          ? {
              ...user.inviteRedemption,
              redeemedAt: user.inviteRedemption.redeemedAt.toISOString(),
            }
          : null,
      },
      recentWatches: recentWatches.map((w) => ({
        ...w,
        lastWatched: w.lastWatched.toISOString(),
      })),
      watchLater: watchLater.map((w) => ({
        ...w,
        addedAt: w.addedAt.toISOString(),
      })),
    })
  } catch (error) {
    console.error('Admin user detail error:', error)
    return NextResponse.json({ error: 'Failed to load user' }, { status: 500 })
  }
}
