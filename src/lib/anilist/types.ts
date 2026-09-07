export type AnimeFormat =
  | 'TV'
  | 'TV_SHORT'
  | 'MOVIE'
  | 'SPECIAL'
  | 'OVA'
  | 'ONA'
  | 'MUSIC'
  | 'UNKNOWN'

export interface AnimeTitle {
  romaji?: string | null
  english?: string | null
  native?: string | null
}

export interface AnimeListItem {
  id: number // AniList ID (preferred for embeds)
  malId: number | null
  title: string
  titles: AnimeTitle
  coverImage: string | null
  bannerImage: string | null
  averageScore: number | null
  episodes: number | null
  format: string | null
  status: string | null
  seasonYear: number | null
  genres: string[]
  description: string | null
}

export interface AnimePageResult {
  items: AnimeListItem[]
  page: number
  totalPages: number
  total: number
  hasNextPage: boolean
}

export interface AnimeCharacter {
  id: number
  name: string
  image: string | null
  role: string
}

export interface AnimeDetails extends AnimeListItem {
  duration: number | null
  studios: string[]
  trailerYoutubeId: string | null
  characters: AnimeCharacter[]
  recommendations: AnimeListItem[]
}
