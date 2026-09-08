import { withAuth } from 'next-auth/middleware'
import { NextResponse } from 'next/server'

function getAdminSlug(): string | null {
  const raw = (
    process.env.ADMIN_PATH ||
    process.env.NEXT_PUBLIC_ADMIN_PATH ||
    ''
  )
    .trim()
    .replace(/^\/+|\/+$/g, '')
  if (!raw || raw === 'admin') return null
  return raw
}

function applySecurityHeaders(res: NextResponse) {
  res.headers.set('X-Content-Type-Options', 'nosniff')
  res.headers.set('X-Frame-Options', 'SAMEORIGIN')
  res.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin')
  res.headers.set('X-Robots-Tag', 'noindex')
  return res
}

export default withAuth(
  function middleware(req) {
    const { pathname } = req.nextUrl
    const token = req.nextauth.token
    const adminSlug = getAdminSlug()
    const isProd = process.env.NODE_ENV === 'production'

    // Banned accounts cannot use the app (JWT flag refreshed ~30s)
    if (token?.banned) {
      if (pathname.startsWith('/api/')) {
        return applySecurityHeaders(
          NextResponse.json({ error: 'Account banned' }, { status: 403 })
        )
      }
      const signIn = new URL('/auth/signin', req.url)
      signIn.searchParams.set('error', 'Banned')
      return applySecurityHeaders(NextResponse.redirect(signIn))
    }

    // Production without ADMIN_PATH: block the default /admin UI so it isn't public.
    // Set ADMIN_PATH + NEXT_PUBLIC_ADMIN_PATH on Vercel (same value).
    if (
      isProd &&
      !adminSlug &&
      (pathname === '/admin' || pathname.startsWith('/admin/'))
    ) {
      return applySecurityHeaders(new NextResponse(null, { status: 404 }))
    }

    // Admin UI is at /admin (or rewritten from ADMIN_PATH slug).
    const isAdminPage =
      pathname === '/admin' ||
      pathname.startsWith('/admin/') ||
      (adminSlug !== null &&
        (pathname === `/${adminSlug}` || pathname.startsWith(`/${adminSlug}/`)))

    const isAdminApi = pathname.startsWith('/api/admin')

    if (isAdminPage || isAdminApi) {
      if (token?.role !== 'ADMIN') {
        if (pathname.startsWith('/api/')) {
          return applySecurityHeaders(
            NextResponse.json({ error: 'Forbidden' }, { status: 403 })
          )
        }
        return applySecurityHeaders(
          NextResponse.redirect(new URL('/', req.url))
        )
      }
    }

    const res = NextResponse.next()
    if (isAdminPage || isAdminApi) {
      res.headers.set(
        'Cache-Control',
        'no-store, no-cache, must-revalidate, private'
      )
      res.headers.set('X-Robots-Tag', 'noindex, nofollow')
    }
    return applySecurityHeaders(res)
  },
  {
    pages: {
      signIn: '/auth/signin',
    },
    callbacks: {
      authorized: ({ token, req }) => {
        const { pathname } = req.nextUrl

        if (
          pathname.startsWith('/auth') ||
          pathname.startsWith('/api/auth') ||
          pathname.startsWith('/legal') ||
          pathname === '/contact' ||
          pathname === '/faq' ||
          pathname === '/about' ||
          pathname === '/api/contact'
        ) {
          return true
        }

        if (!token) return false
        if (token.banned) return false
        return true
      },
    },
  }
)

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp|ico)$).*)',
  ],
}
