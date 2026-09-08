import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id || session.user.role !== 'ADMIN') {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 })
    }

    const [signups, reviews, reports, parties, watches] = await Promise.all([
      prisma.user.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        select: { id: true, username: true, createdAt: true },
      }),
      prisma.review.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { username: true } } },
      }),
      prisma.streamReport.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { user: { select: { username: true } } },
      }),
      prisma.watchPartyRoom.findMany({
        take: 10,
        orderBy: { createdAt: 'desc' },
        include: { host: { select: { username: true } } },
      }),
      prisma.watchHistory.findMany({
        take: 10,
        orderBy: { lastWatched: 'desc' },
        include: { user: { select: { username: true } } },
      }),
    ])

    const activities: Array<{
      id: string
      type: 'signup' | 'review' | 'report' | 'party' | 'watch'
      user: string
      title: string
      time: string
      timestamp: Date
    }> = []

    for (const u of signups) {
      activities.push({
        id: `signup-${u.id}`,
        type: 'signup',
        user: u.username,
        title: 'New Account Registered',
        time: u.createdAt.toISOString(),
        timestamp: u.createdAt,
      })
    }

    for (const r of reviews) {
      activities.push({
        id: `review-${r.id}`,
        type: 'review',
        user: r.user.username,
        title: `Rated "${r.title}" (${r.rating} Stars)`,
        time: r.createdAt.toISOString(),
        timestamp: r.createdAt,
      })
    }

    for (const rep of reports) {
      activities.push({
        id: `report-${rep.id}`,
        type: 'report',
        user: rep.user?.username || 'Guest',
        title: `Reported issue on item #${rep.tmdbId} (${rep.issueType})`,
        time: rep.createdAt.toISOString(),
        timestamp: rep.createdAt,
      })
    }

    for (const wp of parties) {
      activities.push({
        id: `party-${wp.id}`,
        type: 'party',
        user: wp.host.username,
        title: `Created Watch Party for "${wp.title}"`,
        time: wp.createdAt.toISOString(),
        timestamp: wp.createdAt,
      })
    }

    for (const w of watches) {
      activities.push({
        id: `watch-${w.id}`,
        type: 'watch',
        user: w.user.username,
        title: `Watched "${w.title}"`,
        time: w.lastWatched.toISOString(),
        timestamp: w.lastWatched,
      })
    }

    activities.sort((a, b) => b.timestamp.getTime() - a.timestamp.getTime())

    return NextResponse.json({ activities: activities.slice(0, 20) })
  } catch (error) {
    console.error('Admin activity endpoint error:', error)
    return NextResponse.json({ error: 'Failed to fetch activity feed' }, { status: 500 })
  }
}
