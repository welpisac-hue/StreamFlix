import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { buildWelcomeAvatars } from '@/lib/welcome-avatars-server'

export async function GET() {
  const session = await getServerSession(authOptions)
  if (!session?.user?.id) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
  }

  try {
    const avatars = await buildWelcomeAvatars()
    return NextResponse.json({ avatars })
  } catch (error) {
    console.error('Welcome avatars error:', error)
    return NextResponse.json(
      { error: 'Failed to load avatars' },
      { status: 500 }
    )
  }
}
