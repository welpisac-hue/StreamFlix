'use client'

import { useCallback, useEffect, useState } from 'react'
import { useRouter } from 'next/navigation'
import { useSession } from 'next-auth/react'
import { AnimatePresence, motion } from 'framer-motion'
import {
  Check,
  ChevronRight,
  Clapperboard,
  Film,
  Sparkles,
  Tv,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { WelcomeAvatar } from '@/lib/welcome-avatars'
import { AVATAR_CATEGORIES } from '@/lib/welcome-avatars'

type Step = 'hi' | 'features' | 'avatar' | 'enjoy'

const fade = {
  initial: { opacity: 0, y: 18 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -14 },
}

const FEATURES = [
  {
    icon: Film,
    title: 'Movies & series',
    body: 'Browse trending titles, deep catalogs, and pick up right where you left off.',
  },
  {
    icon: Tv,
    title: 'Anime mode',
    body: 'Flip into a full anime experience with language prefs built for binge nights.',
  },
  {
    icon: Sparkles,
    title: 'Made for friends',
    body: 'Invite-only access, watch later lists, reviews, and personalized picks.',
  },
]

export default function WelcomePage() {
  const router = useRouter()
  const { data: session, status, update } = useSession()
  const [step, setStep] = useState<Step>('hi')
  const [showName, setShowName] = useState(false)
  const [avatars, setAvatars] = useState<WelcomeAvatar[]>([])
  const [broken, setBroken] = useState<Record<string, boolean>>({})
  const [category, setCategory] =
    useState<(typeof AVATAR_CATEGORIES)[number]>('All')
  const [selected, setSelected] = useState<string | null>(null)
  const [saving, setSaving] = useState(false)
  const [ready, setReady] = useState(false)
  const [loadingAvatars, setLoadingAvatars] = useState(false)

  const displayName =
    session?.user?.username || session?.user?.name || 'friend'

  useEffect(() => {
    if (status !== 'authenticated') return

    let cancelled = false
    void (async () => {
      try {
        const res = await fetch('/api/welcome/complete')
        if (!res.ok) throw new Error('status failed')
        const data = await res.json()
        if (cancelled) return
        if (data.onboardingCompleted) {
          router.replace('/')
          return
        }
        setReady(true)
      } catch {
        if (!cancelled) setReady(true)
      }
    })()

    return () => {
      cancelled = true
    }
  }, [status, router])

  useEffect(() => {
    if (status === 'unauthenticated') {
      router.replace('/auth/signin')
    }
  }, [status, router])

  // Show username shortly after Hi — but never auto-advance steps
  useEffect(() => {
    if (step !== 'hi' || !ready) return
    const nameTimer = window.setTimeout(() => setShowName(true), 700)
    return () => window.clearTimeout(nameTimer)
  }, [step, ready])

  useEffect(() => {
    if (step !== 'avatar' || avatars.length > 0 || loadingAvatars) return
    setLoadingAvatars(true)
    void (async () => {
      try {
        const res = await fetch('/api/welcome/avatars')
        if (!res.ok) throw new Error('avatars failed')
        const data = await res.json()
        setAvatars(data.avatars || [])
      } catch {
        toast.error('Could not load profile pictures')
      } finally {
        setLoadingAvatars(false)
      }
    })()
  }, [step, avatars.length, loadingAvatars])

  const finish = useCallback(async () => {
    if (!selected || saving) return
    setSaving(true)
    try {
      const res = await fetch('/api/welcome/complete', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: selected }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Failed')

      await update({ image: data.image, onboardingCompleted: true })
      setStep('enjoy')
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Could not save avatar')
      setSaving(false)
    }
  }, [selected, saving, update])

  const filtered = (
    category === 'All' ? avatars : avatars.filter((a) => a.category === category)
  ).filter((a) => !broken[a.src])

  if (status === 'loading' || !ready) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-500">
        Preparing your welcome…
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <motion.div
        className="pointer-events-none absolute inset-0"
        initial={{ opacity: 0 }}
        animate={{ opacity: 1 }}
        transition={{ duration: 1.1, ease: [0.22, 1, 0.36, 1] }}
        style={{
          background:
            'radial-gradient(ellipse 90% 70% at 50% 0%, rgba(229,9,20,0.55), transparent 55%), radial-gradient(ellipse 70% 50% at 80% 80%, rgba(80,0,10,0.45), transparent 50%), linear-gradient(180deg, #1a0508 0%, #050506 55%, #000 100%)',
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen w-full max-w-5xl flex-col px-6 py-12 sm:px-10">
        <div className="mb-10 flex items-center gap-2 text-[var(--primary)]">
          <Clapperboard className="h-5 w-5" />
          <span className="font-display text-sm tracking-[0.2em]">
            STREAMFLIX
          </span>
        </div>

        <div className="flex flex-1 flex-col justify-center">
          <AnimatePresence mode="wait">
            {step === 'hi' && (
              <motion.div
                key="hi"
                variants={fade}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.55, ease: [0.22, 1, 0.36, 1] }}
                className="text-center"
              >
                <motion.p
                  className="font-display text-6xl tracking-tight sm:text-7xl md:text-8xl"
                  initial={{ opacity: 0, scale: 0.96 }}
                  animate={{ opacity: 1, scale: 1 }}
                  transition={{ duration: 0.7 }}
                >
                  Hi!
                </motion.p>
                <AnimatePresence>
                  {showName && (
                    <motion.p
                      key="name"
                      initial={{ opacity: 0, y: 16 }}
                      animate={{ opacity: 1, y: 0 }}
                      exit={{ opacity: 0 }}
                      transition={{ duration: 0.55 }}
                      className="mt-4 font-display text-3xl text-red-200 sm:text-4xl md:text-5xl"
                    >
                      {displayName}
                    </motion.p>
                  )}
                </AnimatePresence>
                <motion.button
                  type="button"
                  onClick={() => setStep('features')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-12 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3.5 text-sm font-semibold text-white"
                >
                  Continue
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              </motion.div>
            )}

            {step === 'features' && (
              <motion.div
                key="features"
                variants={fade}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="mx-auto w-full max-w-2xl"
              >
                <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-300/80">
                  Welcome aboard
                </p>
                <h1 className="mt-3 font-display text-4xl tracking-tight sm:text-5xl">
                  Here&apos;s what StreamFlix has for you
                </h1>
                <p className="mt-3 max-w-xl text-zinc-400">
                  A private streaming hangout — movies, TV, and anime — built for
                  friends, not the open web.
                </p>

                <div className="mt-10 space-y-4">
                  {FEATURES.map((feature, i) => (
                    <motion.div
                      key={feature.title}
                      initial={{ opacity: 0, x: -12 }}
                      animate={{ opacity: 1, x: 0 }}
                      transition={{ delay: 0.12 * i, duration: 0.45 }}
                      className="flex gap-4 rounded-2xl border border-white/10 bg-black/35 p-4 backdrop-blur-sm"
                    >
                      <div className="flex h-11 w-11 shrink-0 items-center justify-center rounded-xl bg-red-600/20 text-red-300">
                        <feature.icon className="h-5 w-5" />
                      </div>
                      <div>
                        <h2 className="font-semibold text-white">
                          {feature.title}
                        </h2>
                        <p className="mt-1 text-sm leading-relaxed text-zinc-400">
                          {feature.body}
                        </p>
                      </div>
                    </motion.div>
                  ))}
                </div>

                <motion.button
                  type="button"
                  onClick={() => setStep('avatar')}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-10 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-6 py-3.5 text-sm font-semibold text-white shadow-lg shadow-red-900/40 transition hover:bg-[var(--primary-dark)]"
                >
                  Next
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              </motion.div>
            )}

            {step === 'avatar' && (
              <motion.div
                key="avatar"
                variants={fade}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                className="w-full"
              >
                <div className="text-center">
                  <p className="text-sm font-semibold uppercase tracking-[0.25em] text-red-300/80">
                    Who&apos;s watching?
                  </p>
                  <h1 className="mt-3 font-display text-3xl tracking-tight sm:text-5xl">
                    Choose your profile picture
                  </h1>
                  <p className="mt-2 text-zinc-400">
                    Live-action faces, anime, and cartoon characters.
                  </p>
                </div>

                <div className="mt-8 flex flex-wrap justify-center gap-2">
                  {AVATAR_CATEGORIES.map((cat) => (
                    <button
                      key={cat}
                      type="button"
                      onClick={() => setCategory(cat)}
                      className={`rounded-full px-4 py-1.5 text-sm font-medium transition ${
                        category === cat
                          ? 'bg-white text-black'
                          : 'bg-white/10 text-zinc-300 hover:bg-white/15'
                      }`}
                    >
                      {cat}
                    </button>
                  ))}
                </div>

                {loadingAvatars ? (
                  <p className="mt-10 text-center text-sm text-zinc-500">
                    Loading character portraits…
                  </p>
                ) : (
                  <div className="mt-8 grid max-h-[48vh] grid-cols-3 gap-4 overflow-y-auto pb-4 scrollbar-hide sm:grid-cols-4 md:grid-cols-5 lg:grid-cols-6 sm:gap-5">
                    {filtered.map((avatar, i) => {
                      const isSelected = selected === avatar.src
                      return (
                        <motion.button
                          key={avatar.id}
                          type="button"
                          initial={{ opacity: 0, scale: 0.9 }}
                          animate={{ opacity: 1, scale: 1 }}
                          transition={{ delay: Math.min(i * 0.015, 0.25) }}
                          onClick={() => setSelected(avatar.src)}
                          className="group relative flex flex-col items-center gap-2"
                        >
                          <span
                            className={`relative aspect-square w-full overflow-hidden rounded-full ring-2 transition ${
                              isSelected
                                ? 'scale-[1.03] ring-white'
                                : 'ring-transparent group-hover:ring-white/40'
                            }`}
                          >
                            {/* eslint-disable-next-line @next/next/no-img-element */}
                            <img
                              src={avatar.src}
                              alt={avatar.label}
                              className="h-full w-full object-cover object-top"
                              loading="lazy"
                              onError={() =>
                                setBroken((prev) => ({
                                  ...prev,
                                  [avatar.src]: true,
                                }))
                              }
                            />
                            {isSelected && (
                              <span className="absolute inset-0 flex items-center justify-center bg-black/45">
                                <Check className="h-8 w-8 text-white" />
                              </span>
                            )}
                          </span>
                          <span className="line-clamp-1 text-[11px] text-zinc-500 group-hover:text-zinc-300">
                            {avatar.label}
                          </span>
                        </motion.button>
                      )
                    })}
                  </div>
                )}

                <div className="mt-6 flex justify-center">
                  <motion.button
                    type="button"
                    disabled={!selected || saving}
                    onClick={() => void finish()}
                    whileHover={selected ? { scale: 1.02 } : undefined}
                    whileTap={selected ? { scale: 0.98 } : undefined}
                    className="inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-7 py-3.5 text-sm font-semibold text-white transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-40"
                  >
                    {saving ? 'Saving…' : 'Continue'}
                    <ChevronRight className="h-4 w-4" />
                  </motion.button>
                </div>
              </motion.div>
            )}

            {step === 'enjoy' && (
              <motion.div
                key="enjoy"
                variants={fade}
                initial="initial"
                animate="animate"
                exit="exit"
                transition={{ duration: 0.65, ease: [0.22, 1, 0.36, 1] }}
                className="text-center"
              >
                {selected && (
                  <motion.div
                    initial={{ scale: 0.85, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.5 }}
                    className="mx-auto mb-8 h-28 w-28 overflow-hidden rounded-full ring-2 ring-white/80 shadow-2xl shadow-red-900/50 sm:h-32 sm:w-32"
                  >
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={selected}
                      alt="Your profile"
                      className="h-full w-full object-cover object-top"
                    />
                  </motion.div>
                )}
                <motion.p
                  className="font-display text-5xl tracking-tight sm:text-6xl md:text-7xl"
                  initial={{ opacity: 0, y: 10 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: 0.15, duration: 0.6 }}
                >
                  Enjoy.
                </motion.p>
                <motion.button
                  type="button"
                  onClick={() => {
                    router.replace('/')
                    router.refresh()
                  }}
                  whileHover={{ scale: 1.02 }}
                  whileTap={{ scale: 0.98 }}
                  className="mt-10 inline-flex items-center gap-2 rounded-xl bg-[var(--primary)] px-7 py-3.5 text-sm font-semibold text-white"
                >
                  Enter StreamFlix
                  <ChevronRight className="h-4 w-4" />
                </motion.button>
              </motion.div>
            )}
          </AnimatePresence>
        </div>
      </div>
    </div>
  )
}
