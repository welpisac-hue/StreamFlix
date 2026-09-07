import { NextResponse } from 'next/server'
import { tmdb } from '@/lib/tmdb'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const query = searchParams.get('q') || ''
    const mediaType = searchParams.get('type') || 'all'
    const genre = searchParams.get('genre')
    const genreId = genre ? parseInt(genre, 10) : null

    if (genreId && !Number.isNaN(genreId)) {
      const [movies, tvShows] = await Promise.all([
        mediaType === 'tv' ? Promise.resolve([]) : tmdb.discoverMovies({ genre: genreId }),
        mediaType === 'movie' ? Promise.resolve([]) : tmdb.discoverTV({ genre: genreId }),
      ])
      return NextResponse.json({ movies, tvShows })
    }

    if (!query.trim()) {
      return NextResponse.json({ movies: [], tvShows: [] })
    }

    const [movies, tvShows] = await Promise.all([
      mediaType === 'tv' ? Promise.resolve([]) : tmdb.searchMovies(query),
      mediaType === 'movie' ? Promise.resolve([]) : tmdb.searchTV(query),
    ])

    return NextResponse.json({ movies, tvShows })
  } catch (error) {
    console.error('Search error:', error)
    return NextResponse.json({ error: 'Search failed' }, { status: 500 })
  }
}
