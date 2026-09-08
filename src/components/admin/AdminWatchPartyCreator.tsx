'use client'

import { useState, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Users, Search, Play, Loader2, X, Film, Tv, CheckCircle } from 'lucide-react'
import toast from 'react-hot-toast'
import { playSound } from '@/lib/sound'

interface SearchResult {
  id: number
  title?: string
  name?: string
  poster_path: string | null
  overview: string
  release_date?: string
  first_air_date?: string
  mediaType: 'movie' | 'tv'
}

export default function AdminWatchPartyCreator() {
  const router = useRouter()
  const [query, setQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [results, setResults] = useState<SearchResult[]>([])
  const [selected, setSelected] = useState<SearchResult | null>(null)
  const [maxUsers, setMaxUsers] = useState(50)
  const [seasonNumber, setSeasonNumber] = useState(1)
  const [episodeNumber, setEpisodeNumber] = useState(1)
  const [scheduledInMinutes, setScheduledInMinutes] = useState(0)
  const [creating, setCreating] = useState(false)
  const [mediaFilter, setMediaFilter] = useState<'movie' | 'tv'>('movie')

  const handleSearch = useCallback(async () => {
    if (!query.trim()) return
    setSearching(true)
    setResults([])
    try {
      const [movieRes, tvRes] = await Promise.all([
        fetch(`/api/tmdb/browse?q=${encodeURIComponent(query)}&mediaType=movie`),
        fetch(`/api/tmdb/browse?q=${encodeURIComponent(query)}&mediaType=tv`),
      ])
      const movieData = movieRes.ok ? await movieRes.json() : { results: [] }
      const tvData = tvRes.ok ? await tvRes.json() : { results: [] }

      const movies: SearchResult[] = (movieData.results || []).slice(0, 5).map((m: any) => ({
        ...m,
        mediaType: 'movie' as const,
      }))
      const shows: SearchResult[] = (tvData.results || []).slice(0, 5).map((t: any) => ({
        ...t,
        mediaType: 'tv' as const,
      }))
      setResults([...movies, ...shows])
    } catch {
      toast.error('Search failed')
    } finally {
      setSearching(false)
    }
  }, [query])

  const handleCreate = async () => {
    if (!selected) return
    playSound.click()
    setCreating(true)
    try {
      const res = await fetch('/api/watch-party', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId: selected.id,
          title: selected.title || selected.name,
          mediaType: selected.mediaType,
          seasonNumber: selected.mediaType === 'tv' ? seasonNumber : undefined,
          episodeNumber: selected.mediaType === 'tv' ? episodeNumber : undefined,
          maxUsers,
          scheduledInMinutes: scheduledInMinutes > 0 ? scheduledInMinutes : undefined,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed to create room')
      toast.success(`Watch Party created! Code: ${data.room.code}`)
      playSound.chime()
      router.push(`/watch-party/${data.room.code}`)
    } catch (err: any) {
      toast.error(err.message || 'Something went wrong')
    } finally {
      setCreating(false)
    }
  }

  const imageUrl = (path: string | null) =>
    path ? `https://image.tmdb.org/t/p/w92${path}` : null

  return (
    <section className="rounded-xl border border-purple-500/20 bg-zinc-950/60 p-6 space-y-6">
      <div className="flex items-center gap-2.5">
        <Users className="h-5 w-5 text-purple-400" />
        <h2 className="font-display text-xl tracking-wide text-white">Create Live Watch Party</h2>
        <span className="ml-auto rounded-full bg-purple-500/10 px-3 py-0.5 text-xs font-bold text-purple-300 border border-purple-500/20">
          ADMIN ONLY
        </span>
      </div>

      {/* Search */}
      <div className="space-y-3">
        <label className="text-xs font-semibold uppercase tracking-wider text-zinc-400">
          Search for a Movie or TV Show
        </label>
        <div className="flex gap-2">
          <div className="relative flex-1">
            <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-zinc-500" />
            <input
              type="text"
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
              placeholder="Search titles…"
              className="w-full rounded-xl border border-white/10 bg-zinc-900 py-2.5 pl-9 pr-3 text-sm text-white outline-none focus:border-purple-400 placeholder-zinc-500"
            />
          </div>
          <button
            type="button"
            onClick={handleSearch}
            disabled={searching || !query.trim()}
            className="inline-flex items-center gap-2 rounded-xl bg-purple-600 px-4 py-2.5 text-sm font-bold text-white hover:bg-purple-500 disabled:opacity-50"
          >
            {searching ? <Loader2 className="h-4 w-4 animate-spin" /> : <Search className="h-4 w-4" />}
            Search
          </button>
        </div>

        {/* Search Results */}
        {results.length > 0 && (
          <div className="max-h-72 space-y-2 overflow-y-auto rounded-xl border border-white/5 bg-zinc-900 p-2">
            {results.map((item) => {
              const isSelected = selected?.id === item.id && selected?.mediaType === item.mediaType
              const img = imageUrl(item.poster_path)
              return (
                <button
                  key={`${item.mediaType}-${item.id}`}
                  type="button"
                  onClick={() => { playSound.click(); setSelected(item) }}
                  className={`flex w-full items-center gap-3 rounded-xl p-2 text-left transition ${
                    isSelected ? 'bg-purple-500/20 border border-purple-500/40' : 'hover:bg-white/5 border border-transparent'
                  }`}
                >
                  {img ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={img} alt="" className="h-14 w-10 shrink-0 rounded-lg object-cover bg-zinc-800" />
                  ) : (
                    <div className="h-14 w-10 shrink-0 rounded-lg bg-zinc-800 flex items-center justify-center">
                      {item.mediaType === 'movie' ? <Film className="h-4 w-4 text-zinc-600" /> : <Tv className="h-4 w-4 text-zinc-600" />}
                    </div>
                  )}
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${item.mediaType === 'movie' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}`}>
                        {item.mediaType}
                      </span>
                      <p className="truncate text-sm font-semibold text-white">
                        {item.title || item.name}
                      </p>
                    </div>
                    <p className="mt-0.5 text-xs text-zinc-500 line-clamp-1">{item.overview}</p>
                  </div>
                  {isSelected && <CheckCircle className="h-5 w-5 shrink-0 text-purple-400" />}
                </button>
              )
            })}
          </div>
        )}
      </div>

      {/* Selected Item Configuration */}
      {selected && (
        <div className="space-y-4 rounded-xl border border-purple-500/30 bg-purple-500/5 p-4">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-xs text-zinc-400">Selected Title</p>
              <p className="font-semibold text-white">{selected.title || selected.name}</p>
              <span className={`rounded px-1.5 py-0.5 text-[10px] font-bold uppercase ${selected.mediaType === 'movie' ? 'bg-red-500/20 text-red-300' : 'bg-blue-500/20 text-blue-300'}`}>
                {selected.mediaType}
              </span>
            </div>
            <button
              type="button"
              onClick={() => setSelected(null)}
              className="rounded-full p-1 text-zinc-500 hover:bg-white/5 hover:text-white"
            >
              <X className="h-4 w-4" />
            </button>
          </div>

          <div className="grid gap-4 sm:grid-cols-3">
            {/* Max Users */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Max Viewers
              </label>
              <input
                type="number"
                min={2}
                max={500}
                value={maxUsers}
                onChange={(e) => setMaxUsers(parseInt(e.target.value) || 50)}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-purple-400"
              />
            </div>

            {/* Start Schedule */}
            <div>
              <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                Start Schedule
              </label>
              <select
                value={scheduledInMinutes}
                onChange={(e) => setScheduledInMinutes(parseInt(e.target.value))}
                className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-purple-400"
              >
                <option value={0}>Start Immediately</option>
                <option value={5}>Start in 5 Minutes</option>
                <option value={10}>Start in 10 Minutes</option>
                <option value={15}>Start in 15 Minutes</option>
                <option value={30}>Start in 30 Minutes</option>
              </select>
            </div>

            {/* Season (TV only) */}
            {selected.mediaType === 'tv' && (
              <>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Season
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={seasonNumber}
                    onChange={(e) => setSeasonNumber(parseInt(e.target.value) || 1)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-purple-400"
                  />
                </div>
                <div>
                  <label className="mb-1.5 block text-xs font-semibold uppercase tracking-wider text-zinc-400">
                    Episode
                  </label>
                  <input
                    type="number"
                    min={1}
                    value={episodeNumber}
                    onChange={(e) => setEpisodeNumber(parseInt(e.target.value) || 1)}
                    className="w-full rounded-xl border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-purple-400"
                  />
                </div>
              </>
            )}
          </div>

          <button
            type="button"
            onClick={handleCreate}
            disabled={creating}
            className="inline-flex w-full items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-purple-600 to-fuchsia-600 py-3 text-sm font-bold text-white shadow-lg hover:brightness-110 disabled:opacity-50 transition"
          >
            {creating ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Play className="h-4 w-4 fill-white" />
            )}
            {creating ? 'Launching Room…' : 'Launch Watch Party'}
          </button>
        </div>
      )}
    </section>
  )
}
