import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { isAllowedAvatarSrc } from '@/lib/welcome-avatars'
import { rateLimit } from '@/lib/rate-limit'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const prefs = await prisma.userPreferences.findUnique({
    where: { userId: session.user.id },
    select: { onboardingCompleted: true },
  })

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: {
      image: true,
      username: true,
      name: true,
      adminMessage: true,
      adminMessageAt: true,
      bannedAt: true,
      banReason: true,
    },
  })

  return NextResponse.json({
    onboardingCompleted: prefs?.onboardingCompleted ?? true,
    image: user?.image ?? null,
    username: user?.username ?? session.user.username,
    name: user?.name ?? null,
    adminMessage: user?.adminMessage ?? null,
    adminMessageAt: user?.adminMessageAt?.toISOString() ?? null,
    banned: !!user?.bannedAt,
    banReason: user?.banReason ?? null,
  })
}

export async function POST(request: Request) {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  const limited = await rateLimit(`welcome:complete:${session.user.id}`, {
    limit: 10,
    windowMs: 60_000,
  })
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    )
  }

  try {
    const body = (await request.json()) as { image?: string }
    const image = typeof body.image === 'string' ? body.image.trim() : ''

    if (!image || !isAllowedAvatarSrc(image)) {
      return NextResponse.json(
        { error: 'Please choose a valid profile picture' },
        { status: 400 }
      )
    }

    await prisma.$transaction([
      prisma.user.update({
        where: { id: session.user.id },
        data: { image },
      }),
      prisma.userPreferences.upsert({
        where: { userId: session.user.id },
        create: {
          userId: session.user.id,
          favoriteGenres: [],
          preferredMoods: [],
          watchHistory: [],
          onboardingCompleted: true,
        },
        update: { onboardingCompleted: true },
      }),
    ])

    return NextResponse.json({ ok: true, image })
  } catch (error) {
    console.error('Welcome complete error:', error)
    return NextResponse.json(
      { error: 'Could not finish welcome' },
      { status: 500 }
    )
  }
}
