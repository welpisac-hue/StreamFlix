'use client'

import { useEffect, useState } from 'react'
import { signIn, useSession } from 'next-auth/react'
import { useRouter } from 'next/navigation'
import Link from 'next/link'
import { Film, Lock, KeyRound, User, Eye, EyeOff } from 'lucide-react'

export default function GatePage() {
  const router = useRouter()
  const { data: session, status } = useSession()
  const [mode, setMode] = useState<'signin' | 'signup'>('signup')
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [inviteCode, setInviteCode] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (status === 'authenticated' && session) {
      if (session.user?.onboardingCompleted === false) {
        router.replace('/welcome')
      } else {
        router.replace('/')
      }
    }
  }, [status, session, router])

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    try {
      const isSignup = mode === 'signup'

      if (isSignup) {
        const response = await fetch('/api/auth/signup', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ username, password, inviteCode }),
        })

        const data = await response.json()
        if (!response.ok) {
          throw new Error(data.error || 'Sign up failed')
        }
      }

      const result = await signIn('credentials', {
        username,
        password,
        redirect: false,
      })

      if (result?.error) {
        throw new Error(
          isSignup
            ? 'Account created but sign-in failed. Try signing in.'
            : 'Invalid username or password'
        )
      }

      router.push(isSignup ? '/welcome' : '/')
      router.refresh()
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Something went wrong')
    } finally {
      setLoading(false)
    }
  }

  if (status === 'loading' || status === 'authenticated') {
    return (
      <div className="flex min-h-screen items-center justify-center bg-black text-zinc-400">
        Loading…
      </div>
    )
  }

  return (
    <div className="relative min-h-screen overflow-hidden bg-black text-white">
      <div
        className="pointer-events-none absolute inset-0 opacity-40"
        style={{
          backgroundImage:
            'radial-gradient(ellipse 80% 60% at 20% 40%, rgba(229,9,20,0.35), transparent 55%), radial-gradient(ellipse 60% 50% at 85% 20%, rgba(80,80,120,0.25), transparent 50%), linear-gradient(180deg, #0a0a0c 0%, #050506 100%)',
        }}
      />
      <div
        className="pointer-events-none absolute inset-0 opacity-[0.07]"
        style={{
          backgroundImage:
            'url("data:image/svg+xml,%3Csvg viewBox=\'0 0 256 256\' xmlns=\'http://www.w3.org/2000/svg\'%3E%3Cfilter id=\'n\'%3E%3CfeTurbulence type=\'fractalNoise\' baseFrequency=\'0.85\' numOctaves=\'4\' stitchTiles=\'stitch\'/%3E%3C/filter%3E%3Crect width=\'100%25\' height=\'100%25\' filter=\'url(%23n)\'/%3E%3C/svg%3E")',
        }}
      />

      <div className="relative z-10 mx-auto flex min-h-screen max-w-6xl flex-col justify-center gap-10 px-6 py-12 lg:flex-row lg:items-center lg:gap-16 lg:px-10">
        <div className="flex-1 lg:max-w-xl">
          <div className="mb-6 inline-flex items-center gap-2 text-[var(--primary)]">
            <Film className="h-8 w-8" />
            <span className="font-display text-2xl tracking-wide">STREAMFLIX</span>
          </div>
          <h1 className="font-display text-5xl leading-[0.95] tracking-tight sm:text-6xl md:text-7xl">
            StreamFlix
            <span className="mt-2 block text-[var(--primary)]">
              Meant for Friends
            </span>
          </h1>
          <p className="mt-6 max-w-md text-base leading-relaxed text-zinc-400 sm:text-lg">
            A private watch party for people you trust. No public sign-ups —
            you need an invite code to get in.
          </p>
        </div>

        <div className="w-full max-w-md shrink-0">
          <div className="rounded-2xl border border-white/10 bg-zinc-950/80 p-7 shadow-2xl backdrop-blur-md">
            <div className="mb-6 flex rounded-lg bg-white/5 p-1">
              <button
                type="button"
                onClick={() => {
                  setMode('signup')
                  setError('')
                }}
                className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                  mode === 'signup'
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Join with invite
              </button>
              <button
                type="button"
                onClick={() => {
                  setMode('signin')
                  setError('')
                }}
                className={`flex-1 rounded-md py-2 text-sm font-semibold transition ${
                  mode === 'signin'
                    ? 'bg-[var(--primary)] text-white'
                    : 'text-zinc-400 hover:text-white'
                }`}
              >
                Sign in
              </button>
            </div>

            {error && (
              <div className="mb-4 rounded-lg border border-red-600/40 bg-red-600/15 px-4 py-3 text-sm text-red-300">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              {mode === 'signup' && (
                <div>
                  <label className="mb-1.5 block text-sm text-zinc-300">
                    Invite code
                  </label>
                  <div className="relative">
                    <KeyRound className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                    <input
                      type="text"
                      value={inviteCode}
                      onChange={(e) => setInviteCode(e.target.value.toUpperCase())}
                      className="w-full rounded-lg border border-white/10 bg-black/50 py-3 pl-10 pr-4 text-white outline-none focus:border-[var(--primary)]"
                      placeholder="YOUR-INVITE"
                      required
                      autoComplete="off"
                    />
                  </div>
                </div>
              )}

              <div>
                <label className="mb-1.5 block text-sm text-zinc-300">
                  Username
                </label>
                <div className="relative">
                  <User className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type="text"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/50 py-3 pl-10 pr-4 text-white outline-none focus:border-[var(--primary)]"
                    placeholder="username"
                    required
                    minLength={3}
                    maxLength={24}
                    autoComplete="username"
                  />
                </div>
              </div>

              <div>
                <label className="mb-1.5 block text-sm text-zinc-300">
                  Password
                </label>
                <div className="relative">
                  <Lock className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-zinc-500" />
                  <input
                    type={showPassword ? 'text' : 'password'}
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-black/50 py-3 pl-10 pr-11 text-white outline-none focus:border-[var(--primary)]"
                    placeholder="••••••••"
                    required
                    minLength={mode === 'signup' ? 8 : 1}
                    autoComplete={
                      mode === 'signup' ? 'new-password' : 'current-password'
                    }
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((v) => !v)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-zinc-500 hover:text-white"
                    aria-label={showPassword ? 'Hide password' : 'Show password'}
                  >
                    {showPassword ? (
                      <EyeOff className="h-4 w-4" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                  </button>
                </div>
                {mode === 'signup' && (
                  <p className="mt-2 text-xs leading-relaxed text-zinc-500">
                    8+ characters with upper, lower, number, and special character.
                    Username must be unique.
                  </p>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full rounded-lg bg-[var(--primary)] py-3 font-semibold text-white transition hover:bg-[var(--primary-dark)] disabled:cursor-not-allowed disabled:opacity-50"
              >
                {loading
                  ? 'Please wait…'
                  : mode === 'signup'
                    ? 'Create account'
                    : 'Sign in'}
              </button>
            </form>

            <p className="mt-5 text-center text-xs text-zinc-500">
              Invite-only. Ask a friend who already has access.
            </p>
          </div>

          <div className="mt-5 text-center text-xs text-zinc-500">
            <Link href="/legal/privacy" className="hover:text-white">
              Privacy
            </Link>
            {' · '}
            <Link href="/legal/terms" className="hover:text-white">
              Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  )
}
