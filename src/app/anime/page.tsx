import { animeApi } from '@/lib/anilist'
import Navbar from '@/components/Navbar'
import SiteFooter from '@/components/SiteFooter'
import LocalizedAnimeHome from '@/components/anime/LocalizedAnimeHome'

export const dynamic = 'force-dynamic'

async function settled<T>(promise: Promise<T>, fallback: T): Promise<T> {
  try {
    return await promise
  } catch {
    return fallback
  }
}

export default async function AnimeHomePage() {
  const [trending, popular, topRated, upcoming] = await Promise.all([
    settled(animeApi.getTrending(), []),
    settled(animeApi.getPopular(), []),
    settled(animeApi.getTopRated(), []),
    settled(animeApi.getUpcoming(), []),
  ])

  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <LocalizedAnimeHome
        trending={trending}
        popular={popular}
        topRated={topRated}
        upcoming={upcoming}
      />
      <SiteFooter />
    </div>
  )
}
