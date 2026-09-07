import { NextResponse } from 'next/server'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'
import { tmdb } from '@/lib/tmdb'

export async function GET() {
  try {
    const session = await getServerSession(authOptions)

    if (!session?.user?.id) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 })
    }

    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      include: {
        watchHistory: true,
        preferences: true,
      },
    })

    if (!user) {
      return NextResponse.json({ error: 'User not found' }, { status: 404 })
    }

    const recommendations = await generateRecommendations(user)

    return NextResponse.json(recommendations)
  } catch (error) {
    console.error('Error generating recommendations:', error)
    return NextResponse.json(
      { error: 'Failed to generate recommendations' },
      { status: 500 }
    )
  }
}

async function generateRecommendations(user: {
  id: string
  watchHistory: {
    tmdbId: number
    mediaType: string
  }[]
  preferences: {
    favoriteGenres: string[]
    watchHistory: string[]
  } | null
}) {
  const watchedTmdbIds = user.watchHistory.map((h) => h.tmdbId)

  const genreCounts: Record<number, number> = {}

  // Prefer stored genres to avoid N+1 TMDB calls on every request
  const storedGenres = (user.preferences?.favoriteGenres || [])
    .map((id) => parseInt(id, 10))
    .filter((id) => !Number.isNaN(id))

  if (storedGenres.length === 0) {
    const recentHistory = user.watchHistory.slice(0, 5)
    for (const historyItem of recentHistory) {
      try {
        const details =
          historyItem.mediaType === 'movie'
            ? await tmdb.getMovieDetails(historyItem.tmdbId)
            : await tmdb.getTVShowDetails(historyItem.tmdbId)

        details.genres.forEach((genre) => {
          genreCounts[genre.id] = (genreCounts[genre.id] || 0) + 1
        })
      } catch (error) {
        console.error('Error fetching details for recommendation:', error)
      }
    }
  } else {
    storedGenres.forEach((id) => {
      genreCounts[id] = (genreCounts[id] || 0) + 1
    })
  }

  const topGenreIds = Object.entries(genreCounts)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 3)
    .map(([id]) => parseInt(id, 10))

  if (topGenreIds.length > 0) {
    await prisma.userPreferences.upsert({
      where: { userId: user.id },
      create: {
        userId: user.id,
        favoriteGenres: topGenreIds.map(String),
        preferredMoods: [],
        watchHistory: watchedTmdbIds.map(String).slice(-100),
      },
      update: {
        favoriteGenres: topGenreIds.map(String),
        watchHistory: [
          ...(user.preferences?.watchHistory || []),
          ...watchedTmdbIds.map(String),
        ].slice(-100),
      },
    })
  }

  const recommendations: Array<
    Record<string, unknown> & { id: number; mediaType: string }
  > = []

  for (const genreId of topGenreIds) {
    try {
      const [movies, tvShows] = await Promise.all([
        tmdb.discoverMovies({ genre: genreId }),
        tmdb.discoverTV({ genre: genreId }),
      ])

      const newMovies = movies.filter((m) => !watchedTmdbIds.includes(m.id))
      const newTVShows = tvShows.filter((t) => !watchedTmdbIds.includes(t.id))

      recommendations.push(
        ...newMovies.slice(0, 2).map((m) => ({ ...m, mediaType: 'movie' }))
      )
      recommendations.push(
        ...newTVShows.slice(0, 2).map((t) => ({ ...t, mediaType: 'tv' }))
      )
    } catch (error) {
      console.error('Error fetching recommendations for genre:', error)
    }
  }

  if (recommendations.length < 10) {
    try {
      const [trendingMovies, trendingTV] = await Promise.all([
        tmdb.getTrendingMovies(),
        tmdb.getTrendingTV(),
      ])

      const newTrendingMovies = trendingMovies.filter(
        (m) => !watchedTmdbIds.includes(m.id)
      )
      const newTrendingTV = trendingTV.filter(
        (t) => !watchedTmdbIds.includes(t.id)
      )

      recommendations.push(
        ...newTrendingMovies
          .slice(0, 3)
          .map((m) => ({ ...m, mediaType: 'movie' }))
      )
      recommendations.push(
        ...newTrendingTV.slice(0, 3).map((t) => ({ ...t, mediaType: 'tv' }))
      )
    } catch (error) {
      console.error('Error fetching trending content:', error)
    }
  }

  return Array.from(
    new Map(recommendations.map((item) => [item.id, item])).values()
  ).slice(0, 12)
}
