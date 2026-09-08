'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

const MIN_INTERVAL_MS = 30_000

export default function VisitTracker() {
  const pathname = usePathname()
  const { status } = useSession()
  const lastPath = useRef<string | null>(null)
  const lastSentAt = useRef(0)

  useEffect(() => {
    if (status !== 'authenticated') return
    if (
      !pathname ||
      pathname.startsWith('/auth') ||
      pathname.startsWith('/admin') ||
      pathname.startsWith('/api/admin') ||
      pathname.startsWith('/welcome') ||
      pathname.startsWith('/watch')
    ) {
      return
    }
    if (lastPath.current === pathname) return

    const now = Date.now()
    if (now - lastSentAt.current < MIN_INTERVAL_MS) {
      lastPath.current = pathname
      return
    }

    lastPath.current = pathname
    lastSentAt.current = now

    void fetch('/api/analytics/visit', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ path: pathname }),
    }).catch(() => {
      // ignore analytics failures
    })
  }, [pathname, status])

  return null
}
