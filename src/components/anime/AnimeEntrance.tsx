'use client'

import { useEffect, useRef, useState } from 'react'
import { motion, AnimatePresence } from 'framer-motion'
import { ANIME_ENTRANCE_KEY } from '@/lib/anime-language'
import { useAnimeLanguage } from './AnimeLanguageContext'

const SHOW_MS = 1100
const FAILSAFE_MS = 1800

export default function AnimeEntrance() {
  const { ready, promptOpen, hasChosen } = useAnimeLanguage()
  const [show, setShow] = useState(false)
  const started = useRef(false)
  const sawLanguagePrompt = useRef(false)

  useEffect(() => {
    if (promptOpen) sawLanguagePrompt.current = true
  }, [promptOpen])

  useEffect(() => {
    if (!ready || started.current || promptOpen) return
    // First-time language choosers already sat through a modal — skip splash
    if (sawLanguagePrompt.current || !hasChosen) return

    try {
      if (sessionStorage.getItem(ANIME_ENTRANCE_KEY)) return
    } catch {
      // continue without persistence
    }

    started.current = true
    setShow(true)

    const markSeenAndHide = () => {
      setShow(false)
      try {
        sessionStorage.setItem(ANIME_ENTRANCE_KEY, '1')
      } catch {
        // ignore
      }
    }

    const hideTimer = window.setTimeout(markSeenAndHide, SHOW_MS)
    const failsafe = window.setTimeout(() => setShow(false), FAILSAFE_MS)

    return () => {
      window.clearTimeout(hideTimer)
      window.clearTimeout(failsafe)
    }
  }, [ready, promptOpen, hasChosen])

  useEffect(() => {
    if (!show) return
    const failsafe = window.setTimeout(() => setShow(false), FAILSAFE_MS)
    return () => window.clearTimeout(failsafe)
  }, [show])

  return (
    <AnimatePresence>
      {show && (
        <motion.div
          role="presentation"
          className="fixed inset-0 z-[70] flex cursor-pointer items-center justify-center overflow-hidden"
          initial={{ opacity: 1 }}
          animate={{ opacity: 1 }}
          exit={{ opacity: 0 }}
          transition={{ duration: 0.35, ease: 'easeOut' }}
          onClick={() => {
            setShow(false)
            try {
              sessionStorage.setItem(ANIME_ENTRANCE_KEY, '1')
            } catch {
              // ignore
            }
          }}
        >
          <div className="absolute inset-0 bg-[#05020a]/92" />
          <div className="anime-petal-field absolute inset-0" />
          <motion.div
            initial={{ opacity: 0, scale: 0.92, y: 12 }}
            animate={{ opacity: 1, scale: 1, y: 0 }}
            exit={{ opacity: 0, scale: 1.04, y: -8 }}
            transition={{ duration: 0.45, ease: [0.22, 1, 0.36, 1] }}
            className="relative text-center"
          >
            <p className="mb-3 text-xs font-semibold uppercase tracking-[0.35em] text-cyan-300/90">
              Entering
            </p>
            <h1 className="bg-gradient-to-r from-fuchsia-300 via-white to-cyan-300 bg-clip-text font-[family-name:var(--font-anime-display)] text-6xl tracking-wide text-transparent sm:text-7xl">
              ANIME
            </h1>
            <motion.div
              className="mx-auto mt-5 h-px w-40 bg-gradient-to-r from-transparent via-fuchsia-400 to-transparent"
              initial={{ scaleX: 0 }}
              animate={{ scaleX: 1 }}
              transition={{ delay: 0.15, duration: 0.45 }}
            />
            <p className="mt-4 text-[11px] uppercase tracking-[0.2em] text-zinc-500">
              Tap to skip
            </p>
          </motion.div>
        </motion.div>
      )}
    </AnimatePresence>
  )
}
