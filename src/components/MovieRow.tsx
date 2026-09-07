'use client'

import { useRef, useState } from 'react'
import { ChevronLeft, ChevronRight } from 'lucide-react'

interface MovieRowProps {
  title: string
  children: React.ReactNode
}

export default function MovieRow({ title, children }: MovieRowProps) {
  const scrollRef = useRef<HTMLDivElement>(null)
  const [canScrollLeft, setCanScrollLeft] = useState(false)
  const [canScrollRight, setCanScrollRight] = useState(true)

  const updateArrows = () => {
    const el = scrollRef.current
    if (!el) return
    setCanScrollLeft(el.scrollLeft > 8)
    setCanScrollRight(el.scrollLeft + el.clientWidth < el.scrollWidth - 8)
  }

  const scroll = (direction: 'left' | 'right') => {
    const el = scrollRef.current
    if (!el) return
    const amount = Math.min(el.clientWidth * 0.85, 720)
    el.scrollBy({
      left: direction === 'left' ? -amount : amount,
      behavior: 'smooth',
    })
    window.setTimeout(updateArrows, 320)
  }

  return (
    <section className="relative mb-10">
      <div className="mb-4 flex items-end justify-between gap-4">
        <h2 className="font-display text-2xl tracking-wide text-white md:text-3xl">
          {title}
        </h2>
        <div className="hidden items-center gap-2 sm:flex">
          <button
            type="button"
            onClick={() => scroll('left')}
            disabled={!canScrollLeft}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-default disabled:opacity-30"
            aria-label="Scroll left"
          >
            <ChevronLeft className="h-5 w-5" />
          </button>
          <button
            type="button"
            onClick={() => scroll('right')}
            disabled={!canScrollRight}
            className="flex h-9 w-9 items-center justify-center rounded-full border border-white/10 bg-white/5 text-white transition hover:bg-white/10 disabled:cursor-default disabled:opacity-30"
            aria-label="Scroll right"
          >
            <ChevronRight className="h-5 w-5" />
          </button>
        </div>
      </div>

      <div
        ref={scrollRef}
        onScroll={updateArrows}
        className="flex gap-3 overflow-x-auto scroll-smooth pb-2 scrollbar-hide md:gap-4"
      >
        {Array.isArray(children)
          ? children.map((child, i) => (
              <div
                key={i}
                className="w-[42vw] max-w-[200px] shrink-0 sm:w-[160px] md:w-[180px] lg:w-[200px]"
              >
                {child}
              </div>
            ))
          : children}
      </div>
    </section>
  )
}
