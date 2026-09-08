import 'server-only'
import axios from 'axios'
import { getImageUrl } from './images'
import type {
  Movie,
  TVShow,
  MovieDetails,
  TVShowDetails,
  Review,
  Genre,
} from './types'
import type { Paginated } from './pagination'

export type {
  Movie,
  TVShow,
  MovieDetails,
  TVShowDetails,
  Video,
  Cast,
  Crew,
  Season,
  Review,
  Genre,
  Episode,
} from './types'

export { getImageUrl } from './images'
export type { Paginated } from './pagination'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_API_KEY = process.env.TMDB_API_KEY?.trim()

const isV4Token = !!TMDB_API_KEY && TMDB_API_KEY.startsWith('eyJ')

const tmdbApi = axios.create({
  baseURL: TMDB_BASE_URL,
  ...(isV4Token
    ? {
        headers: {
          Authorization: `Bearer ${TMDB_API_KEY}`,
          Accept: 'application/json',
        },
      }
    : {
        params: {
          api_key: TMDB_API_KEY,
        },
      }),
})

function asPaginated<T>(data: {
  results?: T[]
  page?: number
  total_pages?: number
  total_results?: number
}): Paginated<T> {
  return {
    results: data.results || [],
    page: data.page || 1,
    totalPages: data.total_pages || 1,
    totalResults: data.total_results || 0,
  }
}

export const tmdb = {
  getTrendingMovies: async (timeWindow: 'day' | 'week' = 'week') => {
    const response = await tmdbApi.get(`/trending/movie/${timeWindow}`)
    return response.data.results as Movie[]
  },

  getPopularMovies: async (page: number = 1) => {
    const response = await tmdbApi.get('/movie/popular', { params: { page } })
    return response.data.results as Movie[]
  },

  getPopularMoviesPaged: async (page: number = 1): Promise<Paginated<Movie>> => {
    const response = await tmdbApi.get('/movie/popular', { params: { page } })
    return asPaginated<Movie>(response.data)
  },

  getTopRatedMovies: async (page: number = 1) => {
    const response = await tmdbApi.get('/movie/top_rated', { params: { page } })
    return response.data.results as Movie[]
  },

  getMovieDetails: async (movieId: number) => {
    const response = await tmdbApi.get(`/movie/${movieId}`, {
      params: { append_to_response: 'videos,credits,similar,reviews' },
    })
    return response.data as MovieDetails
  },

  getMovieReviews: async (movieId: number, page: number = 1) => {
    const response = await tmdbApi.get(`/movie/${movieId}/reviews`, {
      params: { page },
    })
    return response.data.results as Review[]
  },

  getTrendingTV: async (timeWindow: 'day' | 'week' = 'week') => {
    const response = await tmdbApi.get(`/trending/tv/${timeWindow}`)
    return response.data.results as TVShow[]
  },

  getPopularTV: async (page: number = 1) => {
    const response = await tmdbApi.get('/tv/popular', { params: { page } })
    return response.data.results as TVShow[]
  },

  getPopularTVPaged: async (page: number = 1): Promise<Paginated<TVShow>> => {
    const response = await tmdbApi.get('/tv/popular', { params: { page } })
    return asPaginated<TVShow>(response.data)
  },

  getTopRatedTV: async (page: number = 1) => {
    const response = await tmdbApi.get('/tv/top_rated', { params: { page } })
    return response.data.results as TVShow[]
  },

  getTVShowDetails: async (tvId: number) => {
    const response = await tmdbApi.get(`/tv/${tvId}`, {
      params: { append_to_response: 'videos,credits,similar,reviews' },
    })
    return response.data as TVShowDetails
  },

  getTVShowReviews: async (tvId: number, page: number = 1) => {
    const response = await tmdbApi.get(`/tv/${tvId}/reviews`, {
      params: { page },
    })
    return response.data.results as Review[]
  },

  getSeasonDetails: async (tvId: number, seasonNumber: number) => {
    const response = await tmdbApi.get(`/tv/${tvId}/season/${seasonNumber}`)
    return response.data
  },

  searchMulti: async (query: string, page: number = 1) => {
    const response = await tmdbApi.get('/search/multi', {
      params: { query, page },
    })
    return response.data.results
  },

  searchMovies: async (query: string, page: number = 1) => {
    const response = await tmdbApi.get('/search/movie', {
      params: { query, page },
    })
    return response.data.results as Movie[]
  },

  searchMoviesPaged: async (query: string, page: number = 1) => {
    const response = await tmdbApi.get('/search/movie', {
      params: { query, page, include_adult: false },
    })
    return asPaginated<Movie>(response.data)
  },

  searchTV: async (query: string, page: number = 1) => {
    const response = await tmdbApi.get('/search/tv', {
      params: { query, page },
    })
    return response.data.results as TVShow[]
  },

  searchTVPaged: async (query: string, page: number = 1) => {
    const response = await tmdbApi.get('/search/tv', {
      params: { query, page, include_adult: false },
    })
    return asPaginated<TVShow>(response.data)
  },

  discoverMovies: async (params: {
    genre?: number
    year?: number
    page?: number
  }) => {
    const response = await tmdbApi.get('/discover/movie', {
      params: {
        with_genres: params.genre,
        primary_release_year: params.year,
        page: params.page,
        sort_by: 'popularity.desc',
      },
    })
    return response.data.results as Movie[]
  },

  discoverMoviesPaged: async (params: {
    genre?: number
    year?: number
    page?: number
    sortBy?: string
  }): Promise<Paginated<Movie>> => {
    const response = await tmdbApi.get('/discover/movie', {
      params: {
        with_genres: params.genre,
        primary_release_year: params.year,
        page: params.page || 1,
        sort_by: params.sortBy || 'popularity.desc',
        include_adult: false,
      },
    })
    return asPaginated<Movie>(response.data)
  },

  discoverTV: async (params: {
    genre?: number
    year?: number
    page?: number
  }) => {
    const response = await tmdbApi.get('/discover/tv', {
      params: {
        with_genres: params.genre,
        first_air_date_year: params.year,
        page: params.page,
        sort_by: 'popularity.desc',
      },
    })
    return response.data.results as TVShow[]
  },

  discoverTVPaged: async (params: {
    genre?: number
    year?: number
    page?: number
    sortBy?: string
  }): Promise<Paginated<TVShow>> => {
    const response = await tmdbApi.get('/discover/tv', {
      params: {
        with_genres: params.genre,
        first_air_date_year: params.year,
        page: params.page || 1,
        sort_by: params.sortBy || 'popularity.desc',
        include_adult: false,
      },
    })
    return asPaginated<TVShow>(response.data)
  },

  getMovieGenres: async () => {
    const response = await tmdbApi.get('/genre/movie/list')
    return response.data.genres as Genre[]
  },

  getTVGenres: async () => {
    const response = await tmdbApi.get('/genre/tv/list')
    return response.data.genres as Genre[]
  },

  getPopularNetworkShows: async () => {
    const response = await tmdbApi.get('/discover/tv', {
      params: {
        with_networks: '213',
        sort_by: 'popularity.desc',
      },
    })
    return response.data.results as TVShow[]
  },

  getUpcomingMovies: async () => {
    const response = await tmdbApi.get('/movie/upcoming')
    return response.data.results as Movie[]
  },

  /** Movies with a primary release date on or after today, soonest first. */
  getComingSoonMovies: async (page: number = 1) => {
    const today = new Date()
    const y = today.getFullYear()
    const m = String(today.getMonth() + 1).padStart(2, '0')
    const d = String(today.getDate()).padStart(2, '0')
    const todayStr = `${y}-${m}-${d}`

    const response = await tmdbApi.get('/discover/movie', {
      params: {
        'primary_release_date.gte': todayStr,
        sort_by: 'primary_release_date.asc',
        include_adult: false,
        page,
      },
    })
    return response.data.results as Movie[]
  },

  getMovieRecommendations: async (movieId: number, page: number = 1) => {
    const response = await tmdbApi.get(`/movie/${movieId}/recommendations`, {
      params: { page },
    })
    return response.data.results as Movie[]
  },

  getTVRecommendations: async (tvId: number, page: number = 1) => {
    const response = await tmdbApi.get(`/tv/${tvId}/recommendations`, {
      params: { page },
    })
    return response.data.results as TVShow[]
  },

  getMovieSimilar: async (movieId: number, page: number = 1) => {
    const response = await tmdbApi.get(`/movie/${movieId}/similar`, {
      params: { page },
    })
    return response.data.results as Movie[]
  },

  getTVSimilar: async (tvId: number, page: number = 1) => {
    const response = await tmdbApi.get(`/tv/${tvId}/similar`, {
      params: { page },
    })
    return response.data.results as TVShow[]
  },

  getPopularPeople: async (page: number = 1) => {
    const response = await tmdbApi.get('/person/popular', { params: { page } })
    return (response.data.results || []) as Array<{
      id: number
      name: string
      profile_path: string | null
      known_for_department?: string
    }>
  },

  getImageUrl,
}
