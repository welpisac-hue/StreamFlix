import Link from 'next/link'

export type GenreOption = { id: number; name: string }

type Props = {
  genres: GenreOption[]
  activeGenre?: number | null
  basePath: '/movies' | '/tv'
  sort?: string
  q?: string
}

function hrefFor(
  basePath: string,
  opts: { genre?: number | null; sort?: string; q?: string }
) {
  const params = new URLSearchParams()
  if (opts.q) params.set('q', opts.q)
  else {
    if (opts.sort && opts.sort !== 'popular') params.set('sort', opts.sort)
    if (opts.genre) params.set('genre', String(opts.genre))
  }
  const qs = params.toString()
  return qs ? `${basePath}?${qs}` : basePath
}

export default function GenreFilterBar({
  genres,
  activeGenre,
  basePath,
  sort = 'popular',
  q,
}: Props) {
  if (q) return null

  return (
    <div className="mb-6 -mx-1 flex gap-2 overflow-x-auto px-1 pb-1 scrollbar-hide">
      <Link
        href={hrefFor(basePath, { sort, genre: null })}
        className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          !activeGenre
            ? 'border-white bg-white text-black'
            : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white'
        }`}
      >
        All genres
      </Link>
      {genres.map((g) => {
        const active = activeGenre === g.id
        return (
          <Link
            key={g.id}
            href={hrefFor(basePath, { sort, genre: g.id })}
            className={`shrink-0 rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
              active
                ? 'border-[var(--primary)] bg-[var(--primary)]/20 text-white'
                : 'border-white/10 bg-white/5 text-zinc-400 hover:border-white/20 hover:text-white'
            }`}
          >
            {g.name}
          </Link>
        )
      })}
    </div>
  )
}
