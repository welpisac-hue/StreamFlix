import { redirect } from 'next/navigation'
import { getServerSession } from 'next-auth'
import { authOptions } from '@/lib/auth'
import { prisma } from '@/lib/prisma'

export const dynamic = 'force-dynamic'

/**
 * Server-side admin gate — runs before any admin client UI hydrates.
 * Middleware + API requireAdmin() are additional layers.
 */
export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const session = await getServerSession(authOptions)

  if (!session?.user?.id) {
    redirect('/auth/signin')
  }

  try {
    const user = await prisma.user.findUnique({
      where: { id: session.user.id },
      select: { role: true, bannedAt: true },
    })

    if (!user || user.role !== 'ADMIN' || user.bannedAt) {
      redirect('/')
    }
  } catch (error) {
    console.error('AdminLayout authorization error:', error)
    redirect('/')
  }

  return (
    <div className="min-h-screen bg-black" data-admin-shell>
      {children}
    </div>
  )
}
