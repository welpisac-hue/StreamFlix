import type {
  AnimeDetails,
  AnimeListItem,
  AnimePageResult,
  AnimeTitle,
} from './types'

const ANILIST_URL = 'https://graphql.anilist.co'
const JIKAN_URL = 'https://api.jikan.moe/v4'
const ARM_URL = 'https://arm.haglund.dev/api/v2/ids'

const MEDIA_FIELDS = `
  id
  idMal
  title { romaji english native }
  coverImage { large extraLarge }
  bannerImage
  description(asHtml: false)
  episodes
  duration
  averageScore
  genres
  status
  seasonYear
  format
  studios { nodes { name } }
  trailer { id site }
`

/**
 * AniList blocks most Cloudflare Worker IPs. Prefer Jikan in production so
 * lists, search, and detail pages stay online.
 */
function preferJikanPrimary(): boolean {
  return (
    process.env.NODE_ENV === 'production' ||
    process.env.NEXTJS_ENV === 'production' ||
    process.env.CF_PAGES === '1' ||
    !!process.env.CF_WORKER
  )
}

function pickTitle(titles: AnimeTitle, fallback = 'Untitled'): string {
  return titles.english || titles.romaji || titles.native || fallback
}

function stripHtml(html: string | null | undefined): string | null {
  if (!html) return null
  return html.replace(/<[^>]+>/g, ' ').replace(/\s+/g, ' ').trim()
}

function scoreFromAnilist(score: number | null | undefined): number | null {
  if (score == null) return null
  return Math.round((score / 10) * 10) / 10
}

function mapAnilistMedia(media: any): AnimeListItem {
  const titles: AnimeTitle = {
    romaji: media.title?.romaji,
    english: media.title?.english,
    native: media.title?.native,
  }
  return {
    id: media.id,
    malId: media.idMal ?? null,
    title: pickTitle(titles),
    titles,
    coverImage: media.coverImage?.extraLarge || media.coverImage?.large || null,
    bannerImage: media.bannerImage || null,
    averageScore: scoreFromAnilist(media.averageScore),
    episodes: media.episodes ?? null,
    format: media.format ?? null,
    status: media.status ?? null,
    seasonYear: media.seasonYear ?? null,
    genres: media.genres || [],
    description: stripHtml(media.description),
  }
}

async function anilistQuery<T>(
  query: string,
  variables?: Record<string, unknown>
): Promise<T | null> {
  try {
    const res = await fetch(ANILIST_URL, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Accept: 'application/json',
        'User-Agent': 'StreamFlix/1.0 (anime catalog; contact via site)',
      },
      body: JSON.stringify({ query, variables }),
      next: { revalidate: 300 },
    })
    if (!res.ok) return null
    const json = await res.json()
    if (json.errors?.length) return null
    return json.data as T
  } catch {
    return null
  }
}

async function jikanGet<T>(path: string, retries = 2): Promise<T | null> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      const res = await fetch(`${JIKAN_URL}${path}`, {
        headers: {
          Accept: 'application/json',
          'User-Agent': 'StreamFlix/1.0 (anime catalog; contact via site)',
        },
        // Avoid sticky empty/error caches on Cloudflare Workers
        cache: 'no-store',
      })
      if (res.status === 429 || res.status >= 500) {
        if (attempt < retries) {
          await new Promise((r) => setTimeout(r, 700 * (attempt + 1)))
          continue
        }
        return null
      }
      if (!res.ok) return null
      return (await res.json()) as T
    } catch {
      if (attempt < retries) {
        await new Promise((r) => setTimeout(r, 700 * (attempt + 1)))
        continue
      }
      return null
    }
  }
  return null
}

async function fetchWithTimeout(
  url: string,
  ms = 4000
): Promise<Response | null> {
  const controller = new AbortController()
  const timer = setTimeout(() => controller.abort(), ms)
  try {
    return await fetch(url, {
      signal: controller.signal,
      next: { revalidate: 86400 },
    })
  } catch {
    return null
  } finally {
    clearTimeout(timer)
  }
}

async function malToAnilist(malId: number): Promise<number | null> {
  try {
    const res = await fetchWithTimeout(
      `${ARM_URL}?source=myanimelist&id=${malId}&include=anilist`
    )
    if (!res?.ok) return null
    const data = await res.json()
    return typeof data.anilist === 'number' ? data.anilist : null
  } catch {
    return null
  }
}

async function anilistToMal(anilistId: number): Promise<number | null> {
  try {
    const res = await fetchWithTimeout(
      `${ARM_URL}?source=anilist&id=${anilistId}&include=myanimelist`
    )
    if (!res?.ok) return null
    const data = await res.json()
    return typeof data.myanimelist === 'number' ? data.myanimelist : null
  } catch {
    return null
  }
}

function mapJikanAnime(item: any, routeId: number): AnimeListItem {
  const titles: AnimeTitle = {
    romaji: item.title,
    english: item.title_english,
    native: item.title_japanese,
  }
  return {
    // Prefer AniList ID when known (embeds). Otherwise MAL ID — detail page upgrades it.
    id: routeId,
    malId: item.mal_id ?? null,
    title: pickTitle(titles, item.title),
    titles,
    coverImage:
      item.images?.webp?.large_image_url ||
      item.images?.jpg?.large_image_url ||
      null,
    bannerImage: null,
    averageScore: item.score ?? null,
    episodes: item.episodes ?? null,
    format: item.type ?? null,
    status: item.status ?? null,
    seasonYear: item.year ?? item.aired?.prop?.from?.year ?? null,
    genres: (item.genres || []).map((g: any) => g.name),
    description: stripHtml(item.synopsis),
  }
}

/** Sync map — avoid N parallel ARM calls (rate limits / Worker subrequests). */
function mapJikanList(items: any[]): AnimeListItem[] {
  return items
    .filter((item) => item?.mal_id)
    .map((item) => mapJikanAnime(item, item.mal_id))
}

function hasItems(
  result: AnimePageResult | null | undefined
): result is AnimePageResult {
  return !!result && Array.isArray(result.items) && result.items.length > 0
}

async function firstPaged(
  ...factories: Array<() => Promise<AnimePageResult | null>>
): Promise<AnimePageResult> {
  for (const factory of factories) {
    try {
      const result = await factory()
      if (hasItems(result)) return result
    } catch {
      // try next source
    }
  }
  return {
    items: [],
    page: 1,
    totalPages: 1,
    total: 0,
    hasNextPage: false,
  }
}

async function listFromAnilist(
  sort: string,
  page = 1,
  perPage = 24
): Promise<AnimePageResult | null> {
  const data = await anilistQuery<{
    Page: {
      pageInfo: {
        total: number
        currentPage: number
        lastPage: number
        hasNextPage: boolean
      }
      media: any[]
    }
  }>(
    `query ($page: Int, $perPage: Int, $sort: [MediaSort]) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(type: ANIME, sort: $sort, isAdult: false) { ${MEDIA_FIELDS} }
      }
    }`,
    { page, perPage, sort: [sort] }
  )
  if (!data?.Page?.media?.length) return null
  const info = data.Page.pageInfo
  return {
    items: data.Page.media.map(mapAnilistMedia),
    page: info?.currentPage || page,
    totalPages: Math.max(info?.lastPage || 1, 1),
    total: info?.total || data.Page.media.length,
    hasNextPage: !!info?.hasNextPage,
  }
}

async function searchAnilist(
  search: string,
  page = 1,
  perPage = 24
): Promise<AnimePageResult | null> {
  const data = await anilistQuery<{
    Page: {
      pageInfo: {
        total: number
        currentPage: number
        lastPage: number
        hasNextPage: boolean
      }
      media: any[]
    }
  }>(
    `query ($page: Int, $perPage: Int, $search: String) {
      Page(page: $page, perPage: $perPage) {
        pageInfo { total currentPage lastPage hasNextPage }
        media(type: ANIME, search: $search, sort: POPULARITY_DESC, isAdult: false) {
          ${MEDIA_FIELDS}
        }
      }
    }`,
    { page, perPage, search }
  )
  if (!data?.Page?.media?.length) return null
  const info = data.Page.pageInfo
  return {
    items: data.Page.media.map(mapAnilistMedia),
    page: info?.currentPage || page,
    totalPages: Math.max(info?.lastPage || 1, 1),
    total: info?.total || data.Page.media.length,
    hasNextPage: !!info?.hasNextPage,
  }
}

async function jikanListPaged(
  path: string,
  page: number
): Promise<AnimePageResult> {
  const data = await jikanGet<{
    data: any[]
    pagination?: {
      last_visible_page?: number
      has_next_page?: boolean
      items?: { total?: number }
    }
  }>(path)
  const items = mapJikanList(data?.data || [])
  const totalPages = data?.pagination?.last_visible_page || 1
  const total = data?.pagination?.items?.total || items.length
  return {
    items,
    page,
    totalPages,
    total,
    hasNextPage: !!data?.pagination?.has_next_page,
  }
}

async function detailsFromAnilist(id: number): Promise<AnimeDetails | null> {
  const data = await anilistQuery<{ Media: any }>(
    `query ($id: Int) {
      Media(id: $id, type: ANIME) {
        ${MEDIA_FIELDS}
        characters(sort: [ROLE, RELEVANCE, ID], perPage: 12) {
          edges {
            role
            node {
              id
              name { full }
              image { large }
            }
          }
        }
        recommendations(perPage: 8, sort: RATING_DESC) {
          nodes {
            mediaRecommendation {
              ${MEDIA_FIELDS}
            }
          }
        }
      }
    }`,
    { id }
  )

  if (!data?.Media) return null
  const media = data.Media
  const base = mapAnilistMedia(media)
  return {
    ...base,
    duration: media.duration ?? null,
    studios: (media.studios?.nodes || []).map((s: any) => s.name),
    trailerYoutubeId:
      media.trailer?.site === 'youtube' ? media.trailer.id : null,
    characters: (media.characters?.edges || []).map((edge: any) => ({
      id: edge.node.id,
      name: edge.node.name.full,
      image: edge.node.image?.large || null,
      role: edge.role || 'SUPPORTING',
    })),
    recommendations: (media.recommendations?.nodes || [])
      .map((n: any) => n.mediaRecommendation)
      .filter(Boolean)
      .map(mapAnilistMedia),
  }
}

/**
 * Load full details from Jikan by MAL id, then resolve the best AniList id
 * for TryEmbed (falls back to MAL id if ARM is unavailable).
 */
async function detailsFromJikanByMal(
  malId: number,
  preferredAnilistId?: number | null
): Promise<AnimeDetails | null> {
  const full = await jikanGet<{ data: any }>(`/anime/${malId}/full`)
  if (!full?.data) return null

  const resolvedAnilist =
    preferredAnilistId && preferredAnilistId > 0
      ? preferredAnilistId
      : (await malToAnilist(malId)) ?? malId

  const base = mapJikanAnime(full.data, resolvedAnilist)

  // Optional extras — never fail the whole page if these rate-limit
  const [charsRes, recRes] = await Promise.all([
    jikanGet<{ data: any[] }>(`/anime/${malId}/characters`),
    jikanGet<{ data: any[] }>(`/anime/${malId}/recommendations`),
  ])

  const characters = (charsRes?.data || []).slice(0, 12).map((c: any) => ({
    id: c.character?.mal_id ?? 0,
    name: c.character?.name || 'Unknown',
    image:
      c.character?.images?.webp?.image_url ||
      c.character?.images?.jpg?.image_url ||
      null,
    role: c.role || 'Supporting',
  }))

  const recommendations: AnimeListItem[] = (recRes?.data || [])
    .slice(0, 8)
    .map((rec: any) => {
      const entry = rec.entry
      if (!entry?.mal_id) return null
      return mapJikanAnime(
        {
          ...entry,
          score: null,
          episodes: null,
          type: null,
          status: null,
          year: null,
          genres: [],
          synopsis: null,
        },
        entry.mal_id
      )
    })
    .filter(Boolean) as AnimeListItem[]

  const trailerYoutubeId =
    full.data.trailer?.youtube_id ||
    (typeof full.data.trailer?.url === 'string'
      ? full.data.trailer.url.match(/[?&]v=([^&]+)/)?.[1]
      : null) ||
    null

  const durationMins = full.data.duration
    ? parseInt(String(full.data.duration), 10) || null
    : null

  return {
    ...base,
    malId: full.data.mal_id ?? malId,
    duration: durationMins,
    studios: (full.data.studios || []).map((s: any) => s.name),
    trailerYoutubeId,
    characters,
    recommendations,
  }
}

async function resolveDetails(id: number): Promise<AnimeDetails | null> {
  // Production / Cloudflare: catalog links use MAL ids — hit Jikan first.
  // Avoid treating a MAL id as AniList (wrong title or empty 404).
  if (preferJikanPrimary()) {
    const byMal = await detailsFromJikanByMal(id)
    if (byMal) return byMal

    const fromAl = await detailsFromAnilist(id)
    if (fromAl) return fromAl

    const malFromAnilist = await anilistToMal(id)
    if (malFromAnilist && malFromAnilist !== id) {
      const byMapped = await detailsFromJikanByMal(malFromAnilist, id)
      if (byMapped) return byMapped
    }
    return null
  }

  // Local / AniList-friendly: try AniList, then ID mapping, then MAL
  const fromAl = await detailsFromAnilist(id)
  if (fromAl) return fromAl

  const malFromAnilist = await anilistToMal(id)
  if (malFromAnilist) {
    const byMapped = await detailsFromJikanByMal(malFromAnilist, id)
    if (byMapped) return byMapped
  }

  const byMal = await detailsFromJikanByMal(id)
  if (byMal) return byMal

  return null
}

function jikanThenAnilist(
  jikanFactories: Array<() => Promise<AnimePageResult | null>>,
  anilistFactory: () => Promise<AnimePageResult | null>
): Promise<AnimePageResult> {
  if (preferJikanPrimary()) {
    return firstPaged(...jikanFactories, anilistFactory)
  }
  return firstPaged(anilistFactory, ...jikanFactories)
}

export const animeApi = {
  getTrending: async (page = 1): Promise<AnimeListItem[]> => {
    const paged = await animeApi.getTrendingPaged(page)
    return paged.items
  },

  getTrendingPaged: async (page = 1): Promise<AnimePageResult> => {
    return jikanThenAnilist(
      [
        () =>
          jikanListPaged(
            `/top/anime?filter=airing&page=${page}&limit=24`,
            page
          ),
        () => jikanListPaged(`/top/anime?page=${page}&limit=24`, page),
        () =>
          jikanListPaged(
            `/anime?order_by=members&sort=desc&page=${page}&limit=24&sfw=true`,
            page
          ),
      ],
      () => listFromAnilist('TRENDING_DESC', page)
    )
  },

  getPopular: async (page = 1): Promise<AnimeListItem[]> => {
    const paged = await animeApi.getPopularPaged(page)
    return paged.items
  },

  getPopularPaged: async (page = 1): Promise<AnimePageResult> => {
    return jikanThenAnilist(
      [
        () =>
          jikanListPaged(
            `/top/anime?filter=bypopularity&page=${page}&limit=24`,
            page
          ),
        () =>
          jikanListPaged(
            `/anime?order_by=members&sort=desc&page=${page}&limit=24&sfw=true`,
            page
          ),
        () => jikanListPaged(`/top/anime?page=${page}&limit=24`, page),
      ],
      () => listFromAnilist('POPULARITY_DESC', page)
    )
  },

  getTopRated: async (page = 1): Promise<AnimeListItem[]> => {
    const paged = await animeApi.getTopRatedPaged(page)
    return paged.items
  },

  getTopRatedPaged: async (page = 1): Promise<AnimePageResult> => {
    return jikanThenAnilist(
      [
        () => jikanListPaged(`/top/anime?page=${page}&limit=24`, page),
        () =>
          jikanListPaged(
            `/anime?order_by=score&sort=desc&page=${page}&limit=24&sfw=true`,
            page
          ),
      ],
      () => listFromAnilist('SCORE_DESC', page)
    )
  },

  getUpcoming: async (page = 1): Promise<AnimeListItem[]> => {
    const paged = await animeApi.getUpcomingPaged(page)
    return paged.items
  },

  getUpcomingPaged: async (page = 1): Promise<AnimePageResult> => {
    return jikanThenAnilist(
      [
        () => jikanListPaged(`/seasons/upcoming?page=${page}&limit=24`, page),
        () => jikanListPaged(`/seasons/now?page=${page}&limit=24`, page),
        () =>
          jikanListPaged(
            `/top/anime?filter=upcoming&page=${page}&limit=24`,
            page
          ),
      ],
      () => listFromAnilist('START_DATE_DESC', page)
    )
  },

  search: async (query: string, page = 1): Promise<AnimeListItem[]> => {
    const paged = await animeApi.searchPaged(query, page)
    return paged.items
  },

  searchPaged: async (query: string, page = 1): Promise<AnimePageResult> => {
    const q = query.trim()
    if (!q) {
      return { items: [], page: 1, totalPages: 1, total: 0, hasNextPage: false }
    }
    const encoded = encodeURIComponent(q)
    return jikanThenAnilist(
      [
        () =>
          jikanListPaged(
            `/anime?q=${encoded}&page=${page}&limit=24&sfw=true`,
            page
          ),
        () =>
          jikanListPaged(
            `/anime?q=${encoded}&page=${page}&limit=24&sfw=true&order_by=members&sort=desc`,
            page
          ),
        () =>
          jikanListPaged(
            `/anime?q=${encoded}&page=${page}&limit=24&order_by=popularity&sort=asc`,
            page
          ),
      ],
      () => searchAnilist(q, page)
    )
  },

  getByGenre: async (genre: string, page = 1): Promise<AnimeListItem[]> => {
    if (!preferJikanPrimary()) {
      const data = await anilistQuery<{
        Page: {
          media: any[]
        }
      }>(
        `query ($page: Int, $genre: String) {
          Page(page: $page, perPage: 24) {
            media(type: ANIME, genre: $genre, sort: POPULARITY_DESC, isAdult: false) {
              ${MEDIA_FIELDS}
            }
          }
        }`,
        { page, genre }
      )
      if (data?.Page?.media?.length) {
        return data.Page.media.map(mapAnilistMedia)
      }
    }

    const encoded = encodeURIComponent(genre)
    const result = await jikanListPaged(
      `/anime?q=${encoded}&page=${page}&limit=24&sfw=true&order_by=members&sort=desc`,
      page
    )
    return result.items
  },

  getDetails: async (id: number): Promise<AnimeDetails | null> => {
    if (!Number.isFinite(id) || id <= 0) return null
    return resolveDetails(id)
  },
}
