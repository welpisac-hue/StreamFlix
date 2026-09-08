'use client'

import { useEffect, useState, use } from 'react'
import Link from 'next/link'
import { ArrowLeft, Calendar, Film, MapPin, User as UserIcon } from 'lucide-react'
import Navbar from '@/components/Navbar'
import SiteFooter from '@/components/SiteFooter'
import MovieCard from '@/components/MovieCard'
import { getImageUrl } from '@/lib/tmdb/images'

type Work = {
  id: number
  title?: string
  name?: string
  poster_path: string
  vote_average?: number
  media_type: 'movie' | 'tv'
  release_date?: string
  first_air_date?: string
  character?: string
  job?: string
}

type PersonDetails = {
  id: number
  name: string
  biography: string
  profile_path: string | null
  birthday: string | null
  place_of_birth: string | null
  known_for_department: string
}

export default function PersonDetailsPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const resolvedParams = use(params)
  const [data, setData] = useState<{
    person: PersonDetails
    castWorks: Work[]
    crewWorks: Work[]
  } | null>(null)
  const [loading, setLoading] = useState(true)
  const [tab, setTab] = useState<'acting' | 'crew'>('acting')

  useEffect(() => {
    async function loadPerson() {
      try {
        const res = await fetch(`/api/tmdb/person/${resolvedParams.id}`)
        if (res.ok) {
          const json = await res.json()
          setData(json)
        }
      } catch (err) {
        console.error('Error loading person details:', err)
      } finally {
        setLoading(false)
      }
    }
    void loadPerson()
  }, [resolvedParams.id])

  if (loading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-white">
        <div className="h-8 w-8 animate-spin rounded-full border-2 border-[var(--primary)] border-t-transparent" />
      </div>
    )
  }

  if (!data) {
    return (
      <div className="flex min-h-screen flex-col bg-black text-white">
        <Navbar />
        <div className="flex flex-1 items-center justify-center py-20">
          <p className="text-zinc-500">Person not found.</p>
        </div>
        <SiteFooter />
      </div>
    )
  }

  const { person, castWorks, crewWorks } = data

  return (
    <div className="flex min-h-screen flex-col bg-black text-white">
      <Navbar />

      <main className="page-shell flex-1 pb-16 pt-[calc(var(--nav-height)+2rem)]">
        <Link
          href="/"
          className="mb-6 inline-flex items-center gap-1.5 text-xs text-zinc-400 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          Back home
        </Link>

        {/* Person Header */}
        <div className="mb-12 flex flex-col gap-8 md:flex-row md:items-start">
          <div className="shrink-0 overflow-hidden rounded-2xl border border-white/10 bg-zinc-900 shadow-2xl md:w-64">
            {person.profile_path ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={getImageUrl(person.profile_path, 'h632')}
                alt={person.name}
                className="aspect-[2/3] w-full object-cover"
              />
            ) : (
              <div className="flex aspect-[2/3] w-full items-center justify-center bg-zinc-900 text-zinc-600">
                <UserIcon className="h-20 w-20" />
              </div>
            )}
          </div>

          <div className="flex-1 space-y-4">
            <div>
              <span className="rounded bg-[var(--primary)]/20 px-2.5 py-1 text-xs font-semibold uppercase tracking-wider text-red-300">
                {person.known_for_department || 'Actor / Filmography'}
              </span>
              <h1 className="mt-2 font-display text-4xl tracking-wide text-white md:text-5xl">
                {person.name}
              </h1>
            </div>

            <div className="flex flex-wrap gap-4 text-xs text-zinc-400">
              {person.birthday && (
                <span className="flex items-center gap-1.5">
                  <Calendar className="h-3.5 w-3.5 text-zinc-500" />
                  Born {new Date(person.birthday).toLocaleDateString()}
                </span>
              )}
              {person.place_of_birth && (
                <span className="flex items-center gap-1.5">
                  <MapPin className="h-3.5 w-3.5 text-zinc-500" />
                  {person.place_of_birth}
                </span>
              )}
            </div>

            {person.biography && (
              <div className="rounded-xl border border-white/5 bg-white/[0.03] p-4 text-sm leading-relaxed text-zinc-300">
                <p className="line-clamp-6 whitespace-pre-line">{person.biography}</p>
              </div>
            )}
          </div>
        </div>

        {/* Filmography Section */}
        <div>
          <div className="mb-6 flex items-center justify-between border-b border-white/10 pb-4">
            <h2 className="flex items-center gap-2 font-display text-2xl tracking-wide">
              <Film className="h-5 w-5 text-[var(--primary)]" />
              Filmography
            </h2>

            <div className="flex gap-2">
              <button
                type="button"
                onClick={() => setTab('acting')}
                className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                  tab === 'acting'
                    ? 'bg-[var(--primary)] text-white'
                    : 'bg-white/5 text-zinc-400 hover:text-white'
                }`}
              >
                Acting ({castWorks.length})
              </button>
              {crewWorks.length > 0 && (
                <button
                  type="button"
                  onClick={() => setTab('crew')}
                  className={`rounded-lg px-3 py-1.5 text-xs font-semibold transition ${
                    tab === 'crew'
                      ? 'bg-[var(--primary)] text-white'
                      : 'bg-white/5 text-zinc-400 hover:text-white'
                  }`}
                >
                  Directing & Production ({crewWorks.length})
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 xl:grid-cols-6">
            {(tab === 'acting' ? castWorks : crewWorks).map((work, idx) => (
              <div key={`${work.media_type}-${work.id}-${idx}`} className="group relative">
                <MovieCard
                  id={work.id}
                  title={work.title || work.name || 'Untitled'}
                  posterPath={work.poster_path}
                  mediaType={work.media_type}
                  rating={work.vote_average}
                  year={
                    work.release_date?.split('-')[0] ||
                    work.first_air_date?.split('-')[0]
                  }
                />
                {(work.character || work.job) && (
                  <p className="mt-1 truncate text-[11px] text-zinc-400">
                    {work.character ? `as ${work.character}` : work.job}
                  </p>
                )}
              </div>
            ))}
          </div>
        </div>
      </main>

      <SiteFooter />
    </div>
  )
}
