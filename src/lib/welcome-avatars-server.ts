import 'server-only'
import { isAllowedAvatarSrc, type WelcomeAvatar } from '@/lib/welcome-avatars'

function tmdbProfile(path: string) {
  const clean = path.startsWith('/') ? path : `/${path}`
  return `https://image.tmdb.org/t/p/w185${clean}`
}

/**
 * Profile faces: live-action people (TMDB) + anime (AniList) + cartoons (Rick & Morty, Disney).
 */
export async function buildWelcomeAvatars(): Promise<WelcomeAvatar[]> {
  const results: WelcomeAvatar[] = []
  const seen = new Set<string>()

  const push = (avatar: WelcomeAvatar) => {
    const src = avatar.src.trim().split('?')[0]?.split('#')[0] || ''
    if (!src || seen.has(src)) return
    if (!isAllowedAvatarSrc(src)) return
    seen.add(src)
    results.push({ ...avatar, src })
  }

  await Promise.all([
    loadTmdbPeople(push),
    loadAniListCharacters(push),
    loadRickAndMorty(push),
    loadDisneyCharacters(push),
  ])

  // Spread TMDB people across Movies / TV filters for UX
  return results.map((a, i) =>
    a.category === 'Movies' && i % 3 === 0
      ? { ...a, category: 'TV' as const }
      : a
  )
}

async function loadTmdbPeople(
  push: (avatar: WelcomeAvatar) => void
): Promise<void> {
  try {
    const { tmdb } = await import('@/lib/tmdb')
    const pages = await Promise.all([
      tmdb.getPopularPeople(1),
      tmdb.getPopularPeople(2),
      tmdb.getPopularPeople(3),
    ])
    for (const person of pages.flat()) {
      if (!person.profile_path) continue
      push({
        id: `tmdb-${person.id}`,
        label: person.name,
        category: 'Movies',
        src: tmdbProfile(person.profile_path),
      })
    }
  } catch (error) {
    console.error('Avatar TMDB fetch failed:', error)
  }
}

async function loadAniListCharacters(
  push: (avatar: WelcomeAvatar) => void
): Promise<void> {
  try {
    const pages = await Promise.all(
      [1, 2, 3].map(async (page) => {
        const query = `
          query ($page: Int) {
            Page(page: $page, perPage: 50) {
              characters(sort: FAVOURITES_DESC) {
                id
                name { full }
                image { large }
              }
            }
          }
        `
        const res = await fetch('https://graphql.anilist.co', {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Accept: 'application/json',
          },
          body: JSON.stringify({ query, variables: { page } }),
          next: { revalidate: 3600 },
        })
        if (!res.ok) return []
        const json = await res.json()
        return (json?.data?.Page?.characters || []) as Array<{
          id: number
          name?: { full?: string }
          image?: { large?: string }
        }>
      })
    )

    for (const c of pages.flat()) {
      const src = c?.image?.large
      if (!src) continue
      push({
        id: `al-${c.id}`,
        label: c.name?.full || 'Anime character',
        category: 'Anime',
        src,
      })
    }
  } catch (error) {
    console.error('Avatar AniList fetch failed:', error)
  }
}

async function loadRickAndMorty(
  push: (avatar: WelcomeAvatar) => void
): Promise<void> {
  try {
    const pages = await Promise.all(
      [1, 2, 3, 4].map(async (page) => {
        const res = await fetch(
          `https://rickandmortyapi.com/api/character?page=${page}`,
          { next: { revalidate: 3600 } }
        )
        if (!res.ok) return []
        const json = await res.json()
        return (json?.results || []) as Array<{
          id: number
          name: string
          image: string
        }>
      })
    )

    for (const c of pages.flat()) {
      if (!c?.image) continue
      push({
        id: `rm-${c.id}`,
        label: c.name,
        category: 'Cartoons',
        src: c.image,
      })
    }
  } catch (error) {
    console.error('Avatar Rick and Morty fetch failed:', error)
  }
}

async function loadDisneyCharacters(
  push: (avatar: WelcomeAvatar) => void
): Promise<void> {
  try {
    const pages = await Promise.all(
      [1, 2, 3, 4, 5].map(async (page) => {
        const res = await fetch(
          `https://api.disneyapi.dev/character?page=${page}&pageSize=50`,
          { next: { revalidate: 3600 } }
        )
        if (!res.ok) return []
        const json = await res.json()
        return (json?.data || []) as Array<{
          _id: number | string
          name: string
          imageUrl?: string
        }>
      })
    )

    for (const c of pages.flat()) {
      const src = c?.imageUrl
      if (!src || !c.name) continue
      // Prefer portrait-style art; skip empty / tiny labels
      if (c.name.length < 2) continue
      push({
        id: `disney-${c._id}`,
        label: c.name,
        category: 'Cartoons',
        src,
      })
    }
  } catch (error) {
    console.error('Avatar Disney fetch failed:', error)
  }
}
