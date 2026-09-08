import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const now = new Date()
    const dayAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000)
    const weekAgo = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000)
    const monthAgo = new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000)

    // Batch 1: High-level counts
    const [
      totalUsers,
      adminUsers,
      totalPageViews,
      pageViewsToday,
      pageViewsWeek,
      uniqueVisitorsWeek,
    ] = await Promise.all([
      prisma.user.count(),
      prisma.user.count({ where: { role: 'ADMIN' } }),
      prisma.pageView.count(),
      prisma.pageView.count({ where: { createdAt: { gte: dayAgo } } }),
      prisma.pageView.count({ where: { createdAt: { gte: weekAgo } } }),
      prisma.pageView.groupBy({
        by: ['userId'],
        where: { createdAt: { gte: weekAgo }, userId: { not: null } },
      }),
    ])

    // Batch 2: Activity and engagement counts
    const [
      totalWatchEvents,
      completedWatches,
      totalWatchLater,
      totalReviews,
      avgRating,
      activeInvites,
      inviteRedemptions,
    ] = await Promise.all([
      prisma.watchHistory.count(),
      prisma.watchHistory.count({ where: { completed: true } }),
      prisma.watchLater.count(),
      prisma.review.count(),
      prisma.review.aggregate({ _avg: { rating: true } }),
      prisma.inviteCode.count({ where: { isActive: true } }),
      prisma.inviteRedemption.count(),
    ])

    // Batch 3: Aggregates and lists
    const [
      recentUsers,
      topRated,
      mostWatched,
      topPages,
      signupsByDay,
    ] = await Promise.all([
      prisma.user.findMany({
        orderBy: { createdAt: 'desc' },
        take: 8,
        select: {
          id: true,
          username: true,
          name: true,
          role: true,
          createdAt: true,
        },
      }),
      prisma.review.groupBy({
        by: ['tmdbId', 'title'],
        _avg: { rating: true },
        _count: { rating: true },
        orderBy: { _avg: { rating: 'desc' } },
        take: 10,
      }),
      prisma.watchHistory.groupBy({
        by: ['tmdbId', 'title', 'mediaType'],
        _count: { tmdbId: true },
        orderBy: { _count: { tmdbId: 'desc' } },
        take: 10,
      }),
      prisma.pageView.groupBy({
        by: ['path'],
        _count: { path: true },
        orderBy: { _count: { path: 'desc' } },
        take: 10,
      }),
      prisma.user.findMany({
        where: { createdAt: { gte: monthAgo } },
        select: { createdAt: true },
        orderBy: { createdAt: 'asc' },
      }),
    ])

    const signupMap: Record<string, number> = {}
    for (let i = 29; i >= 0; i--) {
      const d = new Date(now)
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - i)
      signupMap[d.toISOString().slice(0, 10)] = 0
    }
    for (const u of signupsByDay) {
      const key = u.createdAt.toISOString().slice(0, 10)
      if (key in signupMap) signupMap[key] += 1
    }

    return NextResponse.json({
      overview: {
        totalUsers,
        adminUsers,
        totalPageViews,
        pageViewsToday,
        pageViewsWeek,
        uniqueVisitorsWeek: uniqueVisitorsWeek.length,
        totalWatchEvents,
        completedWatches,
        totalWatchLater,
        totalReviews,
        averageRating: avgRating._avg.rating
          ? Math.round(avgRating._avg.rating * 10) / 10
          : null,
        activeInvites,
        inviteRedemptions,
      },
      recentUsers,
      topRated: topRated.map((r) => ({
        tmdbId: r.tmdbId,
        title: r.title,
        averageRating: r._avg.rating
          ? Math.round((r._avg.rating || 0) * 10) / 10
          : 0,
        reviewCount: r._count.rating,
      })),
      mostWatched: mostWatched.map((w) => ({
        tmdbId: w.tmdbId,
        title: w.title,
        mediaType: w.mediaType,
        watches: w._count.tmdbId,
      })),
      topPages: topPages.map((p) => ({
        path: p.path,
        views: p._count.path,
      })),
      signupsLast30Days: Object.entries(signupMap).map(([date, count]) => ({
        date,
        count,
      })),
    })
  } catch (error) {
    console.error('Admin analytics error:', error)
    return NextResponse.json(
      { error: 'Failed to load analytics' },
      { status: 500 }
    )
  }
}
