import { getImageUrl } from '@/lib/tmdb/images'

export interface CastMember {
  id: number
  name: string
  character?: string
  profile_path: string | null
}

interface CastGridProps {
  cast: CastMember[]
  limit?: number
  title?: string
}

function resolveImage(path: string | null): string {
  if (!path) return '/placeholder.svg'
  if (path.startsWith('http')) return path
  return getImageUrl(path, 'w185')
}

export default function CastGrid({
  cast,
  limit = 8,
  title = 'Cast',
}: CastGridProps) {
  const people = cast.slice(0, limit)
  if (people.length === 0) return null

  return (
    <section>
      <h2 className="mb-5 font-display text-2xl tracking-wide text-white md:text-3xl">
        {title}
      </h2>
      <div className="grid grid-cols-3 gap-5 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8">
        {people.map((actor) => (
          <div key={actor.id} className="flex flex-col items-center text-center">
            <div className="relative h-20 w-20 overflow-hidden rounded-full bg-zinc-800 ring-2 ring-white/10 transition hover:ring-[var(--primary)]/60 sm:h-24 sm:w-24">
              <img
                src={resolveImage(actor.profile_path)}
                alt={actor.name}
                loading="lazy"
                className="h-full w-full object-cover"
              />
            </div>
            <p className="mt-2.5 line-clamp-2 text-sm font-semibold text-zinc-100">
              {actor.name}
            </p>
            {actor.character && (
              <p className="mt-0.5 line-clamp-2 text-xs text-zinc-500">
                {actor.character}
              </p>
            )}
          </div>
        ))}
      </div>
    </section>
  )
}
