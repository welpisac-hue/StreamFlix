'use client'

import { Suspense, useState, useEffect, useCallback } from 'react'
import { useSearchParams } from 'next/navigation'
import type { Movie, TVShow, Genre } from '@/lib/tmdb/types'
import MovieCard from '@/components/MovieCard'
import Navbar from '@/components/Navbar'
import { Search, Filter, Film, Tv } from 'lucide-react'

function SearchContent() {
  const searchParams = useSearchParams()
  const initialQuery = searchParams.get('q') || ''

  const [query, setQuery] = useState(initialQuery)
  const [movies, setMovies] = useState<Movie[]>([])
  const [tvShows, setTVShows] = useState<TVShow[]>([])
  const [genres, setGenres] = useState<Genre[]>([])
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)
  const [mediaType, setMediaType] = useState<'all' | 'movie' | 'tv'>('all')
  const [loading, setLoading] = useState(false)
  const [hasSearched, setHasSearched] = useState(false)

  useEffect(() => {
    async function fetchGenres() {
      try {
        const response = await fetch('/api/tmdb/genres?type=movie')
        if (response.ok) {
          setGenres(await response.json())
        }
      } catch (error) {
        console.error('Failed to load genres:', error)
      }
    }
    fetchGenres()
  }, [])

  const performSearch = useCallback(
    async (searchQuery: string, type: 'all' | 'movie' | 'tv' = mediaType) => {
      if (!searchQuery.trim()) return

      setLoading(true)
      setHasSearched(true)
      setSelectedGenre(null)

      try {
        const response = await fetch(
          `/api/tmdb/search?q=${encodeURIComponent(searchQuery)}&type=${type}`
        )
        if (response.ok) {
          const data = await response.json()
          setMovies(type === 'tv' ? [] : data.movies || [])
          setTVShows(type === 'movie' ? [] : data.tvShows || [])
        }
      } catch (error) {
        console.error('Search error:', error)
      } finally {
        setLoading(false)
      }
    },
    [mediaType]
  )

  useEffect(() => {
    if (initialQuery) {
      setQuery(initialQuery)
      performSearch(initialQuery)
    }
  }, [initialQuery, performSearch])

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    performSearch(query)
  }

  const handleMediaTypeChange = (type: 'all' | 'movie' | 'tv') => {
    setMediaType(type)
    if (query.trim()) {
      performSearch(query, type)
    } else if (selectedGenre) {
      filterByGenre(selectedGenre, type)
    }
  }

  const filterByGenre = async (
    genreId: number | null,
    type: 'all' | 'movie' | 'tv' = mediaType
  ) => {
    setSelectedGenre(genreId)

    if (!genreId) {
      if (query.trim()) {
        performSearch(query, type)
      } else {
        setMovies([])
        setTVShows([])
        setHasSearched(false)
      }
      return
    }

    setLoading(true)
    setHasSearched(true)

    try {
      const response = await fetch(
        `/api/tmdb/search?genre=${genreId}&type=${type}`
      )
      if (response.ok) {
        const data = await response.json()
        setMovies(type === 'tv' ? [] : data.movies || [])
        setTVShows(type === 'movie' ? [] : data.tvShows || [])
      }
    } catch (error) {
      console.error('Genre filter error:', error)
    } finally {
      setLoading(false)
    }
  }

  const moodFilters = [
    { name: 'Action', emoji: '🎬', genres: [28] },
    { name: 'Comedy', emoji: '😂', genres: [35] },
    { name: 'Drama', emoji: '🎭', genres: [18] },
    { name: 'Horror', emoji: '👻', genres: [27] },
    { name: 'Romance', emoji: '❤️', genres: [10749] },
    { name: 'Sci-Fi', emoji: '🚀', genres: [878] },
    { name: 'Thriller', emoji: '😱', genres: [53] },
    { name: 'Animation', emoji: '🎨', genres: [16] },
  ]

  return (
    <div className="page-shell pb-16 pt-[calc(var(--nav-height)+2rem)]">
      <h1 className="mb-2 font-display text-4xl tracking-wide text-white md:text-5xl">
        Search
      </h1>
      <p className="mb-8 text-sm text-zinc-500">Find movies and shows instantly</p>

      <form onSubmit={handleSubmit} className="mb-8">
        <div className="relative">
          <input
            type="text"
            placeholder="Search for movies, TV shows..."
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            className="w-full rounded-xl border border-white/10 bg-white/5 py-4 pl-12 pr-28 text-white outline-none transition focus:border-[var(--primary)]"
          />
          <Search className="absolute left-4 top-1/2 h-5 w-5 -translate-y-1/2 text-zinc-500" />
          <button
            type="submit"
            className="absolute right-2 top-1/2 -translate-y-1/2 rounded-lg bg-[var(--primary)] px-5 py-2 text-sm font-semibold text-white hover:bg-[var(--primary-dark)]"
          >
            Search
          </button>
        </div>
      </form>

      <div className="mb-8 space-y-4">
        <div className="flex items-center gap-2 text-sm text-zinc-400">
          <Filter className="h-4 w-4" />
          Filters
        </div>

        <div className="flex flex-wrap gap-2">
          {(
            [
              ['all', 'All', null],
              ['movie', 'Movies', Film],
              ['tv', 'TV Shows', Tv],
            ] as const
          ).map(([type, label, Icon]) => (
            <button
              key={type}
              type="button"
              onClick={() => handleMediaTypeChange(type)}
              className={`inline-flex items-center gap-2 rounded-lg px-4 py-2 text-sm transition ${
                mediaType === type
                  ? 'bg-[var(--primary)] text-white'
                  : 'border border-white/10 bg-white/5 text-zinc-300 hover:bg-white/10'
              }`}
            >
              {Icon ? <Icon className="h-4 w-4" /> : null}
              {label}
            </button>
          ))}
        </div>

        <div className="flex flex-wrap gap-2">
          <button
            type="button"
            onClick={() => filterByGenre(null)}
            className={`rounded-full px-3 py-1 text-sm transition ${
              selectedGenre === null
                ? 'bg-[var(--primary)] text-white'
                : 'border border-white/10 bg-white/5 text-zinc-400 hover:text-white'
            }`}
          >
            All Genres
          </button>
          {genres.map((genre) => (
            <button
              key={genre.id}
              type="button"
              onClick={() => filterByGenre(genre.id)}
              className={`rounded-full px-3 py-1 text-sm transition ${
                selectedGenre === genre.id
                  ? 'bg-[var(--primary)] text-white'
                  : 'border border-white/10 bg-white/5 text-zinc-400 hover:text-white'
              }`}
            >
              {genre.name}
            </button>
          ))}
        </div>

        <div>
          <h3 className="mb-3 text-sm font-semibold text-zinc-300">Browse by Mood</h3>
          <div className="grid grid-cols-2 gap-2 md:grid-cols-4">
            {moodFilters.map((mood) => (
              <button
                key={mood.name}
                type="button"
                onClick={() => filterByGenre(mood.genres[0])}
                className="rounded-xl border border-white/10 bg-white/[0.03] px-4 py-3 text-left transition hover:bg-white/[0.06]"
              >
                <div className="text-xl">{mood.emoji}</div>
                <div className="mt-1 text-sm font-medium text-white">{mood.name}</div>
              </button>
            ))}
          </div>
        </div>
      </div>

      {loading && (
        <div className="py-12 text-center text-zinc-400">Searching...</div>
      )}

      {!loading && hasSearched && (
        <div className="space-y-10">
          {movies.length > 0 && (
            <div>
              <h2 className="mb-4 font-display text-2xl tracking-wide text-white">
                Movies
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {movies.map((movie) => (
                  <MovieCard
                    key={movie.id}
                    id={movie.id}
                    title={movie.title}
                    posterPath={movie.poster_path}
                    rating={movie.vote_average}
                    mediaType="movie"
                    year={movie.release_date?.split('-')[0]}
                  />
                ))}
              </div>
            </div>
          )}

          {tvShows.length > 0 && (
            <div>
              <h2 className="mb-4 font-display text-2xl tracking-wide text-white">
                TV Shows
              </h2>
              <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
                {tvShows.map((show) => (
                  <MovieCard
                    key={show.id}
                    id={show.id}
                    title={show.name}
                    posterPath={show.poster_path}
                    rating={show.vote_average}
                    mediaType="tv"
                    year={show.first_air_date?.split('-')[0]}
                  />
                ))}
              </div>
            </div>
          )}

          {movies.length === 0 && tvShows.length === 0 && (
            <p className="py-12 text-center text-zinc-500">
              No results found{query ? ` for "${query}"` : ''}
            </p>
          )}
        </div>
      )}

      {!hasSearched && (
        <p className="py-12 text-center text-zinc-500">
          Enter a search term or pick a mood to browse
        </p>
      )}
    </div>
  )
}

export default function SearchPage() {
  return (
    <div className="min-h-screen bg-background">
      <Navbar />
      <Suspense
        fallback={
          <div className="page-shell pt-[calc(var(--nav-height)+2rem)] text-zinc-400">
            Loading search...
          </div>
        }
      >
        <SearchContent />
      </Suspense>
    </div>
  )
}
