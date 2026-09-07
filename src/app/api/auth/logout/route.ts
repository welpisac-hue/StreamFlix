import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'

/** Record logout timestamp before client clears the session. */
export async function POST() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ ok: true })
  }

  const limited = rateLimit(`logout:${session.user.id}`, {
    limit: 20,
    windowMs: 60_000,
  })
  if (!limited.ok) {
    return NextResponse.json({ ok: true })
  }

  try {
    await prisma.user.update({
      where: { id: session.user.id },
      data: { lastLogoutAt: new Date() },
    })
  } catch {
    // ignore
  }

  return NextResponse.json({ ok: true })
}
