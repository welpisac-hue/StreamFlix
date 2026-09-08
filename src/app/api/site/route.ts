import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { getSiteSettings, parseSectionMaintenance } from '@/lib/site-settings-db'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

/**
 * Public (authenticated) site status: maintenance, announcement, active poll.
 */
export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const settings = await getSiteSettings()
  const sectionMaintenance = parseSectionMaintenance(settings.sectionMaintenance)

  const announcementKey = settings.announcementUpdatedAt
    ? `ann-${settings.announcementUpdatedAt.getTime()}`
    : null

  const [dismissedAnn, user, polls] = await Promise.all([
    announcementKey
      ? prisma.dismissedAnnouncement.findUnique({
          where: {
            userId_announcementKey: {
              userId: session.user.id,
              announcementKey,
            },
          },
        })
      : Promise.resolve(null),
    prisma.user.findUnique({
      where: { id: session.user.id },
      select: {
        adminMessage: true,
        adminMessageAt: true,
        bannedAt: true,
        banReason: true,
      },
    }),
    prisma.poll.findMany({
      where: { isActive: true },
      orderBy: { createdAt: 'desc' },
      take: 5,
      include: {
        votes: {
          where: { userId: session.user.id },
          select: { optionIndex: true },
        },
        dismissals: {
          where: { userId: session.user.id },
          select: { id: true },
        },
        _count: { select: { votes: true } },
      },
    }),
  ])

  const now = Date.now()
  const activePolls = polls.map((p) => {
    const ended = p.endsAt ? p.endsAt.getTime() <= now : false
    const reveal =
      !p.resultsRevealAt || p.resultsRevealAt.getTime() <= now || ended
    const myVote = p.votes[0]?.optionIndex ?? null
    return {
      id: p.id,
      question: p.question,
      options: p.options,
      endsAt: p.endsAt?.toISOString() ?? null,
      resultsRevealAt: p.resultsRevealAt?.toISOString() ?? null,
      ended,
      canVote: !ended && myVote === null,
      myVote,
      dismissed: p.dismissals.length > 0,
      revealResults: reveal && (myVote !== null || ended),
      voteCount: p._count.votes,
    }
  })

  // Attach counts only when results are revealable
  const pollsWithCounts = await Promise.all(
    activePolls.map(async (p) => {
      if (!p.revealResults) return { ...p, counts: null as number[] | null }
      const votes = await prisma.pollVote.groupBy({
        by: ['optionIndex'],
        where: { pollId: p.id },
        _count: { _all: true },
      })
      const counts = p.options.map(
        (_, i) => votes.find((v) => v.optionIndex === i)?._count._all || 0
      )
      return { ...p, counts }
    })
  )

  return NextResponse.json({
    maintenanceMode: settings.maintenanceMode,
    maintenanceMessage:
      settings.maintenanceMessage ||
      'StreamFlix is temporarily under maintenance.',
    sectionMaintenance,
    announcement:
      settings.announcementActive &&
      settings.announcementTitle &&
      !dismissedAnn
        ? {
            key: announcementKey,
            title: settings.announcementTitle,
            body: settings.announcementBody || '',
          }
        : null,
    adminMessage: user?.adminMessage
      ? {
          body: user.adminMessage,
          at: user.adminMessageAt?.toISOString() ?? null,
        }
      : null,
    banned: !!user?.bannedAt,
    banReason: user?.banReason ?? null,
    polls: pollsWithCounts,
    isAdmin: session.user.role === 'ADMIN',
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limited = await rateLimit(`site:action:${session.user.id}`, {
    limit: 60,
    windowMs: 60_000,
  })
  if (!limited.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = (await request.json()) as {
      action?:
        | 'dismissAnnouncement'
        | 'dismissAdminMessage'
        | 'dismissPoll'
        | 'undismissPoll'
        | 'votePoll'
      announcementKey?: string
      pollId?: string
      optionIndex?: number
    }

    if (body.action === 'dismissAnnouncement' && body.announcementKey) {
      const key = String(body.announcementKey)
      if (!/^ann-\d{10,16}$/.test(key)) {
        return NextResponse.json({ error: 'Invalid key' }, { status: 400 })
      }
      await prisma.dismissedAnnouncement.upsert({
        where: {
          userId_announcementKey: {
            userId: session.user.id,
            announcementKey: key,
          },
        },
        create: {
          userId: session.user.id,
          announcementKey: key,
        },
        update: {},
      })
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'dismissAdminMessage') {
      await prisma.user.update({
        where: { id: session.user.id },
        data: { adminMessage: null, adminMessageAt: null },
      })
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'dismissPoll' && body.pollId) {
      await prisma.dismissedPoll.upsert({
        where: {
          pollId_userId: {
            pollId: body.pollId,
            userId: session.user.id,
          },
        },
        create: { pollId: body.pollId, userId: session.user.id },
        update: {},
      })
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'undismissPoll' && body.pollId) {
      await prisma.dismissedPoll.deleteMany({
        where: { pollId: body.pollId, userId: session.user.id },
      })
      return NextResponse.json({ ok: true })
    }

    if (body.action === 'votePoll' && body.pollId != null) {
      const optionIndex = Number(body.optionIndex)
      if (!Number.isInteger(optionIndex) || optionIndex < 0) {
        return NextResponse.json({ error: 'Invalid option' }, { status: 400 })
      }

      const poll = await prisma.poll.findUnique({ where: { id: body.pollId } })
      if (!poll || !poll.isActive) {
        return NextResponse.json({ error: 'Poll not found' }, { status: 404 })
      }
      if (poll.endsAt && poll.endsAt.getTime() <= Date.now()) {
        return NextResponse.json({ error: 'Poll has ended' }, { status: 400 })
      }
      if (optionIndex >= poll.options.length) {
        return NextResponse.json({ error: 'Invalid option' }, { status: 400 })
      }

      // Votes are locked once cast — no changing after the fact
      try {
        await prisma.pollVote.create({
          data: {
            pollId: body.pollId,
            userId: session.user.id,
            optionIndex,
          },
        })
      } catch {
        return NextResponse.json(
          { error: 'You already voted on this poll' },
          { status: 400 }
        )
      }

      return NextResponse.json({ ok: true })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Site action error:', error)
    return NextResponse.json({ error: 'Action failed' }, { status: 500 })
  }
}
