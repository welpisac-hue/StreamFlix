import { NextResponse } from 'next/server'
import { tmdb } from '@/lib/tmdb'

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const movieId = parseInt(id, 10)
    if (Number.isNaN(movieId)) {
      return NextResponse.json({ error: 'Invalid movie id' }, { status: 400 })
    }

    const movie = await tmdb.getMovieDetails(movieId)
    return NextResponse.json(movie)
  } catch (error) {
    console.error('Error fetching movie:', error)
    return NextResponse.json({ error: 'Failed to fetch movie' }, { status: 500 })
  }
}
