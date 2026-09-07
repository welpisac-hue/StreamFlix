'use client'

import Link from 'next/link'
import { ChevronLeft, ChevronRight } from 'lucide-react'

type Props = {
  page: number
  totalPages: number
  totalResults?: number
  basePath: string
  query?: Record<string, string | undefined>
  accent?: 'default' | 'anime'
}

function buildHref(
  basePath: string,
  page: number,
  query?: Record<string, string | undefined>
) {
  const params = new URLSearchParams()
  if (query) {
    Object.entries(query).forEach(([key, value]) => {
      if (value && key !== 'page') params.set(key, value)
    })
  }
  if (page > 1) params.set('page', String(page))
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

export default function PaginationBar({
  page,
  totalPages,
  totalResults,
  basePath,
  query,
  accent = 'default',
}: Props) {
  const safeTotal = Math.max(1, Math.min(totalPages || 1, 500))
  const current = Math.min(Math.max(1, page), safeTotal)
  const prev = current > 1 ? current - 1 : null
  const next = current < safeTotal ? current + 1 : null

  const windowStart = Math.max(1, current - 2)
  const windowEnd = Math.min(safeTotal, current + 2)
  const pages: number[] = []
  for (let p = windowStart; p <= windowEnd; p++) pages.push(p)

  const btn =
    accent === 'anime'
      ? {
          active:
            'border-fuchsia-400/50 bg-fuchsia-500/20 text-white',
          idle: 'border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08]',
        }
      : {
          active: 'border-[var(--primary)] bg-[var(--primary)]/20 text-white',
          idle: 'border-white/10 bg-white/[0.03] text-zinc-300 hover:bg-white/[0.08]',
        }

  return (
    <div className="mt-10 flex flex-col items-center gap-4">
      <p className="text-sm text-zinc-400">
        Page <span className="text-white">{current}</span> of{' '}
        <span className="text-white">{safeTotal.toLocaleString()}</span>
        {typeof totalResults === 'number' && totalResults > 0 && (
          <>
            {' '}
            ·{' '}
            <span className="text-white">{totalResults.toLocaleString()}</span>{' '}
            titles
          </>
        )}
      </p>

      <div className="flex flex-wrap items-center justify-center gap-2">
        {prev ? (
          <Link
            href={buildHref(basePath, prev, query)}
            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm ${btn.idle}`}
          >
            <ChevronLeft className="h-4 w-4" />
            Prev
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg border border-white/5 px-3 py-2 text-sm text-zinc-600">
            <ChevronLeft className="h-4 w-4" />
            Prev
          </span>
        )}

        {windowStart > 1 && (
          <>
            <Link
              href={buildHref(basePath, 1, query)}
              className={`rounded-lg border px-3 py-2 text-sm ${btn.idle}`}
            >
              1
            </Link>
            {windowStart > 2 && <span className="text-zinc-600">…</span>}
          </>
        )}

        {pages.map((p) => (
          <Link
            key={p}
            href={buildHref(basePath, p, query)}
            className={`rounded-lg border px-3 py-2 text-sm ${
              p === current ? btn.active : btn.idle
            }`}
          >
            {p}
          </Link>
        ))}

        {windowEnd < safeTotal && (
          <>
            {windowEnd < safeTotal - 1 && (
              <span className="text-zinc-600">…</span>
            )}
            <Link
              href={buildHref(basePath, safeTotal, query)}
              className={`rounded-lg border px-3 py-2 text-sm ${btn.idle}`}
            >
              {safeTotal}
            </Link>
          </>
        )}

        {next ? (
          <Link
            href={buildHref(basePath, next, query)}
            className={`inline-flex items-center gap-1 rounded-lg border px-3 py-2 text-sm ${btn.idle}`}
          >
            Next
            <ChevronRight className="h-4 w-4" />
          </Link>
        ) : (
          <span className="inline-flex items-center gap-1 rounded-lg border border-white/5 px-3 py-2 text-sm text-zinc-600">
            Next
            <ChevronRight className="h-4 w-4" />
          </span>
        )}
      </div>
    </div>
  )
}
