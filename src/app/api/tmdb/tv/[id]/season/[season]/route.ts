import { NextResponse } from 'next/server'
import { tmdb } from '@/lib/tmdb'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string; season: string }> }
) {
  try {
    const { id, season } = await params
    const tvId = parseInt(id, 10)
    const seasonNumber = parseInt(season, 10)

    if (Number.isNaN(tvId) || Number.isNaN(seasonNumber)) {
      return NextResponse.json({ error: 'Invalid parameters' }, { status: 400 })
    }

    const seasonData = await tmdb.getSeasonDetails(tvId, seasonNumber)
    return NextResponse.json(seasonData)
  } catch (error) {
    console.error('Error fetching season:', error)
    return NextResponse.json({ error: 'Failed to fetch season' }, { status: 500 })
  }
}
