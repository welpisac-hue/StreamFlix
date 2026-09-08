import { NextResponse } from 'next/server'
import { tmdb } from '@/lib/tmdb'

export async function GET(request: Request) {
  try {
    const { searchParams } = new URL(request.url)
    const mediaType = searchParams.get('mediaType') === 'tv' ? 'tv' : 'movie'
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
    const sort = searchParams.get('sort') || 'popular'
    const q = (searchParams.get('q') || '').trim()
    const genreParam = searchParams.get('genre')
    const parsedGenre = genreParam ? parseInt(genreParam, 10) : NaN
    const genre = Number.isFinite(parsedGenre) && parsedGenre > 0 ? parsedGenre : undefined

    if (q) {
      const data =
        mediaType === 'tv'
          ? await tmdb.searchTVPaged(q, page)
          : await tmdb.searchMoviesPaged(q, page)
      return NextResponse.json(data)
    }

    const sortBy = sort === 'top' ? 'vote_average.desc' : 'popularity.desc'
    const data =
      mediaType === 'tv'
        ? await tmdb.discoverTVPaged({ page, sortBy, genre })
        : await tmdb.discoverMoviesPaged({ page, sortBy, genre })

    return NextResponse.json(data)
  } catch (error) {
    console.error('TMDB browse error:', error)
    return NextResponse.json({ error: 'Browse failed' }, { status: 500 })
  }
}
