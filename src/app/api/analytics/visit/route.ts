import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const limited = await rateLimit(`visit:${session.user.id}`, {
      limit: 20,
      windowMs: 60_000,
    })
    if (!limited.ok) {
      return NextResponse.json({ ok: true, throttled: true })
    }

    const body = await request.json().catch(() => ({}))
    const path =
      typeof body.path === 'string' && body.path.startsWith('/')
        ? body.path.slice(0, 500)
        : '/'

    // Skip tracking watch playback pages — high churn, low analytics value
    if (path.startsWith('/watch')) {
      return NextResponse.json({ ok: true, skipped: true })
    }

    await prisma.pageView.create({
      data: {
        path,
        userId: session.user.id,
      },
    })

    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Visit tracking error:', error)
    return NextResponse.json({ error: 'Failed to track visit' }, { status: 500 })
  }
}
