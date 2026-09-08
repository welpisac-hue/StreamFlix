import Link from 'next/link'

export default function SiteFooter() {
  return (
    <footer className="mt-auto border-t border-white/5 bg-black/40">
      <div className="page-shell py-12">
        <div className="grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
          <div>
            <p className="font-display text-2xl tracking-wide text-[var(--primary)]">
              STREAMFLIX
            </p>
            <p className="mt-3 max-w-xs text-sm leading-relaxed text-zinc-500">
              Free movies and TV streaming. Catalog powered by TMDB, playback via
              VidKing.
            </p>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-300">
              Browse
            </h3>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li>
                <Link href="/movies" className="hover:text-white">
                  Movies
                </Link>
              </li>
              <li>
                <Link href="/tv" className="hover:text-white">
                  TV Shows
                </Link>
              </li>
              <li>
                <Link href="/anime" className="hover:text-white">
                  Anime Hub
                </Link>
              </li>
              <li>
                <Link href="/playlists" className="hover:text-white">
                  Community Playlists
                </Link>
              </li>
              <li>
                <Link href="/search" className="hover:text-white">
                  Search
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-300">
              Help
            </h3>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li>
                <Link href="/faq" className="hover:text-white">
                  FAQ
                </Link>
              </li>
              <li>
                <Link href="/contact" className="hover:text-white">
                  Contact
                </Link>
              </li>
              <li>
                <Link href="/about" className="hover:text-white">
                  About
                </Link>
              </li>
            </ul>
          </div>
          <div>
            <h3 className="mb-3 text-sm font-semibold uppercase tracking-wider text-zinc-300">
              Legal
            </h3>
            <ul className="space-y-2 text-sm text-zinc-500">
              <li>
                <Link href="/legal/disclaimer" className="hover:text-white">
                  Disclaimer
                </Link>
              </li>
              <li>
                <Link href="/legal/terms" className="hover:text-white">
                  Terms
                </Link>
              </li>
              <li>
                <Link href="/legal/privacy" className="hover:text-white">
                  Privacy
                </Link>
              </li>
            </ul>
          </div>
        </div>
        <div className="mt-10 border-t border-white/5 pt-6 text-center text-sm text-zinc-600">
          <p>© {new Date().getFullYear()} StreamFlix</p>
          <p className="mt-1">Real5wagger5oup@Gmail.com</p>
        </div>
      </div>
    </footer>
  )
}
