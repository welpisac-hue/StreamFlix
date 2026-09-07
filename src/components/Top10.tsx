'use client'

import Link from 'next/link'
import { getImageUrl } from '@/lib/tmdb/images'

type Top10Item = {
  id: number
  title?: string
  name?: string
  poster_path?: string | null
  coverImage?: string | null
  mediaType?: 'movie' | 'tv' | 'anime'
}

interface Top10Props {
  movies: Top10Item[]
  title?: string
}

function posterFor(item: Top10Item): string {
  if (item.coverImage) return item.coverImage
  return getImageUrl(item.poster_path, 'w500')
}

export default function Top10({ movies, title = 'Top 10 Today' }: Top10Props) {
  const top10 = movies.slice(0, 10)

  return (
    <section className="mb-10">
      <h2 className="mb-4 font-display text-2xl tracking-wide text-white md:text-3xl">
        {title}
      </h2>
      <div className="flex gap-3 overflow-x-auto pb-2 scrollbar-hide md:gap-4">
        {top10.map((item, index) => {
          const label = item.title || item.name || 'Untitled'
          const mediaType = item.mediaType || 'movie'
          const href =
            mediaType === 'anime' ? `/anime/${item.id}` : `/${mediaType}/${item.id}`

          return (
            <Link
              key={`${mediaType}-${item.id}`}
              href={href}
              className="group relative w-[46vw] max-w-[210px] shrink-0 sm:w-[170px] md:w-[190px]"
            >
              <div className="relative pl-8 md:pl-10">
                <span className="pointer-events-none absolute left-0 top-1/2 z-0 -translate-y-1/2 font-display text-7xl leading-none text-white/10 transition group-hover:text-[var(--primary)]/35 md:text-8xl">
                  {index + 1}
                </span>
                <div className="relative z-10 aspect-[2/3] overflow-hidden rounded-xl bg-zinc-900 ring-1 ring-white/5 transition group-hover:ring-[var(--primary)]/40">
                  <img
                    src={posterFor(item)}
                    alt={label}
                    loading="lazy"
                    referrerPolicy="no-referrer"
                    className="h-full w-full object-cover transition duration-500 group-hover:scale-105"
                  />
                </div>
              </div>
              <h3 className="mt-2 truncate pl-8 text-sm font-semibold text-zinc-100 md:pl-10">
                {label}
              </h3>
            </Link>
          )
        })}
      </div>
    </section>
  )
}
