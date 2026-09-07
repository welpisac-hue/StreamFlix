import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import {
  normalizeUsername,
  validatePasswordStrength,
  validateUsername,
} from '@/lib/password'
import { clientKey, rateLimit } from '@/lib/rate-limit'

export async function POST(request: Request) {
  try {
    const limited = rateLimit(`signup:${clientKey(request)}`, {
      limit: 5,
      windowMs: 60 * 60 * 1000,
    })
    if (!limited.ok) {
      return NextResponse.json(
        { error: 'Too many signup attempts. Try again later.' },
        {
          status: 429,
          headers: { 'Retry-After': String(limited.retryAfterSec) },
        }
      )
    }

    const body = await request.json()
    const { username, password, inviteCode, name } = body as {
      username?: string
      password?: string
      inviteCode?: string
      name?: string
    }

    if (!username || !password || !inviteCode) {
      return NextResponse.json(
        { error: 'Username, password, and invite code are required' },
        { status: 400 }
      )
    }

    const usernameError = validateUsername(username)
    if (usernameError) {
      return NextResponse.json({ error: usernameError }, { status: 400 })
    }

    const passwordError = validatePasswordStrength(password)
    if (passwordError) {
      return NextResponse.json({ error: passwordError }, { status: 400 })
    }

    const normalizedUsername = normalizeUsername(username)
    const code = String(inviteCode).trim().toUpperCase()

    const existingUser = await prisma.user.findUnique({
      where: { username: normalizedUsername },
    })

    if (existingUser) {
      return NextResponse.json(
        { error: 'Username is already taken' },
        { status: 400 }
      )
    }

    const invite = await prisma.inviteCode.findUnique({
      where: { code },
    })

    if (!invite || !invite.isActive) {
      return NextResponse.json(
        { error: 'Invalid invite code' },
        { status: 400 }
      )
    }

    if (invite.expiresAt && invite.expiresAt < new Date()) {
      return NextResponse.json(
        { error: 'This invite code has expired' },
        { status: 400 }
      )
    }

    if (invite.usedCount >= invite.maxUses) {
      return NextResponse.json(
        { error: 'This invite code has no uses left' },
        { status: 400 }
      )
    }

    // Admin elevation only via invite.grantsAdmin (DB-controlled; never free-form codes)
    const shouldBeAdmin = !!invite.grantsAdmin

    const hashedPassword = await bcrypt.hash(password, 12)

    const user = await prisma.$transaction(async (tx) => {
      const freshInvite = await tx.inviteCode.findUnique({
        where: { id: invite.id },
      })

      if (
        !freshInvite ||
        !freshInvite.isActive ||
        freshInvite.usedCount >= freshInvite.maxUses
      ) {
        throw new Error('INVITE_UNAVAILABLE')
      }

      const created = await tx.user.create({
        data: {
          username: normalizedUsername,
          password: hashedPassword,
          name: name?.trim() || normalizedUsername,
          role: shouldBeAdmin ? 'ADMIN' : 'USER',
        },
      })

      await tx.userPreferences.create({
        data: {
          userId: created.id,
          favoriteGenres: [],
          preferredMoods: [],
          watchHistory: [],
          onboardingCompleted: false,
        },
      })

      await tx.inviteRedemption.create({
        data: {
          inviteCodeId: invite.id,
          userId: created.id,
        },
      })

      await tx.inviteCode.update({
        where: { id: invite.id },
        data: {
          usedCount: { increment: 1 },
          // One-shot admin invites: burn after use
          ...(shouldBeAdmin ? { isActive: false } : {}),
        },
      })

      return created
    })

    return NextResponse.json(
      {
        message: 'User created successfully',
        userId: user.id,
      },
      { status: 201 }
    )
  } catch (error) {
    if (error instanceof Error && error.message === 'INVITE_UNAVAILABLE') {
      return NextResponse.json(
        { error: 'This invite code has no uses left' },
        { status: 400 }
      )
    }
    console.error('Signup error:', error)
    return NextResponse.json(
      { error: 'Something went wrong' },
      { status: 500 }
    )
  }
}
