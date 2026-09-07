'use client'

import { useEffect, useState } from 'react'
import {
  User,
  Home,
  Film,
  Tv,
  Clock,
  Heart,
  LogOut,
  Menu,
  X,
  Compass,
  Lock,
} from 'lucide-react'
import Link from 'next/link'
import { usePathname } from 'next/navigation'
import { useSession, signOut } from 'next-auth/react'
import ModeToggle from '@/components/ModeToggle'
import AnimeLanguageButton from '@/components/anime/AnimeLanguageButton'
import LiveSearch from '@/components/LiveSearch'
import { getAdminPath } from '@/lib/admin-path'
import { useSiteExperience } from '@/components/SiteExperience'

const movieLinks = [
  { href: '/', label: 'Home', icon: Home },
  { href: '/movies', label: 'Movies', icon: Film },
  { href: '/tv', label: 'TV', icon: Tv },
  { href: '/my-list', label: 'My List', icon: Heart },
]

const animeLinks = [
  { href: '/anime', label: 'Home', icon: Home },
  { href: '/anime/browse', label: 'Browse', icon: Compass },
  { href: '/anime/my-list', label: 'My List', icon: Heart },
]

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false)
  const [menuOpen, setMenuOpen] = useState(false)
  const { data: session } = useSession()
  const pathname = usePathname()
  const { isHrefLocked } = useSiteExperience()

  const animeMode =
    pathname === '/anime' ||
    pathname.startsWith('/anime/') ||
    pathname.startsWith('/watch/anime')

  const continueHref = animeMode
    ? '/anime/continue-watching'
    : '/continue-watching'
  const myListHref = animeMode ? '/anime/my-list' : '/my-list'
  const links = animeMode ? animeLinks : movieLinks
  const brandHref = animeMode ? '/anime' : '/'
  const brandLabel = animeMode ? 'ANIFLIX' : 'STREAMFLIX'

  const handleSignOut = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' })
    } catch {
      // ignore
    }
    await signOut({ callbackUrl: '/auth/signin' })
  }

  const NavItem = ({
    href,
    label,
    icon: Icon,
  }: {
    href: string
    label: string
    icon: typeof Home
  }) => {
    const lock = isHrefLocked(href)
    const active =
      pathname === href ||
      (href !== '/' && href !== '/anime' && pathname.startsWith(href))

    if (lock.locked) {
      return (
        <span
          title={lock.message}
          className="inline-flex cursor-not-allowed items-center gap-2 rounded-lg px-3 py-2 text-sm text-zinc-600 opacity-60"
        >
          <Lock className="h-4 w-4 shrink-0" />
          <span className="line-through decoration-zinc-600">{label}</span>
        </span>
      )
    }

    return (
      <Link
        href={href}
        className={`inline-flex items-center gap-2 rounded-lg px-3 py-2 text-sm transition-colors ${
          active
            ? 'bg-white/10 text-white'
            : 'text-zinc-300 hover:bg-white/5 hover:text-white'
        }`}
      >
        <Icon className="h-4 w-4" />
        {label}
      </Link>
    )
  }

  useEffect(() => {
    const onScroll = () => setScrolled(window.scrollY > 24)
    onScroll()
    window.addEventListener('scroll', onScroll, { passive: true })
    return () => window.removeEventListener('scroll', onScroll)
  }, [])

  useEffect(() => {
    setMenuOpen(false)
  }, [pathname])

  const searchInputClass = `w-40 rounded-full border bg-white/5 py-2 pl-9 pr-3 text-sm text-white outline-none transition md:w-56 ${
    animeMode
      ? 'border-fuchsia-400/20 focus:border-fuchsia-400/50 focus:bg-black/40'
      : 'border-white/10 focus:border-[var(--primary)] focus:bg-black/40'
  }`

  return (
    <nav
      className={`fixed inset-x-0 top-0 z-50 transition-colors duration-300 ${
        scrolled || menuOpen
          ? animeMode
            ? 'border-b border-fuchsia-400/15 bg-[#0a0514]/90 backdrop-blur-md'
            : 'border-b border-white/5 bg-black/90 backdrop-blur-md'
          : 'bg-gradient-to-b from-black/80 to-transparent'
      }`}
    >
      <div className="page-shell">
        <div className="flex h-[var(--nav-height)] items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-4 lg:gap-6">
            <Link
              href={brandHref}
              className={`shrink-0 tracking-wide ${
                animeMode
                  ? 'bg-gradient-to-r from-fuchsia-300 to-cyan-300 bg-clip-text font-[family-name:var(--font-anime-display)] text-2xl text-transparent sm:text-3xl'
                  : 'font-display text-3xl text-[var(--primary)]'
              }`}
            >
              {brandLabel}
            </Link>

            <ModeToggle />

            <div className="hidden items-center gap-1 xl:flex">
              {links.map(({ href, label, icon }) => (
                <NavItem key={href} href={href} label={label} icon={icon} />
              ))}
              {session && (
                <NavItem href={continueHref} label="Continue" icon={Clock} />
              )}
            </div>
          </div>

          <div className="flex items-center gap-2 sm:gap-3">
            {animeMode && <AnimeLanguageButton />}

            <LiveSearch
              animeMode={animeMode}
              className="hidden sm:block"
              inputClassName={searchInputClass}
            />

            {session ? (
              <div className="relative group">
                <button
                  type="button"
                  className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-2.5 py-1.5 text-sm text-white sm:px-3 sm:py-2"
                >
                  {session.user?.image ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img
                      src={session.user.image}
                      alt=""
                      className="h-7 w-7 rounded-full object-cover ring-1 ring-white/20"
                    />
                  ) : (
                    <User className="h-4 w-4" />
                  )}
                  <span className="hidden max-w-[8rem] truncate md:inline">
                    {session.user?.username || session.user?.name || 'Account'}
                  </span>
                </button>
                <div className="invisible absolute right-0 mt-2 w-48 rounded-xl border border-white/10 bg-zinc-950 opacity-0 shadow-xl transition group-hover:visible group-hover:opacity-100">
                  <Link
                    href="/profile"
                    className="block px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/5"
                  >
                    Profile
                  </Link>
                  {session.user?.role === 'ADMIN' && (
                    <Link
                      href={getAdminPath()}
                      className="block px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/5"
                    >
                      Admin Dashboard
                    </Link>
                  )}
                  {(() => {
                    const lock = isHrefLocked(myListHref)
                    if (lock.locked) {
                      return (
                        <span
                          title={lock.message}
                          className="flex cursor-not-allowed items-center gap-2 px-4 py-2.5 text-sm text-zinc-600 opacity-60"
                        >
                          <Lock className="h-3.5 w-3.5" />
                          <span className="line-through">My List</span>
                        </span>
                      )
                    }
                    return (
                      <Link
                        href={myListHref}
                        className="block px-4 py-2.5 text-sm text-zinc-200 hover:bg-white/5"
                      >
                        My List
                      </Link>
                    )
                  })()}
                  <button
                    type="button"
                    onClick={() => void handleSignOut()}
                    className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-sm text-zinc-200 hover:bg-white/5"
                  >
                    <LogOut className="h-4 w-4" />
                    Sign Out
                  </button>
                </div>
              </div>
            ) : (
              <Link
                href="/auth/signin"
                className={`rounded-full px-4 py-2 text-sm font-semibold text-white transition ${
                  animeMode
                    ? 'bg-gradient-to-r from-fuchsia-500 to-cyan-500 text-black hover:brightness-110'
                    : 'bg-[var(--primary)] hover:bg-[var(--primary-dark)]'
                }`}
              >
                Sign In
              </Link>
            )}

            <button
              type="button"
              className="rounded-lg border border-white/10 p-2 text-white xl:hidden"
              onClick={() => setMenuOpen((v) => !v)}
              aria-label="Toggle menu"
            >
              {menuOpen ? <X className="h-5 w-5" /> : <Menu className="h-5 w-5" />}
            </button>
          </div>
        </div>

        {menuOpen && (
          <div className="border-t border-white/5 pb-4 pt-2 xl:hidden">
            <LiveSearch
              animeMode={animeMode}
              mobile
              className="mb-3 sm:hidden"
              inputClassName="w-full rounded-full border border-white/10 bg-white/5 py-2.5 pl-9 pr-3 text-sm text-white outline-none"
            />
            <div className="grid gap-1">
              {links.map(({ href, label, icon: Icon }) => (
                <NavItem key={href} href={href} label={label} icon={Icon} />
              ))}
              {session && (
                <NavItem
                  href={continueHref}
                  label="Continue Watching"
                  icon={Clock}
                />
              )}
            </div>
          </div>
        )}
      </div>
    </nav>
  )
}
