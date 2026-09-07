'use client'

import { useEffect, useRef, useState } from 'react'
import Link from 'next/link'
import { useRouter } from 'next/navigation'
import { Film, Lock, Search, Sparkles, Tv } from 'lucide-react'
import { getImageUrl } from '@/lib/tmdb/images'
import { useSiteExperience } from '@/components/SiteExperience'

type Suggestion = {
  id: number
  title: string
  mediaType: 'movie' | 'tv' | 'anime'
  posterPath: string | null
  year?: string | number | null
}

type Props = {
  animeMode: boolean
  className?: string
  inputClassName?: string
  mobile?: boolean
}

function posterUrl(path: string | null) {
  if (!path) return '/placeholder.svg'
  if (path.startsWith('http')) return path
  return getImageUrl(path, 'w92')
}

export default function LiveSearch({
  animeMode,
  className = '',
  inputClassName = '',
  mobile = false,
}: Props) {
  const router = useRouter()
  const { isHrefLocked } = useSiteExperience()
  const searchLock = isHrefLocked(animeMode ? '/anime/browse' : '/search')
  const [query, setQuery] = useState('')
  const [suggestions, setSuggestions] = useState<Suggestion[]>([])
  const [open, setOpen] = useState(false)
  const [loading, setLoading] = useState(false)
  const wrapRef = useRef<HTMLDivElement>(null)
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null)

  useEffect(() => {
    const onClick = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setOpen(false)
    }
    document.addEventListener('mousedown', onClick)
    return () => document.removeEventListener('mousedown', onClick)
  }, [])

  useEffect(() => {
    if (searchLock.locked) return
    if (debounceRef.current) clearTimeout(debounceRef.current)
    const q = query.trim()
    if (q.length < 2) {
      setSuggestions([])
      setLoading(false)
      return
    }

    setLoading(true)
    debounceRef.current = setTimeout(async () => {
      try {
        if (animeMode) {
          const res = await fetch(
            `/api/anime?type=search&q=${encodeURIComponent(q)}&page=1`
          )
          if (!res.ok) throw new Error('search failed')
          const data = await res.json()
          const items = Array.isArray(data) ? data : data.items || []
          setSuggestions(
            items.slice(0, 8).map((a: any) => ({
              id: a.id,
              title: a.title,
              mediaType: 'anime' as const,
              posterPath: a.coverImage,
              year: a.seasonYear,
            }))
          )
        } else {
          const res = await fetch(
            `/api/tmdb/search?q=${encodeURIComponent(q)}&type=all`
          )
          if (!res.ok) throw new Error('search failed')
          const data = await res.json()
          const movies = (data.movies || []).map((m: any) => ({
            id: m.id,
            title: m.title,
            mediaType: 'movie' as const,
            posterPath: m.poster_path,
            year: m.release_date?.split?.('-')?.[0],
          }))
          const shows = (data.tvShows || []).map((t: any) => ({
            id: t.id,
            title: t.name,
            mediaType: 'tv' as const,
            posterPath: t.poster_path,
            year: t.first_air_date?.split?.('-')?.[0],
          }))
          setSuggestions([...movies, ...shows].slice(0, 8))
        }
        setOpen(true)
      } catch {
        setSuggestions([])
      } finally {
        setLoading(false)
      }
    }, 220)

    return () => {
      if (debounceRef.current) clearTimeout(debounceRef.current)
    }
  }, [query, animeMode, searchLock.locked])

  if (searchLock.locked) {
    return (
      <div className={`relative ${className}`} title={searchLock.message}>
        <div
          className={`${inputClassName} flex cursor-not-allowed items-center gap-2 text-zinc-600 opacity-60`}
        >
          <Lock className="h-4 w-4 shrink-0" />
          <span className="truncate text-sm">Search locked</span>
        </div>
      </div>
    )
  }

  const submit = (e: React.FormEvent) => {
    e.preventDefault()
    const q = query.trim()
    if (!q) return
    setOpen(false)
    if (animeMode) {
      router.push(`/anime/browse?q=${encodeURIComponent(q)}`)
    } else {
      router.push(`/search?q=${encodeURIComponent(q)}`)
    }
  }

  const hrefFor = (item: Suggestion) => {
    if (item.mediaType === 'anime') return `/anime/${item.id}`
    return `/${item.mediaType}/${item.id}`
  }

  return (
    <div ref={wrapRef} className={`relative ${className}`}>
      <form onSubmit={submit} className="relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
        <input
          type="search"
          placeholder={animeMode ? 'Search anime...' : 'Search titles...'}
          value={query}
          onChange={(e) => {
            setQuery(e.target.value)
            setOpen(true)
          }}
          onFocus={() => query.trim().length >= 2 && setOpen(true)}
          className={inputClassName}
          autoComplete="off"
        />
      </form>

      {open && query.trim().length >= 2 && (
        <div
          className={`absolute z-[60] mt-2 overflow-hidden rounded-xl border shadow-2xl ${
            animeMode
              ? 'border-fuchsia-400/25 bg-[#0b0614]/98'
              : 'border-white/10 bg-zinc-950/98'
          } ${mobile ? 'left-0 right-0' : 'right-0 w-[22rem]'}`}
        >
          {loading && suggestions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-400">Searching…</p>
          ) : suggestions.length === 0 ? (
            <p className="px-4 py-3 text-sm text-zinc-400">No matches yet</p>
          ) : (
            <ul className="max-h-80 overflow-y-auto py-1">
              {suggestions.map((item) => {
                const Icon =
                  item.mediaType === 'anime'
                    ? Sparkles
                    : item.mediaType === 'tv'
                      ? Tv
                      : Film
                return (
                  <li key={`${item.mediaType}-${item.id}`}>
                    <Link
                      href={hrefFor(item)}
                      onClick={() => {
                        setOpen(false)
                        setQuery('')
                      }}
                      className="flex items-center gap-3 px-3 py-2.5 transition hover:bg-white/5"
                    >
                      <img
                        src={posterUrl(item.posterPath)}
                        alt=""
                        referrerPolicy="no-referrer"
                        className="h-12 w-8 rounded object-cover"
                      />
                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium text-white">
                          {item.title}
                        </p>
                        <p className="flex items-center gap-1 text-xs text-zinc-500">
                          <Icon className="h-3 w-3" />
                          {item.mediaType}
                          {item.year ? ` · ${item.year}` : ''}
                        </p>
                      </div>
                    </Link>
                  </li>
                )
              })}
            </ul>
          )}
          <button
            type="button"
            onClick={() => {
              const q = query.trim()
              if (!q) return
              setOpen(false)
              if (animeMode) {
                router.push(`/anime/browse?q=${encodeURIComponent(q)}`)
              } else {
                router.push(`/search?q=${encodeURIComponent(q)}`)
              }
            }}
            className="w-full border-t border-white/10 px-4 py-2.5 text-left text-sm text-zinc-300 hover:bg-white/5"
          >
            See all results for &ldquo;{query.trim()}&rdquo;
          </button>
        </div>
      )}
    </div>
  )
}
