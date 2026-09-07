import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { rateLimit } from '@/lib/rate-limit'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const polls = await prisma.poll.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      votes: { select: { optionIndex: true } },
      _count: { select: { votes: true } },
    },
  })

  return NextResponse.json({
    polls: polls.map((p) => {
      const counts = p.options.map((_, i) =>
        p.votes.filter((v) => v.optionIndex === i).length
      )
      return {
        id: p.id,
        question: p.question,
        options: p.options,
        isActive: p.isActive,
        endsAt: p.endsAt?.toISOString() ?? null,
        resultsRevealAt: p.resultsRevealAt?.toISOString() ?? null,
        createdAt: p.createdAt.toISOString(),
        voteCount: p._count.votes,
        counts,
      }
    }),
  })
}

export async function POST(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const limited = rateLimit(`admin:polls:create:${auth.user.id}`, {
    limit: 20,
    windowMs: 60_000,
  })
  if (!limited.ok) {
    return NextResponse.json({ error: 'Too many requests' }, { status: 429 })
  }

  try {
    const body = (await request.json()) as {
      question?: string
      options?: string[]
      endsAt?: string | null
      resultsRevealAt?: string | null
    }

    const question = (body.question || '').trim()
    const options = (body.options || [])
      .map((o) => String(o).trim())
      .filter(Boolean)
      .slice(0, 6)

    if (!question || options.length < 2) {
      return NextResponse.json(
        { error: 'Question and at least 2 options required' },
        { status: 400 }
      )
    }

    const poll = await prisma.poll.create({
      data: {
        question: question.slice(0, 300),
        options,
        endsAt: body.endsAt ? new Date(body.endsAt) : null,
        resultsRevealAt: body.resultsRevealAt
          ? new Date(body.resultsRevealAt)
          : null,
        isActive: true,
      },
    })

    return NextResponse.json(
      {
        poll: {
          id: poll.id,
          question: poll.question,
          options: poll.options,
          isActive: poll.isActive,
          endsAt: poll.endsAt?.toISOString() ?? null,
          resultsRevealAt: poll.resultsRevealAt?.toISOString() ?? null,
          createdAt: poll.createdAt.toISOString(),
        },
      },
      { status: 201 }
    )
  } catch (error) {
    console.error('Create poll error:', error)
    return NextResponse.json({ error: 'Failed to create poll' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const body = (await request.json()) as {
      id?: string
      isActive?: boolean
      endsAt?: string | null
      resultsRevealAt?: string | null
    }
    if (!body.id) {
      return NextResponse.json({ error: 'id required' }, { status: 400 })
    }

    const data: Record<string, unknown> = {}
    if (typeof body.isActive === 'boolean') data.isActive = body.isActive
    if (body.endsAt !== undefined) {
      data.endsAt = body.endsAt ? new Date(body.endsAt) : null
    }
    if (body.resultsRevealAt !== undefined) {
      data.resultsRevealAt = body.resultsRevealAt
        ? new Date(body.resultsRevealAt)
        : null
    }

    const poll = await prisma.poll.update({
      where: { id: body.id },
      data,
    })

    return NextResponse.json({
      poll: {
        id: poll.id,
        isActive: poll.isActive,
        endsAt: poll.endsAt?.toISOString() ?? null,
        resultsRevealAt: poll.resultsRevealAt?.toISOString() ?? null,
      },
    })
  } catch (error) {
    console.error('Patch poll error:', error)
    return NextResponse.json({ error: 'Failed to update poll' }, { status: 500 })
  }
}

export async function DELETE(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const id = new URL(request.url).searchParams.get('id')
  if (!id) {
    return NextResponse.json({ error: 'id required' }, { status: 400 })
  }

  await prisma.poll.delete({ where: { id } })
  return NextResponse.json({ ok: true })
}
