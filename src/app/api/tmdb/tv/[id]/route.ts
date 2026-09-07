import { NextResponse } from 'next/server'
import { tmdb } from '@/lib/tmdb'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const tvId = parseInt(id, 10)
    if (Number.isNaN(tvId)) {
      return NextResponse.json({ error: 'Invalid TV id' }, { status: 400 })
    }

    const show = await tmdb.getTVShowDetails(tvId)
    return NextResponse.json(show)
  } catch (error) {
    console.error('Error fetching TV show:', error)
    return NextResponse.json({ error: 'Failed to fetch TV show' }, { status: 500 })
  }
}
