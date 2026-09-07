export type WelcomeAvatar = {
  id: string
  label: string
  category: 'Movies' | 'TV' | 'Anime' | 'Cartoons'
  src: string
}

export const AVATAR_CATEGORIES = [
  'All',
  'Movies',
  'TV',
  'Anime',
  'Cartoons',
] as const

const TMDB_PROFILE =
  /^https:\/\/image\.tmdb\.org\/t\/p\/(w45|w185|w342|h632|original)\/[a-zA-Z0-9_-]+\.(jpg|jpeg|png|webp)$/i
const ANILIST_CHAR =
  /^https:\/\/s4\.anilist\.co\/file\/anilistcdn\/character\/(large|medium)\/[a-zA-Z0-9._%-]+\.(jpg|jpeg|png|webp)$/i
const RICK_MORTY =
  /^https:\/\/rickandmortyapi\.com\/api\/character\/avatar\/\d+\.(jpeg|jpg|png|webp)$/i
const DISNEY_WIKIA =
  /^https:\/\/static\.wikia\.nocookie\.net\/disney\/images\/[a-zA-Z0-9/_%-]+\.(jpg|jpeg|png|webp)$/i

export function isAllowedAvatarSrc(src: string): boolean {
  try {
    const clean = src.trim().split('?')[0]?.split('#')[0] || ''
    return (
      TMDB_PROFILE.test(clean) ||
      ANILIST_CHAR.test(clean) ||
      RICK_MORTY.test(clean) ||
      DISNEY_WIKIA.test(clean)
    )
  } catch {
    return false
  }
}
