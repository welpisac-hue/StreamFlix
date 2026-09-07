import { notFound } from 'next/navigation'
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
  if (Number.isNaN(animeId)) notFound()

  const anime = await animeApi.getDetails(animeId)
  if (!anime) notFound()

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <LocalizedAnimeDetail anime={anime} />
      <SiteFooter />
    </div>
  )
}
