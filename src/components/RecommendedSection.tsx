'use client'

import { useState, useEffect } from 'react'
import { useSession } from 'next-auth/react'
import MovieCard from './MovieCard'
import MovieRow from './MovieRow'

interface RecommendationItem {
  id: number
  title: string
  name: string
  poster_path: string
  vote_average: number
  release_date: string
  first_air_date: string
  mediaType: 'movie' | 'tv'
}

export default function RecommendedSection() {
  const { data: session } = useSession()
  const [recommendations, setRecommendations] = useState<RecommendationItem[]>(
    []
  )
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (!session) {
      setLoading(false)
      return
    }

    let cancelled = false
    ;(async () => {
      try {
        const response = await fetch('/api/recommendations')
        if (response.ok) {
          const data = await response.json()
          if (!cancelled) setRecommendations(data)
        }
      } catch (error) {
        console.error('Error fetching recommendations:', error)
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [session])

  if (!session || loading || recommendations.length === 0) {
    return null
  }

  return (
    <MovieRow title="Recommended for You">
      {recommendations.map((item) => (
        <MovieCard
          key={`${item.mediaType}-${item.id}`}
          id={item.id}
          title={item.title || item.name}
          posterPath={item.poster_path}
          rating={item.vote_average}
          mediaType={item.mediaType}
          year={
            item.release_date?.split('-')[0] ||
            item.first_air_date?.split('-')[0]
          }
        />
      ))}
    </MovieRow>
  )
}
