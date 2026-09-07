import { notFound } from 'next/navigation'
import Link from 'next/link'
import { ChevronLeft, Play } from 'lucide-react'
import { tmdb } from '@/lib/tmdb'
import Navbar from '@/components/Navbar'

export const dynamic = 'force-dynamic'

export default async function SeasonPage({
  params,
}: {
  params: Promise<{ id: string; season: string }>
}) {
  const { id, season } = await params
  const tvId = parseInt(id, 10)
  const seasonNumber = parseInt(season, 10)

  if (Number.isNaN(tvId) || Number.isNaN(seasonNumber)) {
    notFound()
  }

  let show
  let seasonData
  try {
    ;[show, seasonData] = await Promise.all([
      tmdb.getTVShowDetails(tvId),
      tmdb.getSeasonDetails(tvId, seasonNumber),
    ])
  } catch {
    notFound()
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />

      <div className="pt-24 px-8 md:px-16 max-w-7xl mx-auto pb-16">
        <Link
          href={`/tv/${tvId}`}
          className="inline-flex items-center gap-2 text-white hover:text-red-500 transition-colors mb-6"
        >
          <ChevronLeft className="w-5 h-5" />
          Back to {show.name}
        </Link>

        <div className="flex gap-6 mb-8">
          <img
            src={tmdb.getImageUrl(seasonData.poster_path || show.poster_path, 'w300')}
            alt={seasonData.name}
            className="w-40 rounded-lg hidden sm:block"
          />
          <div>
            <h1 className="text-4xl font-bold text-white mb-2">
              {show.name}
            </h1>
            <h2 className="text-2xl text-gray-300 mb-4">{seasonData.name}</h2>
            <p className="text-gray-400 mb-2">
              {seasonData.episodes?.length || seasonData.episode_count || 0}{' '}
              episodes
            </p>
            <p className="text-gray-300 max-w-2xl">{seasonData.overview}</p>
          </div>
        </div>

        <div className="space-y-3">
          {seasonData.episodes?.map(
            (episode: {
              id: number
              episode_number: number
              name: string
              overview: string
              air_date: string
              still_path: string | null
            }) => (
              <Link
                key={episode.id}
                href={`/watch/tv/${tvId}/${seasonNumber}/${episode.episode_number}`}
                className="bg-gray-900 hover:bg-gray-800 rounded-lg p-4 flex gap-4 transition-colors"
              >
                <div className="w-12 h-12 bg-gray-800 rounded flex items-center justify-center text-white font-bold shrink-0">
                  {episode.episode_number}
                </div>
                {episode.still_path && (
                  <img
                    src={tmdb.getImageUrl(episode.still_path, 'w300')}
                    alt={episode.name}
                    className="w-40 h-24 object-cover rounded hidden md:block"
                  />
                )}
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-4">
                    <h3 className="text-white font-semibold truncate">
                      {episode.name}
                    </h3>
                    <Play className="w-5 h-5 text-red-500 shrink-0" />
                  </div>
                  <p className="text-gray-400 text-sm mb-1">
                    {episode.air_date}
                  </p>
                  <p className="text-gray-300 text-sm line-clamp-2">
                    {episode.overview}
                  </p>
                </div>
              </Link>
            )
          )}
        </div>
      </div>
    </div>
  )
}
