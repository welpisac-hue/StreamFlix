import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export async function DELETE(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const session = await getServerSession(authOptions)
    const { id } = await params

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const watchHistory = await prisma.watchHistory.findUnique({
      where: { id },
    })

    if (!watchHistory || watchHistory.userId !== session.user.id) {
      return NextResponse.json(
        { error: 'Watch history entry not found' },
        { status: 404 }
      )
    }

    await prisma.watchHistory.delete({
      where: { id },
    })

    return NextResponse.json({ message: 'Watch history entry deleted' })
  } catch (error) {
    console.error('Error deleting watch history:', error)
    return NextResponse.json(
      { error: 'Failed to delete watch history' },
      { status: 500 }
    )
  }
}
