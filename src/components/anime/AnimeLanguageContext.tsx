'use client'

import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from 'react'
import {
  ANIME_LANG_CHOSEN_KEY,
  ANIME_LANG_STORAGE_KEY,
  DEFAULT_ANIME_LANGUAGE,
  isAnimePreferredLanguage,
  type AnimePreferredLanguage,
} from '@/lib/anime-language'

type AnimeLanguageContextValue = {
  language: AnimePreferredLanguage
  hasChosen: boolean
  ready: boolean
  setLanguage: (lang: AnimePreferredLanguage, markChosen?: boolean) => void
  openPrompt: () => void
  promptOpen: boolean
  closePrompt: () => void
}

const AnimeLanguageContext = createContext<AnimeLanguageContextValue | null>(
  null
)

export function AnimeLanguageProvider({ children }: { children: ReactNode }) {
  const [language, setLanguageState] = useState<AnimePreferredLanguage>(
    DEFAULT_ANIME_LANGUAGE
  )
  const [hasChosen, setHasChosen] = useState(false)
  const [ready, setReady] = useState(false)
  const [promptOpen, setPromptOpen] = useState(false)

  useEffect(() => {
    try {
      const stored = localStorage.getItem(ANIME_LANG_STORAGE_KEY)
      const chosen = localStorage.getItem(ANIME_LANG_CHOSEN_KEY) === '1'
      if (isAnimePreferredLanguage(stored)) {
        setLanguageState(stored)
      }
      setHasChosen(chosen)
      if (!chosen) setPromptOpen(true)
    } catch {
      setPromptOpen(true)
    } finally {
      setReady(true)
    }
  }, [])

  const setLanguage = useCallback(
    (lang: AnimePreferredLanguage, markChosen = true) => {
      setLanguageState(lang)
      try {
        localStorage.setItem(ANIME_LANG_STORAGE_KEY, lang)
        if (markChosen) {
          localStorage.setItem(ANIME_LANG_CHOSEN_KEY, '1')
          setHasChosen(true)
        }
      } catch {
        if (markChosen) setHasChosen(true)
      }
      if (markChosen) setPromptOpen(false)
    },
    []
  )

  const value = useMemo(
    () => ({
      language,
      hasChosen,
      ready,
      setLanguage,
      openPrompt: () => setPromptOpen(true),
      promptOpen,
      closePrompt: () => {
        if (!hasChosen) {
          setLanguage(DEFAULT_ANIME_LANGUAGE, true)
        } else {
          setPromptOpen(false)
        }
      },
    }),
    [language, hasChosen, ready, setLanguage, promptOpen]
  )

  return (
    <AnimeLanguageContext.Provider value={value}>
      {children}
    </AnimeLanguageContext.Provider>
  )
}

export function useAnimeLanguage() {
  const ctx = useContext(AnimeLanguageContext)
  if (!ctx) {
    throw new Error('useAnimeLanguage must be used within AnimeLanguageProvider')
  }
  return ctx
}

export function useAnimeLanguageOptional() {
  return useContext(AnimeLanguageContext)
}
