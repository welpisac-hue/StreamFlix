import type { AnimeTitle } from '@/lib/anilist/types'
import type { AnimeLang } from '@/lib/embeds'

export const ANIME_LANG_STORAGE_KEY = 'streamflix-anime-language'
export const ANIME_LANG_CHOSEN_KEY = 'streamflix-anime-language-chosen'
export const ANIME_ENTRANCE_KEY = 'streamflix-anime-entrance-seen'

export type AnimePreferredLanguage =
  | 'en'
  | 'ja'
  | 'es'
  | 'fr'
  | 'de'
  | 'pt'
  | 'ko'
  | 'zh'
  | 'it'

export const ANIME_LANGUAGE_OPTIONS: {
  code: AnimePreferredLanguage
  label: string
  nativeLabel: string
  description: string
}[] = [
  {
    code: 'en',
    label: 'English',
    nativeLabel: 'English',
    description: 'English titles first · prefer English dubs',
  },
  {
    code: 'ja',
    label: 'Japanese',
    nativeLabel: '日本語',
    description: 'Japanese titles · original audio (sub)',
  },
  {
    code: 'es',
    label: 'Spanish',
    nativeLabel: 'Español',
    description: 'Spanish-friendly catalog · dub when available',
  },
  {
    code: 'fr',
    label: 'French',
    nativeLabel: 'Français',
    description: 'French-friendly catalog · dub when available',
  },
  {
    code: 'de',
    label: 'German',
    nativeLabel: 'Deutsch',
    description: 'German-friendly catalog · dub when available',
  },
  {
    code: 'pt',
    label: 'Portuguese',
    nativeLabel: 'Português',
    description: 'Portuguese-friendly catalog · dub when available',
  },
  {
    code: 'ko',
    label: 'Korean',
    nativeLabel: '한국어',
    description: 'Korean titles when available · sub preferred',
  },
  {
    code: 'zh',
    label: 'Chinese',
    nativeLabel: '中文',
    description: 'Chinese titles when available · sub preferred',
  },
  {
    code: 'it',
    label: 'Italian',
    nativeLabel: 'Italiano',
    description: 'Italian-friendly catalog · dub when available',
  },
]

export const DEFAULT_ANIME_LANGUAGE: AnimePreferredLanguage = 'en'

export function isAnimePreferredLanguage(
  value: string | null | undefined
): value is AnimePreferredLanguage {
  return ANIME_LANGUAGE_OPTIONS.some((o) => o.code === value)
}

/** Prefer dubbed audio for languages that commonly have commercial dubs on tryembed. */
export function prefersDub(language: AnimePreferredLanguage): boolean {
  return language === 'en' || language === 'es' || language === 'fr' || language === 'de' || language === 'pt' || language === 'it'
}

export function defaultEmbedLang(
  language: AnimePreferredLanguage
): AnimeLang {
  return prefersDub(language) ? 'dub' : 'sub'
}

export function pickTitleForLanguage(
  titles: AnimeTitle | null | undefined,
  language: AnimePreferredLanguage,
  fallback = 'Untitled'
): string {
  if (!titles) return fallback

  switch (language) {
    case 'ja':
      return titles.native || titles.romaji || titles.english || fallback
    case 'en':
      return titles.english || titles.romaji || titles.native || fallback
    case 'ko':
    case 'zh':
      return titles.native || titles.english || titles.romaji || fallback
    default:
      // Romance / European: English localization is usually the closest public title;
      // fall back to romaji then native.
      return titles.english || titles.romaji || titles.native || fallback
  }
}

export function languageMatchScore(
  titles: AnimeTitle | null | undefined,
  language: AnimePreferredLanguage
): number {
  if (!titles) return 0
  switch (language) {
    case 'en':
      return titles.english ? 3 : titles.romaji ? 1 : 0
    case 'ja':
      return titles.native ? 3 : titles.romaji ? 2 : 0
    case 'ko':
    case 'zh':
      return titles.native ? 2 : titles.english ? 1 : 0
    default:
      return titles.english ? 2 : titles.romaji ? 1 : 0
  }
}

export function sortAnimeByLanguagePreference<
  T extends { titles: AnimeTitle; averageScore?: number | null },
>(items: T[], language: AnimePreferredLanguage): T[] {
  return [...items].sort((a, b) => {
    const scoreDiff =
      languageMatchScore(b.titles, language) -
      languageMatchScore(a.titles, language)
    if (scoreDiff !== 0) return scoreDiff
    return (b.averageScore ?? 0) - (a.averageScore ?? 0)
  })
}

export function getLanguageLabel(code: AnimePreferredLanguage): string {
  return (
    ANIME_LANGUAGE_OPTIONS.find((o) => o.code === code)?.label || 'English'
  )
}
