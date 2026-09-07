import 'server-only'
import { getServerSession } from 'next-auth'
import { NextResponse } from 'next/server'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { rateLimit } from '@/lib/rate-limit'
import type { Role } from '@prisma/client'

export type AdminSessionUser = {
  id: string
  username: string
  role: Role
  name?: string | null
}

export async function requireAdmin(): Promise<
  | { ok: true; user: AdminSessionUser }
  | { ok: false; response: NextResponse }
> {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id || session.user.role !== 'ADMIN') {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  const limited = rateLimit(`admin:api:${session.user.id}`, {
    limit: 120,
    windowMs: 60_000,
  })
  if (!limited.ok) {
    return {
      ok: false,
      response: NextResponse.json(
        { error: 'Too many requests' },
        {
          status: 429,
          headers: { 'Retry-After': String(limited.retryAfterSec) },
        }
      ),
    }
  }

  const user = await prisma.user.findUnique({
    where: { id: session.user.id },
    select: { id: true, username: true, role: true, name: true, bannedAt: true },
  })

  if (!user || user.role !== 'ADMIN' || user.bannedAt) {
    return {
      ok: false,
      response: NextResponse.json({ error: 'Forbidden' }, { status: 403 }),
    }
  }

  return { ok: true, user }
}
