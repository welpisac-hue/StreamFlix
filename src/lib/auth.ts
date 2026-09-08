import type { NextAuthOptions } from 'next-auth'
import CredentialsProvider from 'next-auth/providers/credentials'
import { prisma } from '@/lib/prisma'
import bcrypt from 'bcryptjs'
import { normalizeUsername } from '@/lib/password'
import { rateLimit } from '@/lib/rate-limit'
import { isAllowedAvatarSrc } from '@/lib/welcome-avatars'

/** Re-check ban/role from DB this often (ms). Keep short so bans stick quickly. */
const ROLE_REFRESH_MS = 30 * 1000

const useSecureCookies =
  process.env.NODE_ENV === 'production' ||
  process.env.CF_PAGES === '1' ||
  Boolean(process.env.CF_WORKER) ||
  (typeof process.env.NEXTAUTH_URL === 'string' &&
    process.env.NEXTAUTH_URL.startsWith('https://'))

const cookiePrefix = useSecureCookies ? '__Secure-' : ''

export const authOptions: NextAuthOptions = {
  useSecureCookies,
  cookies: {
    sessionToken: {
      name: `${cookiePrefix}next-auth.session-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
    callbackUrl: {
      name: `${cookiePrefix}next-auth.callback-url`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
    csrfToken: {
      name: `${useSecureCookies ? '__Host-' : ''}next-auth.csrf-token`,
      options: {
        httpOnly: true,
        sameSite: 'lax',
        path: '/',
        secure: useSecureCookies,
      },
    },
  },
  providers: [
    CredentialsProvider({
      name: 'credentials',
      credentials: {
        username: { label: 'Username', type: 'text' },
        password: { label: 'Password', type: 'password' },
      },
      async authorize(credentials) {
        if (!credentials?.username || !credentials?.password) {
          throw new Error('Invalid credentials')
        }

        const username = normalizeUsername(credentials.username)

        const limited = await rateLimit(`auth:login:${username}`, {
          limit: 8,
          windowMs: 15 * 60 * 1000,
        })
        if (!limited.ok) {
          throw new Error('Too many login attempts. Try again later.')
        }

        const user = await prisma.user.findUnique({
          where: { username },
          include: {
            preferences: { select: { onboardingCompleted: true } },
          },
        })

        if (!user?.password) {
          // Constant-time-ish dummy compare to reduce user enumeration timing
          await bcrypt.compare(
            credentials.password,
            '$2b$12$m8iuZGLVeV9F74HhmXiXV.xP079OfQ.GDNNk199na7jnCFxH6cwfi'
          )
          throw new Error('Invalid credentials')
        }

        const isCorrectPassword = await bcrypt.compare(
          credentials.password,
          user.password
        )

        if (!isCorrectPassword) {
          throw new Error('Invalid credentials')
        }

        if (user.bannedAt) {
          throw new Error(
            user.banReason
              ? `Account banned: ${user.banReason}`
              : 'This account has been banned'
          )
        }

        await prisma.user.update({
          where: { id: user.id },
          data: { lastLoginAt: new Date() },
        })

        return {
          id: user.id,
          name: user.name || user.username,
          username: user.username,
          role: user.role,
          image: user.image,
          onboardingCompleted: user.preferences?.onboardingCompleted ?? true,
        }
      },
    }),
  ],
  pages: {
    signIn: '/auth/signin',
  },
  debug: process.env.NEXTAUTH_DEBUG === '1',
  session: {
    strategy: 'jwt',
    maxAge: 60 * 60 * 12,
    updateAge: 60 * 30,
  },
  jwt: {
    maxAge: 60 * 60 * 12,
  },
  callbacks: {
    async jwt({ token, user, trigger, session }) {
      if (user) {
        token.id = user.id
        token.username = user.username
        token.role = user.role
        token.name = user.name
        token.picture = user.image
        token.onboardingCompleted =
          (user as { onboardingCompleted?: boolean }).onboardingCompleted ??
          true
        token.banned = false
        token.roleCheckedAt = Date.now()
        return token
      }

      // Client session.update() must never trust arbitrary image URLs.
      // Prefer DB sync; only accept allowlisted avatar URLs as a fallback.
      if (trigger === 'update' && token.id) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              role: true,
              username: true,
              name: true,
              image: true,
              bannedAt: true,
              preferences: { select: { onboardingCompleted: true } },
            },
          })
          if (!dbUser || dbUser.bannedAt) {
            return {
              ...token,
              role: 'USER',
              banned: true,
              picture: null,
              roleCheckedAt: Date.now(),
            }
          }
          token.role = dbUser.role
          token.username = dbUser.username
          token.name = dbUser.name || dbUser.username
          token.picture = dbUser.image
          token.banned = false
          token.onboardingCompleted =
            dbUser.preferences?.onboardingCompleted ?? true
          if (
            session &&
            typeof session.image === 'string' &&
            isAllowedAvatarSrc(session.image)
          ) {
            token.picture = session.image
          }
          if (session && typeof session.onboardingCompleted === 'boolean') {
            token.onboardingCompleted = session.onboardingCompleted
          }
          token.roleCheckedAt = Date.now()
          return token
        } catch {
          token.roleCheckedAt = Date.now()
        }
      }

      const checkedAt = (token.roleCheckedAt as number | undefined) || 0
      if (token.id && Date.now() - checkedAt > ROLE_REFRESH_MS) {
        try {
          const dbUser = await prisma.user.findUnique({
            where: { id: token.id as string },
            select: {
              role: true,
              username: true,
              name: true,
              image: true,
              bannedAt: true,
              preferences: { select: { onboardingCompleted: true } },
            },
          })
          if (!dbUser || dbUser.bannedAt) {
            return {
              ...token,
              role: 'USER',
              banned: true,
              picture: null,
              roleCheckedAt: Date.now(),
            }
          }
          token.role = dbUser.role
          token.username = dbUser.username
          token.name = dbUser.name || dbUser.username
          token.picture = dbUser.image
          token.banned = false
          token.onboardingCompleted =
            dbUser.preferences?.onboardingCompleted ?? true
          token.roleCheckedAt = Date.now()
        } catch {
          token.roleCheckedAt = Date.now()
        }
      }

      return token
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string
        session.user.username = token.username as string
        session.user.role = (token.role as 'USER' | 'ADMIN') || 'USER'
        session.user.name = (token.name as string) || (token.username as string)
        session.user.image = (token.picture as string | null) || null
        session.user.onboardingCompleted =
          (token.onboardingCompleted as boolean | undefined) ?? true
        session.user.banned = !!(token as { banned?: boolean }).banned
      }
      return session
    },
  },
  secret:
    process.env.NEXTAUTH_SECRET ||
    process.env.AUTH_SECRET ||
    'streamflix-auth-production-secret-fallback-key-32chars',
}
