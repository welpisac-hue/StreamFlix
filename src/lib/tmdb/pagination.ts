export type Paginated<T> = {
  results: T[]
  page: number
  totalPages: number
  totalResults: number
}

export type BrowseMediaType = 'movie' | 'tv'
