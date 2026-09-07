'use client'

import { motion, AnimatePresence } from 'framer-motion'
import { Check, Languages } from 'lucide-react'
import {
  ANIME_LANGUAGE_OPTIONS,
  DEFAULT_ANIME_LANGUAGE,
  type AnimePreferredLanguage,
} from '@/lib/anime-language'
import { useAnimeLanguage } from './AnimeLanguageContext'

export default function AnimeLanguagePrompt() {
  const { promptOpen, language, setLanguage, closePrompt, ready } =
    useAnimeLanguage()

  if (!ready) return null

  return (
    <AnimatePresence>
      {promptOpen && (
        <motion.div
          className="fixed inset-0 z-[80] flex items-center justify-center p-4"
          initial={{ opacity: 0 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
        >
          <button
            type="button"
            aria-label="Dismiss language prompt"
            className="absolute inset-0 bg-black/75 backdrop-blur-md"
            onClick={closePrompt}
          />

          <motion.div
            role="dialog"
            aria-modal="true"
            aria-labelledby="anime-lang-title"
            initial={{ opacity: 0, y: 28, scale: 0.96 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            exit={{ opacity: 0, y: 16, scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 280, damping: 24 }}
            className="relative w-full max-w-lg overflow-hidden rounded-2xl border border-fuchsia-400/25 bg-[#0b0614]/95 shadow-[0_0_80px_rgba(232,121,249,0.18)]"
          >
            <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_top,_rgba(232,121,249,0.22),_transparent_55%)]" />
            <div className="relative p-6 sm:p-8">
              <div className="mb-5 inline-flex items-center gap-2 rounded-full border border-fuchsia-300/20 bg-fuchsia-500/10 px-3 py-1 text-xs font-semibold uppercase tracking-[0.18em] text-fuchsia-200">
                <Languages className="h-3.5 w-3.5" />
                Anime Mode
              </div>

              <h2
                id="anime-lang-title"
                className="font-[family-name:var(--font-anime-display)] text-3xl tracking-wide text-white sm:text-4xl"
              >
                Choose your language
              </h2>
              <p className="mt-2 text-sm leading-relaxed text-zinc-300">
                We&apos;ll prioritize titles in your language and default the
                player to dubs when they fit. Default is English — change anytime
                from the nav.
              </p>

              <div className="mt-6 grid max-h-[42vh] gap-2 overflow-y-auto pr-1 sm:grid-cols-2">
                {ANIME_LANGUAGE_OPTIONS.map((opt) => {
                  const selected = language === opt.code
                  return (
                    <button
                      key={opt.code}
                      type="button"
                      onClick={() =>
                        setLanguage(opt.code as AnimePreferredLanguage, false)
                      }
                      className={`rounded-xl border px-3.5 py-3 text-left transition ${
                        selected
                          ? 'border-fuchsia-400/60 bg-fuchsia-500/15 shadow-[0_0_24px_rgba(232,121,249,0.2)]'
                          : 'border-white/10 bg-white/[0.03] hover:border-white/20 hover:bg-white/[0.06]'
                      }`}
                    >
                      <div className="flex items-start justify-between gap-2">
                        <div>
                          <p className="text-sm font-semibold text-white">
                            {opt.label}
                          </p>
                          <p className="text-xs text-fuchsia-200/80">
                            {opt.nativeLabel}
                          </p>
                        </div>
                        {selected && (
                          <Check className="h-4 w-4 shrink-0 text-fuchsia-300" />
                        )}
                      </div>
                      <p className="mt-1.5 text-[11px] leading-snug text-zinc-400">
                        {opt.description}
                      </p>
                    </button>
                  )
                })}
              </div>

              <div className="mt-6 flex flex-wrap items-center justify-between gap-3">
                <button
                  type="button"
                  onClick={() => setLanguage(DEFAULT_ANIME_LANGUAGE, true)}
                  className="text-sm text-zinc-400 underline-offset-2 hover:text-white hover:underline"
                >
                  Keep English (default)
                </button>
                <button
                  type="button"
                  onClick={() => setLanguage(language, true)}
                  className="rounded-lg bg-gradient-to-r from-fuchsia-500 to-cyan-400 px-5 py-2.5 text-sm font-bold text-black shadow-[0_0_30px_rgba(34,211,238,0.25)] transition hover:brightness-110"
                >
                  Continue
                </button>
              </div>
            </div>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
