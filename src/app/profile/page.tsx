'use client'

import { useSession } from 'next-auth/react'
import Link from 'next/link'
import { User, Heart, Clock, LogOut } from 'lucide-react'
import { signOut } from 'next-auth/react'
import Navbar from '@/components/Navbar'
import InviteFriendSection from '@/components/InviteFriendSection'
import { getAdminPath } from '@/lib/admin-path'

export default function ProfilePage() {
  const { data: session, status } = useSession()

  if (status === 'loading') {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-24 px-8 text-white">Loading...</div>
      </div>
    )
  }

  if (!session) {
    return (
      <div className="min-h-screen bg-black">
        <Navbar />
        <div className="pt-24 px-8 md:px-16 max-w-7xl mx-auto text-center">
          <User className="w-16 h-16 text-gray-600 mx-auto mb-4" />
          <h1 className="text-3xl font-bold text-white mb-4">
            Sign in to view your profile
          </h1>
          <Link
            href="/auth/signin"
            className="inline-block bg-red-600 text-white px-8 py-3 rounded-lg font-semibold hover:bg-red-700 transition-colors"
          >
            Sign In
          </Link>
        </div>
      </div>
    )
  }

  return (
    <div className="min-h-screen bg-black">
      <Navbar />
      <div className="pt-24 px-8 md:px-16 max-w-3xl mx-auto pb-16 space-y-6">
        <div className="bg-gray-900 rounded-lg p-8">
          <div className="flex items-center gap-4 mb-6">
            {session.user?.image ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={session.user.image}
                alt=""
                className="h-16 w-16 rounded-full object-cover ring-2 ring-red-600/50"
              />
            ) : (
              <div className="w-16 h-16 rounded-full bg-red-600 flex items-center justify-center">
                <User className="w-8 h-8 text-white" />
              </div>
            )}
            <div>
              <h1 className="text-3xl font-bold text-white">
                {session.user?.name || 'StreamFlix User'}
              </h1>
              <p className="text-gray-400">@{session.user?.username}</p>
            </div>
          </div>

          <div className="grid gap-3">
            {session.user?.role === 'ADMIN' && (
              <Link
                href={getAdminPath()}
                className="flex items-center gap-3 bg-red-600/20 hover:bg-red-600/30 text-white px-4 py-3 rounded-lg transition-colors border border-red-600/40"
              >
                Admin Dashboard
              </Link>
            )}
            <Link
              href="/my-list"
              className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-colors"
            >
              <Heart className="w-5 h-5 text-red-500" />
              My List
            </Link>
            <Link
              href="/continue-watching"
              className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-colors"
            >
              <Clock className="w-5 h-5 text-red-500" />
              Continue Watching
            </Link>
            <button
              onClick={async () => {
                try {
                  await fetch('/api/auth/logout', { method: 'POST' })
                } catch {
                  // ignore
                }
                await signOut({ callbackUrl: '/auth/signin' })
              }}
              className="flex items-center gap-3 bg-gray-800 hover:bg-gray-700 text-white px-4 py-3 rounded-lg transition-colors"
            >
              <LogOut className="w-5 h-5" />
              Sign Out
            </button>
          </div>
        </div>

        <InviteFriendSection />
      </div>
    </div>
  )
}
