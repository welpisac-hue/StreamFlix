import Link from 'next/link'
import { animeApi } from '@/lib/anilist'
import Navbar from '@/components/Navbar'
import SiteFooter from '@/components/SiteFooter'
import LocalizedAnimeDetail from '@/components/anime/LocalizedAnimeDetail'

export const dynamic = 'force-dynamic'

export default async function AnimeDetailPage({
  params,
}: {
  params: Promise<{ id: string }>
}) {
  const { id } = await params
  const animeId = parseInt(id, 10)

  if (Number.isNaN(animeId) || animeId <= 0) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="page-shell flex flex-1 flex-col items-center justify-center pb-16 pt-[calc(var(--nav-height)+3rem)] text-center">
          <h1 className="font-[family-name:var(--font-anime-display)] text-3xl text-white">
            Invalid anime link
          </h1>
          <Link
            href="/anime"
            className="anime-cta-primary mt-6 inline-flex rounded-lg px-5 py-2.5 text-sm font-semibold"
          >
            Back to Anime
          </Link>
        </div>
        <SiteFooter />
      </div>
    )
  }

  let anime = null
  try {
    anime = await animeApi.getDetails(animeId)
  } catch (error) {
    console.error('anime getDetails failed', animeId, error)
  }

  if (!anime) {
    return (
      <div className="flex min-h-screen flex-col">
        <Navbar />
        <div className="page-shell flex flex-1 flex-col items-center justify-center pb-16 pt-[calc(var(--nav-height)+3rem)] text-center">
          <h1 className="font-[family-name:var(--font-anime-display)] text-3xl text-white">
            Anime unavailable
          </h1>
          <p className="mt-2 max-w-md text-zinc-400">
            We couldn&apos;t load this title right now. The catalog source may be
            rate-limiting — try again in a moment.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <Link
              href={`/anime/${animeId}`}
              className="anime-cta-primary inline-flex rounded-lg px-5 py-2.5 text-sm font-semibold"
            >
              Retry
            </Link>
            <Link
              href="/anime"
              className="inline-flex rounded-lg border border-fuchsia-400/20 bg-white/5 px-5 py-2.5 text-sm text-white hover:bg-white/10"
            >
              Back to Anime
            </Link>
          </div>
        </div>
        <SiteFooter />
      </div>
    )
  }

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <LocalizedAnimeDetail anime={anime} />
      <SiteFooter />
    </div>
  )
}
