import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)

    const limited = rateLimit(`report:${session?.user?.id || 'anonymous'}`, {
      limit: 10,
      windowMs: 15 * 60 * 1000,
    })
    if (!limited.ok) {
      return NextResponse.json({ error: 'Too many reports submitted' }, { status: 429 })
    }

    const body = await request.json()
    const { tmdbId, mediaType, seasonNumber, episodeNumber, issueType, details } = body

    const parsedTmdbId = parseInt(String(tmdbId), 10)
    if (!Number.isFinite(parsedTmdbId) || parsedTmdbId <= 0 || !mediaType || !issueType) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 })
    }

    const report = await prisma.streamReport.create({
      data: {
        userId: session?.user?.id || null,
        tmdbId: parsedTmdbId,
        mediaType: String(mediaType),
        seasonNumber: seasonNumber ? parseInt(String(seasonNumber), 10) : null,
        episodeNumber: episodeNumber ? parseInt(String(episodeNumber), 10) : null,
        issueType: String(issueType).slice(0, 100),
        details: details ? String(details).slice(0, 1000) : null,
      },
    })

    return NextResponse.json({ ok: true, report }, { status: 201 })
  } catch (error) {
    console.error('Stream report error:', error)
    return NextResponse.json({ error: 'Failed to submit report' }, { status: 500 })
  }
}
