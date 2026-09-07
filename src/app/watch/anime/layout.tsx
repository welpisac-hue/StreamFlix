import { Orbitron } from 'next/font/google'
import AnimeShell from '@/components/anime/AnimeShell'

const animeDisplay = Orbitron({
  subsets: ['latin'],
  variable: '--font-anime-display',
  weight: ['500', '700'],
})

export default function WatchAnimeLayout({
  children,
}: {
  children: React.ReactNode
}) {
  return (
    <div className={`${animeDisplay.variable}`}>
      <AnimeShell>{children}</AnimeShell>
    </div>
  )
}
