'use client'

import { useState, useEffect, useRef, useCallback } from 'react'
import { useRouter } from 'next/navigation'
import { Dices, Sparkles, X, Play, RefreshCw, Volume2, VolumeX } from 'lucide-react'
import { playSound, isSoundEnabled, setSoundEnabled } from '@/lib/sound'
import { getImageUrl } from '@/lib/tmdb/images'

const GENRES = [
  { id: 28, name: 'Action' },
  { id: 35, name: 'Comedy' },
  { id: 18, name: 'Drama' },
  { id: 878, name: 'Sci-Fi' },
  { id: 27, name: 'Horror' },
  { id: 53, name: 'Thriller' },
  { id: 16, name: 'Animation' },
  { id: 10749, name: 'Romance' },
  { id: 14, name: 'Fantasy' },
]

type ReelItem = {
  id: number
  title: string
  poster_path: string | null
  overview: string
  vote_average?: number
  mediaType: 'movie' | 'tv'
  genre_ids?: number[]
}

const CARD_WIDTH = 130 // px width per poster card slot

export default function SurpriseWheelModal() {
  const router = useRouter()
  const [open, setOpen] = useState(false)
  const [selectedGenre, setSelectedGenre] = useState<number | null>(null)
  const [mediaType, setMediaType] = useState<'movie' | 'tv'>('movie')
  const [baseItems, setBaseItems] = useState<ReelItem[]>([])
  const [reelItems, setReelItems] = useState<ReelItem[]>([])
  const [loadingItems, setLoadingItems] = useState(false)
  const [spinning, setSpinning] = useState(false)
  const [winner, setWinner] = useState<ReelItem | null>(null)
  const [soundActive, setSoundActive] = useState(true)
  const [seenIds, setSeenIds] = useState<Set<number>>(new Set())

  // Reel DOM & offset tracker
  const reelRef = useRef<HTMLDivElement>(null)
  const animRef = useRef<number | null>(null)
  const currentOffsetRef = useRef<number>(0)

  useEffect(() => {
    setSoundActive(isSoundEnabled())
  }, [])

  // Helper to center a card index
  const getCenterOffset = useCallback(() => {
    const containerWidth = reelRef.current?.parentElement?.clientWidth || 360
    return containerWidth / 2 - CARD_WIDTH / 2
  }, [])

  // Build the reel strip from the given item pool (unseen-filtered or full)
  const buildReel = useCallback((pool: ReelItem[]) => {
    if (pool.length === 0) return
    const duplicated: ReelItem[] = []
    for (let i = 0; i < 20; i++) {
      duplicated.push(...pool)
    }
    setReelItems(duplicated)

    const initialIndex = 5 * pool.length
    const containerWidth = reelRef.current?.parentElement?.clientWidth || 360
    const centerOffset = containerWidth / 2 - CARD_WIDTH / 2
    const initialOffset = -(initialIndex * CARD_WIDTH - centerOffset)
    currentOffsetRef.current = initialOffset
    if (reelRef.current) {
      reelRef.current.style.transition = 'none'
      reelRef.current.style.transform = `translate3d(${initialOffset}px, 0, 0)`
    }
  }, [])

  // Fetch items for active genre & mediaType
  const fetchGenreItems = useCallback(async (genreId: number | null, mType: 'movie' | 'tv') => {
    setLoadingItems(true)
    setWinner(null)
    try {
      const randomPage = Math.floor(Math.random() * 3) + 1
      const params = new URLSearchParams({
        mediaType: mType,
        page: String(randomPage),
      })
      if (genreId) params.set('genre', String(genreId))

      const res = await fetch(`/api/tmdb/browse?${params.toString()}`)
      const data = await res.json()
      let list: any[] = data.results || []

      // Strictly filter list by genre if selected
      if (genreId) {
        const filtered = list.filter(
          (m) => Array.isArray(m.genre_ids) && m.genre_ids.includes(genreId)
        )
        if (filtered.length >= 4) list = filtered
      }

      const valid: ReelItem[] = list
        .filter((m) => m.poster_path)
        .map((m) => ({
          id: m.id,
          title: m.title || m.name || 'Untitled',
          poster_path: m.poster_path,
          overview: m.overview || '',
          vote_average: m.vote_average,
          mediaType: mType,
          genre_ids: m.genre_ids,
        }))

      if (valid.length > 0) {
        setBaseItems(valid)
        setSeenIds(new Set()) // reset seen when genre/type changes
        buildReel(valid)
      }
    } catch (err) {
      console.error('Error fetching genre items:', err)
    } finally {
      setLoadingItems(false)
    }
  }, [getCenterOffset])

  // Fetch items when modal opens or genre/mediaType changes
  useEffect(() => {
    if (open) {
      void fetchGenreItems(selectedGenre, mediaType)
    }
  }, [open, selectedGenre, mediaType, fetchGenreItems])

  // ── Bulletproof Slot Physics & Dead-Center Alignment ───────────────────────
  const startSpin = () => {
    if (spinning || baseItems.length === 0) return
    playSound.click()
    setSpinning(true)
    setWinner(null)

    // Build pool of unseen items
    let pool = baseItems.filter((item) => !seenIds.has(item.id))
    if (pool.length === 0) {
      setSeenIds(new Set())
      pool = [...baseItems]
    }

    // Pick random winner from pool
    const winnerPoolIndex = Math.floor(Math.random() * pool.length)
    const winningItem = pool[winnerPoolIndex]

    // Create 20 loops of pool for reel strip
    const duplicated: ReelItem[] = []
    for (let i = 0; i < 20; i++) {
      duplicated.push(...pool)
    }
    setReelItems(duplicated)

    const centerOffset = getCenterOffset()

    // Start from loop 4 in duplicated reel strip
    const startLoop = 4
    const startCardIndex = startLoop * pool.length
    const startOffset = -(startCardIndex * CARD_WIDTH - centerOffset)

    // Spin 3 full loops and stop at winnerPoolIndex
    const spinLoops = 3
    const targetCardIndex = (startLoop + spinLoops) * pool.length + winnerPoolIndex
    const targetPixelOffset = -(targetCardIndex * CARD_WIDTH - centerOffset)

    currentOffsetRef.current = startOffset
    if (reelRef.current) {
      reelRef.current.style.transition = 'none'
      reelRef.current.style.transform = `translate3d(${startOffset}px, 0, 0)`
    }

    const startTime = performance.now()
    const spinDuration = 3400 // 3.4 seconds total spin

    let lastTickIndex = -1

    const animate = (now: number) => {
      const elapsed = now - startTime
      const progress = Math.min(1, elapsed / spinDuration)

      // Quintic ease-out deceleration curve
      const easeOut = 1 - Math.pow(1 - progress, 5)
      const currentPos = startOffset + (targetPixelOffset - startOffset) * easeOut

      if (reelRef.current) {
        reelRef.current.style.transform = `translate3d(${currentPos}px, 0, 0)`
      }

      // Audio tick sound as each poster passes center payline
      const currentPassedIndex = Math.floor((-currentPos + centerOffset) / CARD_WIDTH)
      if (currentPassedIndex !== lastTickIndex) {
        lastTickIndex = currentPassedIndex
        playSound.slotTick()
      }

      if (progress < 1) {
        animRef.current = requestAnimationFrame(animate)
      } else {
        // Spin complete - apply spring back alignment
        if (reelRef.current) {
          reelRef.current.style.transition = 'transform 0.3s cubic-bezier(0.175, 0.885, 0.32, 1.275)'
          reelRef.current.style.transform = `translate3d(${targetPixelOffset}px, 0, 0)`
        }

        setTimeout(() => {
          setSpinning(false)
          setWinner(winningItem)
          playSound.jackpot()

          // Mark this item as seen so it won't be picked again on next spin
          setSeenIds((prev) => new Set([...prev, winningItem.id]))
          currentOffsetRef.current = targetPixelOffset
        }, 300)
      }
    }

    animRef.current = requestAnimationFrame(animate)
  }

  const toggleSound = () => {
    const next = !soundActive
    setSoundActive(next)
    setSoundEnabled(next)
    if (next) playSound.click()
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          playSound.hover()
          setOpen(true)
        }}
        className="group inline-flex items-center gap-2 rounded-xl border border-purple-500/40 bg-purple-500/10 px-4 py-2 text-xs font-bold text-purple-200 transition hover:scale-105 hover:border-purple-400 hover:bg-purple-500/20"
      >
        <Dices className="h-4 w-4 text-purple-400 group-hover:rotate-180 transition-transform duration-500" />
        Surprise Me
      </button>

      {open && (
        <div className="fixed inset-0 z-[160] flex items-center justify-center bg-black/85 p-4 backdrop-blur-md">
          <div className="relative w-full max-w-xl overflow-hidden rounded-3xl border border-purple-500/30 bg-zinc-950 p-6 shadow-2xl">
            {/* Close Button */}
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 z-10 rounded-full bg-white/5 p-1.5 text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            {/* Modern Header */}
            <div className="mb-4 text-center">
              <div className="inline-flex items-center gap-2 rounded-full border border-purple-500/30 bg-purple-500/10 px-4 py-1 text-[11px] font-bold uppercase tracking-wider text-purple-300">
                <Sparkles className="h-3.5 w-3.5 text-purple-400" />
                Random Movie Picker
              </div>
              <h2 className="mt-2 font-display text-3xl font-bold tracking-wide text-white">
                SURPRISE ME
              </h2>
              <p className="text-xs text-zinc-400 mt-1">
                Can’t decide what to watch? Select a genre and spin to get a random pick!
              </p>
            </div>

            {/* Controls: Type + Sound Toggle */}
            <div className="mb-4 flex items-center justify-between gap-3">
              <div className="flex rounded-xl border border-white/10 bg-zinc-900 p-1">
                <button
                  type="button"
                  onClick={() => { playSound.click(); setMediaType('movie') }}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    mediaType === 'movie' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  Movies
                </button>
                <button
                  type="button"
                  onClick={() => { playSound.click(); setMediaType('tv') }}
                  className={`rounded-lg px-3 py-1 text-xs font-bold transition ${
                    mediaType === 'tv' ? 'bg-purple-600 text-white' : 'text-zinc-400 hover:text-white'
                  }`}
                >
                  TV Shows
                </button>
              </div>

              <button
                type="button"
                onClick={toggleSound}
                className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/5 px-2.5 py-1 text-xs text-zinc-400 hover:text-white"
                title="Toggle Sound Effects"
              >
                {soundActive ? <Volume2 className="h-4 w-4 text-purple-400" /> : <VolumeX className="h-4 w-4 text-zinc-500" />}
                <span className="hidden sm:inline">{soundActive ? 'Sound On' : 'Muted'}</span>
              </button>
            </div>

            {/* Genre Selector Pills */}
            <div className="mb-5 flex flex-wrap gap-1.5">
              <button
                type="button"
                onClick={() => { playSound.click(); setSelectedGenre(null) }}
                className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                  selectedGenre === null
                    ? 'bg-purple-600 text-white shadow-md'
                    : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                }`}
              >
                All Genres
              </button>
              {GENRES.map((g) => (
                <button
                  key={g.id}
                  type="button"
                  onClick={() => { playSound.click(); setSelectedGenre(g.id) }}
                  className={`rounded-full px-3 py-1 text-xs font-bold transition ${
                    selectedGenre === g.id
                      ? 'bg-purple-600 text-white shadow-md'
                      : 'bg-white/5 text-zinc-400 hover:bg-white/10 hover:text-white'
                  }`}
                >
                  {g.name}
                </button>
              ))}
            </div>

            {/* ── THE REEL VIEWPORT ────────────────────────────────────────── */}
            <div className="relative mb-6 overflow-hidden rounded-2xl border-2 border-purple-500/40 bg-black p-2 shadow-inner">
              {/* Payline Frame (Center Target Box) */}
              <div className="pointer-events-none absolute left-1/2 top-0 bottom-0 z-20 w-[130px] -translate-x-1/2 border-2 border-purple-400 bg-purple-500/10 shadow-[0_0_25px_rgba(168,85,247,0.5)] rounded-xl">
                <div className="absolute top-1 left-1/2 -translate-x-1/2 rounded bg-purple-500 px-2 py-0.5 font-mono text-[9px] font-bold text-white uppercase tracking-wider shadow">
                  TARGET
                </div>
              </div>

              {/* Side Vignette Gradient */}
              <div className="pointer-events-none absolute inset-y-0 left-0 z-10 w-16 bg-gradient-to-r from-black via-black/80 to-transparent" />
              <div className="pointer-events-none absolute inset-y-0 right-0 z-10 w-16 bg-gradient-to-l from-black via-black/80 to-transparent" />

              {/* Reel Strip Container */}
              <div className="h-44 w-full overflow-hidden">
                {loadingItems ? (
                  <div className="flex h-full items-center justify-center gap-2 text-purple-300">
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    <span className="text-xs font-bold">Loading Titles…</span>
                  </div>
                ) : (
                  <div
                    ref={reelRef}
                    className="flex items-center gap-0 h-full will-change-transform"
                    style={{
                      width: `${reelItems.length * CARD_WIDTH}px`,
                    }}
                  >
                    {reelItems.map((item, idx) => (
                      <div
                        key={`${item.id}-${idx}`}
                        className="flex shrink-0 flex-col items-center justify-center p-1"
                        style={{ width: `${CARD_WIDTH}px` }}
                      >
                        {/* Poster */}
                        {/* eslint-disable-next-line @next/next/no-img-element */}
                        <img
                          src={getImageUrl(item.poster_path, 'w185')}
                          alt={item.title}
                          className="h-36 w-24 rounded-lg object-cover bg-zinc-800 shadow-md border border-white/10"
                        />
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* ── WINNER RESULT OR SPIN BUTTON ──────────────────────────────────── */}
            {winner ? (
              <div className="overflow-hidden rounded-2xl border border-purple-500/40 bg-purple-950/30 p-4 shadow-xl animate-in fade-in zoom-in-95 duration-300">
                <div className="flex gap-4">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={getImageUrl(winner.poster_path, 'w185')}
                    alt={winner.title}
                    className="h-32 w-22 shrink-0 rounded-xl object-cover border-2 border-purple-400 shadow-lg"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2">
                      <span className="rounded bg-purple-500/20 px-2 py-0.5 font-mono text-[10px] font-bold uppercase text-purple-300">
                        RANDOM PICK
                      </span>
                      {winner.vote_average ? (
                        <span className="text-xs font-bold text-amber-300">
                          ★ {winner.vote_average.toFixed(1)}
                        </span>
                      ) : null}
                    </div>
                    <h3 className="mt-1 font-display text-xl font-bold text-white truncate">
                      {winner.title}
                    </h3>
                    <p className="mt-1 text-xs text-zinc-300 line-clamp-3 leading-relaxed">
                      {winner.overview || 'No overview available for this title.'}
                    </p>
                  </div>
                </div>

                <div className="mt-4 flex gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      playSound.click()
                      router.push(
                        winner.mediaType === 'movie'
                          ? `/watch/movie/${winner.id}`
                          : `/watch/tv/${winner.id}/1/1`
                      )
                      setOpen(false)
                    }}
                    className="flex-1 inline-flex items-center justify-center gap-2 rounded-xl bg-purple-600 py-3 text-sm font-bold text-white shadow-lg hover:bg-purple-500 transition"
                  >
                    <Play className="h-4 w-4 fill-white" />
                    WATCH NOW
                  </button>
                  <button
                    type="button"
                    onClick={startSpin}
                    className="inline-flex items-center gap-1.5 rounded-xl border border-white/10 bg-white/10 px-4 py-3 text-xs font-bold text-white hover:bg-white/20 transition"
                  >
                    <RefreshCw className="h-4 w-4" />
                    SPIN AGAIN
                  </button>
                </div>
              </div>
            ) : (
              <button
                type="button"
                disabled={spinning || loadingItems}
                onClick={startSpin}
                className="w-full py-4 rounded-2xl bg-gradient-to-r from-purple-600 via-fuchsia-600 to-purple-600 font-display text-xl tracking-wider text-white font-bold shadow-lg hover:brightness-110 active:scale-[0.99] disabled:opacity-50 transition flex items-center justify-center gap-3"
              >
                {spinning ? (
                  <>
                    <RefreshCw className="h-5 w-5 animate-spin" />
                    SPINNING REEL…
                  </>
                ) : (
                  <>
                    <Sparkles className="h-5 w-5" />
                    SPIN THE WHEEL
                  </>
                )}
              </button>
            )}
          </div>
        </div>
      )}
    </>
  )
}
