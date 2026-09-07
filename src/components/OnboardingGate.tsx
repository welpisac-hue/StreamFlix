'use client'

import { useEffect } from 'react'
import { useSession } from 'next-auth/react'
import { usePathname, useRouter } from 'next/navigation'

/**
 * Sends new accounts through /welcome until onboarding is finished.
 */
export default function OnboardingGate() {
  const { data: session, status } = useSession()
  const pathname = usePathname()
  const router = useRouter()

  useEffect(() => {
    if (status !== 'authenticated') return
    if (session?.user?.onboardingCompleted !== false) return
    if (
      pathname?.startsWith('/welcome') ||
      pathname?.startsWith('/auth') ||
      pathname?.startsWith('/legal') ||
      pathname?.startsWith('/api')
    ) {
      return
    }
    router.replace('/welcome')
  }, [status, session, pathname, router])

  return null
}
