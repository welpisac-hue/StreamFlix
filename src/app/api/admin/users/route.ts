import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { rateLimit } from '@/lib/rate-limit'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const users = await prisma.user.findMany({
      orderBy: { createdAt: 'desc' },
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
        createdAt: true,
        updatedAt: true,
        _count: {
          select: {
            watchHistory: true,
            watchLater: true,
            reviews: true,
            pageViews: true,
          },
        },
        inviteRedemption: {
          select: {
            redeemedAt: true,
            inviteCode: { select: { code: true } },
          },
        },
      },
    })

    return NextResponse.json({ users })
  } catch (error) {
    console.error('Admin users error:', error)
    return NextResponse.json(
      { error: 'Failed to load users' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const limited = rateLimit(`admin:users:patch:${auth.user.id}`, {
    limit: 40,
    windowMs: 60_000,
  })
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    )
  }

  try {
    const body = (await request.json()) as {
      id?: string
      action?: 'ban' | 'unban' | 'message' | 'clearMessage'
      banReason?: string
      adminMessage?: string
    }

    if (!body.id || !body.action) {
      return NextResponse.json({ error: 'id and action required' }, { status: 400 })
    }

    if (body.id === auth.user.id && body.action === 'ban') {
      return NextResponse.json(
        { error: 'You cannot ban yourself' },
        { status: 400 }
      )
    }

    const target = await prisma.user.findUnique({ where: { id: body.id } })
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    if (target.role === 'ADMIN' && body.action === 'ban') {
      return NextResponse.json(
        { error: 'Cannot ban another admin' },
        { status: 400 }
      )
    }

    if (body.action === 'ban') {
      const updated = await prisma.user.update({
        where: { id: body.id },
        data: {
          bannedAt: new Date(),
          banReason: (body.banReason || 'Banned by admin').slice(0, 500),
        },
      })
      return NextResponse.json({ user: serializeUser(updated) })
    }

    if (body.action === 'unban') {
      const updated = await prisma.user.update({
        where: { id: body.id },
        data: { bannedAt: null, banReason: null },
      })
      return NextResponse.json({ user: serializeUser(updated) })
    }

    if (body.action === 'message') {
      const msg = (body.adminMessage || '').trim()
      if (!msg) {
        return NextResponse.json({ error: 'Message required' }, { status: 400 })
      }
      const updated = await prisma.user.update({
        where: { id: body.id },
        data: {
          adminMessage: msg.slice(0, 2000),
          adminMessageAt: new Date(),
        },
      })
      return NextResponse.json({ user: serializeUser(updated) })
    }

    if (body.action === 'clearMessage') {
      const updated = await prisma.user.update({
        where: { id: body.id },
        data: { adminMessage: null, adminMessageAt: null },
      })
      return NextResponse.json({ user: serializeUser(updated) })
    }

    return NextResponse.json({ error: 'Unknown action' }, { status: 400 })
  } catch (error) {
    console.error('Admin users PATCH error:', error)
    return NextResponse.json({ error: 'Update failed' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const limited = rateLimit(`admin:users:delete:${auth.user.id}`, {
    limit: 20,
    windowMs: 60_000,
  })
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    )
  }

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }
    if (id === auth.user.id) {
      return NextResponse.json(
        { error: 'You cannot delete yourself' },
        { status: 400 }
      )
    }

    const target = await prisma.user.findUnique({ where: { id } })
    if (!target) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }
    if (target.role === 'ADMIN') {
      return NextResponse.json(
        { error: 'Cannot delete an admin account' },
        { status: 400 }
      )
    }

    await prisma.user.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Admin users DELETE error:', error)
    return NextResponse.json({ error: 'Delete failed' }, { status: 500 })
  }
}

function serializeUser(user: {
  id: string
  username: string
  bannedAt: Date | null
  banReason: string | null
  adminMessage: string | null
  adminMessageAt: Date | null
  lastLoginAt: Date | null
  lastLogoutAt: Date | null
}) {
  return {
    id: user.id,
    username: user.username,
    bannedAt: user.bannedAt?.toISOString() ?? null,
    banReason: user.banReason,
    adminMessage: user.adminMessage,
    adminMessageAt: user.adminMessageAt?.toISOString() ?? null,
    lastLoginAt: user.lastLoginAt?.toISOString() ?? null,
    lastLogoutAt: user.lastLogoutAt?.toISOString() ?? null,
  }
}
