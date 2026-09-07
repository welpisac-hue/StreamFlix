'use client'

import { useEffect, useRef } from 'react'
import { usePathname } from 'next/navigation'
import { useSession } from 'next-auth/react'

export default function VisitTracker() {
  const pathname = usePathname()
  const { status } = useSession()
  const lastPath = useRef<string | null>(null)

  useEffect(() => {
    if (status !== 'authenticated') return
    if (!pathname || pathname.startsWith('/auth') || pathname.startsWith('/admin') || pathname.startsWith('/api/admin') || pathname.startsWith('/welcome')) {
      return
    }
    if (lastPath.current === pathname) return
    lastPath.current = pathname

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
