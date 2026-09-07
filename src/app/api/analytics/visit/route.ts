import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function POST(request: Request) {
  try {
    const session = await getServerSession(authOptions)
    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const body = await request.json().catch(() => ({}))
    const path =
      typeof body.path === 'string' && body.path.startsWith('/')
        ? body.path.slice(0, 500)
        : '/'

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
