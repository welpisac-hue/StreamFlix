'use client'

import { useEffect, useState } from 'react'
import { Play, X } from 'lucide-react'

interface TrailerButtonProps {
  youtubeKey: string
  title: string
  className?: string
  label?: string
}

export default function TrailerButton({
  youtubeKey,
  title,
  className = '',
  label = 'Trailer',
}: TrailerButtonProps) {
  const [open, setOpen] = useState(false)

  useEffect(() => {
    if (!open) return
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false)
    }
    document.body.style.overflow = 'hidden'
    window.addEventListener('keydown', onKey)
    return () => {
      document.body.style.overflow = ''
      window.removeEventListener('keydown', onKey)
    }
  }, [open])

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={
          className ||
          'inline-flex items-center gap-2 rounded-lg border border-white/15 bg-white/10 px-6 py-3 text-sm font-semibold text-white transition hover:bg-white/15'
        }
      >
        <Play className="h-4 w-4" />
        {label}
      </button>

      {open && (
        <div
          className="fixed inset-0 z-[100] flex items-center justify-center bg-black/85 p-4 backdrop-blur-sm"
          onClick={() => setOpen(false)}
          role="dialog"
          aria-modal="true"
          aria-label={`${title} trailer`}
        >
          <div
            className="relative w-full max-w-5xl animate-fade-up"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="mb-3 flex items-center justify-between gap-4">
              <h2 className="truncate font-display text-2xl tracking-wide text-white">
                {title} — Trailer
              </h2>
              <button
                type="button"
                onClick={() => setOpen(false)}
                className="rounded-full border border-white/15 bg-white/10 p-2 text-white transition hover:bg-white/20"
                aria-label="Close trailer"
              >
                <X className="h-5 w-5" />
              </button>
            </div>
            <div className="overflow-hidden rounded-2xl border border-white/10 bg-black shadow-2xl">
              <div className="aspect-video w-full">
                <iframe
                  src={`https://www.youtube.com/embed/${youtubeKey}?autoplay=1&rel=0`}
                  className="h-full w-full"
                  allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                  allowFullScreen
                  title={`${title} trailer`}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </>
  )
}
