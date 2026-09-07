import { NextResponse } from 'next/server'
import { tmdb } from '@/lib/tmdb'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const type = searchParams.get('type') || 'movie'

    const genres =
      type === 'tv' ? await tmdb.getTVGenres() : await tmdb.getMovieGenres()

    return NextResponse.json(genres)
  } catch (error) {
    console.error('Error fetching genres:', error)
    return NextResponse.json({ error: 'Failed to fetch genres' }, { status: 500 })
  }
}
