import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

function normalizeCode(code: string) {
  return code.trim().toUpperCase().replace(/\s+/g, '-')
}

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const invites = await prisma.inviteCode.findMany({
      orderBy: { createdAt: 'desc' },
      include: {
        createdBy: { select: { id: true, username: true } },
        _count: { select: { redemptions: true } },
        redemptions: {
          take: 5,
          orderBy: { redeemedAt: 'desc' },
          include: {
            user: { select: { id: true, username: true } },
          },
        },
      },
    })

    return NextResponse.json({ invites })
  } catch (error) {
    console.error('Admin invites GET error:', error)
    return NextResponse.json(
      { error: 'Failed to load invites' },
      { status: 500 }
    )
  }
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const codeRaw = typeof body.code === 'string' ? body.code : ''
    const code = normalizeCode(codeRaw)

    if (!code || code.length < 4 || code.length > 32) {
      return NextResponse.json(
        { error: 'Invite code must be 4–32 characters' },
        { status: 400 }
      )
    }

    if (!/^[A-Z0-9_-]+$/.test(code)) {
      return NextResponse.json(
        { error: 'Code can only contain letters, numbers, dashes, and underscores' },
        { status: 400 }
      )
    }

    const maxUses =
      typeof body.maxUses === 'number' && body.maxUses > 0
        ? Math.min(Math.floor(body.maxUses), 1000)
        : 1

    const note =
      typeof body.note === 'string' ? body.note.trim().slice(0, 200) : null

    const expiresAt =
      typeof body.expiresAt === 'string' && body.expiresAt
        ? new Date(body.expiresAt)
        : null

    if (expiresAt && Number.isNaN(expiresAt.getTime())) {
      return NextResponse.json(
        { error: 'Invalid expiration date' },
        { status: 400 }
      )
    }

    const existing = await prisma.inviteCode.findUnique({ where: { code } })
    if (existing) {
      return NextResponse.json(
        { error: 'That invite code already exists' },
        { status: 400 }
      )
    }

    const invite = await prisma.inviteCode.create({
      data: {
        code,
        kind: 'ADMIN',
        maxUses,
        note,
        expiresAt,
        createdById: auth.user.id,
        grantsAdmin: false,
        isActive: true,
      },
    })

    return NextResponse.json({ invite }, { status: 201 })
  } catch (error) {
    console.error('Admin invites POST error:', error)
    return NextResponse.json(
      { error: 'Failed to create invite' },
      { status: 500 }
    )
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const id = typeof body.id === 'string' ? body.id : ''
    if (!id) {
      return NextResponse.json({ error: 'Invite id required' }, { status: 400 })
    }

    const data: { isActive?: boolean; maxUses?: number; note?: string | null } =
      {}

    if (typeof body.isActive === 'boolean') {
      data.isActive = body.isActive
    }
    if (typeof body.maxUses === 'number' && body.maxUses > 0) {
      data.maxUses = Math.min(Math.floor(body.maxUses), 1000)
    }
    if (typeof body.note === 'string') {
      data.note = body.note.trim().slice(0, 200) || null
    }

    const invite = await prisma.inviteCode.update({
      where: { id },
      data,
    })

    return NextResponse.json({ invite })
  } catch (error) {
    console.error('Admin invites PATCH error:', error)
    return NextResponse.json(
      { error: 'Failed to update invite' },
      { status: 500 }
    )
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const { searchParams } = new URL(request.url)
    const id = searchParams.get('id')
    if (!id) {
      return NextResponse.json({ error: 'Invite id required' }, { status: 400 })
    }

    await prisma.inviteCode.delete({ where: { id } })
    return NextResponse.json({ ok: true })
  } catch (error) {
    console.error('Admin invites DELETE error:', error)
    return NextResponse.json(
      { error: 'Failed to delete invite' },
      { status: 500 }
    )
  }
}
