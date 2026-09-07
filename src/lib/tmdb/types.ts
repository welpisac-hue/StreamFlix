export interface Movie {
  id: number
  title: string
  overview: string
  poster_path: string
  backdrop_path: string
  release_date: string
  vote_average: number
  vote_count: number
  genre_ids: number[]
  popularity: number
  original_language: string
}

export interface TVShow {
  id: number
  name: string
  overview: string
  poster_path: string
  backdrop_path: string
  first_air_date: string
  vote_average: number
  vote_count: number
  genre_ids: number[]
  popularity: number
  original_language: string
}

export interface MovieDetails extends Movie {
  genres: { id: number; name: string }[]
  runtime: number
  status: string
  tagline: string
  imdb_id: string
  videos: { results: Video[] }
  credits: { cast: Cast[]; crew: Crew[] }
  similar: { results: Movie[] }
  reviews: { results: Review[] }
}

export interface TVShowDetails extends TVShow {
  genres: { id: number; name: string }[]
  number_of_seasons: number
  number_of_episodes: number
  seasons: Season[]
  status: string
  tagline: string
  created_by: { id: number; name: string; profile_path: string }[]
  videos: { results: Video[] }
  credits: { cast: Cast[]; crew: Crew[] }
  similar: { results: TVShow[] }
  reviews: { results: Review[] }
}

export interface Video {
  id: string
  key: string
  name: string
  site: string
  type: string
  official: boolean
}

export interface Cast {
  id: number
  name: string
  character: string
  profile_path: string
  order: number
}

export interface Crew {
  id: number
  name: string
  job: string
  department: string
  profile_path: string
}

export interface Season {
  id: number
  season_number: number
  episode_count: number
  name: string
  overview: string
  poster_path: string
  air_date: string
}

export interface Review {
  id: string
  author: string
  author_details: { name: string; username: string; avatar_path: string }
  content: string
  created_at: string
  updated_at: string
}

export interface Genre {
  id: number
  name: string
}

export interface Episode {
  id: number
  name: string
  overview: string
  episode_number: number
  air_date: string
  still_path: string | null
  runtime: number | null
}
