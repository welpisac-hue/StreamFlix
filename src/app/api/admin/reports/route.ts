import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const reports = await prisma.streamReport.findMany({
      orderBy: { createdAt: 'desc' },
      take: 50,
      include: {
        user: { select: { username: true, id: true } },
      },
    })
    return NextResponse.json({ reports })
  } catch (error) {
    console.error('Admin reports error:', error)
    return NextResponse.json({ error: 'Failed to load reports' }, { status: 500 })
  }
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  try {
    const body = await request.json()
    const { id, status } = body
    if (!id || !status) {
      return NextResponse.json({ error: 'id and status required' }, { status: 400 })
    }

    const updated = await prisma.streamReport.update({
      where: { id: String(id) },
      data: { status: String(status) },
    })

    return NextResponse.json({ report: updated })
  } catch (error) {
    console.error('Admin report update error:', error)
    return NextResponse.json({ error: 'Failed to update report' }, { status: 500 })
  }
}
