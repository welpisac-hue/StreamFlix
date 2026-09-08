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

interface RecResponse {
  becauseYouWatched: {
    title: string
    items: RecommendationItem[]
  } | null
  recommended: RecommendationItem[]
}

function cardYear(item: RecommendationItem) {
  return (
    item.release_date?.split('-')[0] || item.first_air_date?.split('-')[0]
  )
}

function SkeletonRow({ title }: { title: string }) {
  return (
    <MovieRow title={title}>
      {Array.from({ length: 8 }).map((_, i) => (
        <div
          key={i}
          className="w-[140px] shrink-0 sm:w-[160px] md:w-[180px]"
        >
          <div className="aspect-[2/3] animate-pulse rounded-lg bg-white/10" />
          <div className="mt-2 h-3 w-3/4 animate-pulse rounded bg-white/10" />
        </div>
      ))}
    </MovieRow>
  )
}

export default function RecommendedSection() {
  const { data: session, status } = useSession()
  const [data, setData] = useState<RecResponse | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    if (status === 'loading') return
    if (!session) {
      setLoading(false)
      setData(null)
      return
    }

    let cancelled = false
    setLoading(true)
    ;(async () => {
      try {
        const response = await fetch('/api/recommendations')
        if (response.ok) {
          const json = await response.json()
          if (Array.isArray(json)) {
            if (!cancelled) {
              setData({ becauseYouWatched: null, recommended: json })
            }
          } else if (!cancelled) {
            setData(json)
          }
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
  }, [session, status])

  if (status === 'loading') return null
  if (!session) return null

  if (loading) {
    return (
      <>
        <SkeletonRow title="Recommended for You" />
      </>
    )
  }

  if (!data) return null

  const because = data.becauseYouWatched
  const recommended = data.recommended || []

  if (
    (!because || because.items.length === 0) &&
    recommended.length === 0
  ) {
    return null
  }

  return (
    <>
      {because && because.items.length > 0 && (
        <MovieRow title={`Because you watched ${because.title}`}>
          {because.items.map((item) => (
            <MovieCard
              key={`because-${item.mediaType}-${item.id}`}
              id={item.id}
              title={item.title || item.name}
              posterPath={item.poster_path}
              rating={item.vote_average}
              mediaType={item.mediaType}
              year={cardYear(item)}
            />
          ))}
        </MovieRow>
      )}

      {recommended.length > 0 && (
        <MovieRow title="Recommended for You">
          {recommended.map((item) => (
            <MovieCard
              key={`rec-${item.mediaType}-${item.id}`}
              id={item.id}
              title={item.title || item.name}
              posterPath={item.poster_path}
              rating={item.vote_average}
              mediaType={item.mediaType}
              year={cardYear(item)}
            />
          ))}
        </MovieRow>
      )}
    </>
  )
}
