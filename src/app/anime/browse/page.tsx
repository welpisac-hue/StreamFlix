import { Suspense } from 'react'
import Navbar from '@/components/Navbar'
import SiteFooter from '@/components/SiteFooter'
import AnimeBrowseCatalog from '@/components/anime/AnimeBrowseCatalog'

export const dynamic = 'force-dynamic'

export default function AnimeBrowsePage() {
  return (
    <div className="flex min-h-screen flex-col">
      <Navbar />
      <main className="page-shell flex-1 pb-16 pt-[calc(var(--nav-height)+2rem)]">
        <Suspense
          fallback={
            <div className="flex justify-center py-20">
              <div className="h-8 w-8 animate-pulse rounded-full bg-fuchsia-400" />
            </div>
          }
        >
          <AnimeBrowseCatalog />
        </Suspense>
      </main>
      <SiteFooter />
    </div>
  )
}
