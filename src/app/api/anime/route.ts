import { NextResponse } from 'next/server'
import { animeApi } from '@/lib/anilist'

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url)
  const type = searchParams.get('type') || 'popular'
  const q = searchParams.get('q') || ''
  const genre = searchParams.get('genre') || ''
  const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10) || 1)
  const id = searchParams.get('id')
  const paged = searchParams.get('paged') === '1'

  try {
    if (id) {
      const details = await animeApi.getDetails(parseInt(id, 10))
      if (!details) {
        return NextResponse.json({ error: 'Not found' }, { status: 404 })
      }
      return NextResponse.json(details)
    }

    if (type === 'search' || q.trim()) {
      const result = await animeApi.searchPaged(q || searchParams.get('q') || '', page)
      if (paged) return NextResponse.json(result)
      return NextResponse.json(result.items)
    }

    if (type === 'genre' && genre) {
      const results = await animeApi.getByGenre(genre, page)
      return NextResponse.json(results)
    }

    let result
    if (type === 'trending') {
      result = await animeApi.getTrendingPaged(page)
    } else if (type === 'top') {
      result = await animeApi.getTopRatedPaged(page)
    } else if (type === 'upcoming') {
      result = await animeApi.getUpcomingPaged(page)
    } else {
      result = await animeApi.getPopularPaged(page)
    }

    if (paged) return NextResponse.json(result)
    return NextResponse.json(result.items)
  } catch (error) {
    console.error('Anime API error:', error)
    return NextResponse.json({ error: 'Failed to fetch anime' }, { status: 500 })
  }
}
