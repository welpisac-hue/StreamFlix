import { NextResponse } from 'next/server'
import { prisma } from '@/lib/prisma'
import { requireAdmin } from '@/lib/admin'
import { getSiteSettings, parseSectionMaintenance } from '@/lib/site-settings-db'
import { MAINTENANCE_SECTIONS } from '@/lib/site-settings'
import { rateLimit } from '@/lib/rate-limit'

export const dynamic = 'force-dynamic'

export async function GET() {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const settings = await getSiteSettings()
  const polls = await prisma.poll.findMany({
    orderBy: { createdAt: 'desc' },
    include: {
      _count: { select: { votes: true } },
    },
  })

  return NextResponse.json({
    settings: {
      ...settings,
      sectionMaintenance: parseSectionMaintenance(settings.sectionMaintenance),
      announcementUpdatedAt:
        settings.announcementUpdatedAt?.toISOString() ?? null,
      updatedAt: settings.updatedAt.toISOString(),
    },
    sections: MAINTENANCE_SECTIONS.map((s) => ({
      key: s.key,
      label: s.label,
    })),
    polls: polls.map((p) => ({
      id: p.id,
      question: p.question,
      options: p.options,
      isActive: p.isActive,
      endsAt: p.endsAt?.toISOString() ?? null,
      resultsRevealAt: p.resultsRevealAt?.toISOString() ?? null,
      createdAt: p.createdAt.toISOString(),
      voteCount: p._count.votes,
    })),
  })
}

export async function PATCH(request: Request) {
  const auth = await requireAdmin()
  if (!auth.ok) return auth.response

  const limited = rateLimit(`admin:settings:${auth.user.id}`, {
    limit: 40,
    windowMs: 60_000,
  })
  if (!limited.ok) {
    return NextResponse.json(
      { error: 'Too many requests' },
      { status: 429, headers: { 'Retry-After': String(limited.retryAfterSec) } }
    )
  }

  try {
    const body = (await request.json()) as {
      maintenanceMode?: boolean
      maintenanceMessage?: string | null
      sectionMaintenance?: Record<
        string,
        { enabled: boolean; message: string }
      >
      announcementActive?: boolean
      announcementTitle?: string | null
      announcementBody?: string | null
    }

    const data: Record<string, unknown> = {}

    if (typeof body.maintenanceMode === 'boolean') {
      data.maintenanceMode = body.maintenanceMode
    }
    if (body.maintenanceMessage !== undefined) {
      data.maintenanceMessage =
        body.maintenanceMessage === null
          ? null
          : String(body.maintenanceMessage).slice(0, 1000)
    }
    if (body.sectionMaintenance && typeof body.sectionMaintenance === 'object') {
      const cleaned: Record<string, { enabled: boolean; message: string }> = {}
      const allowed = new Set(MAINTENANCE_SECTIONS.map((s) => s.key))
      for (const [key, val] of Object.entries(body.sectionMaintenance)) {
        if (!allowed.has(key as (typeof MAINTENANCE_SECTIONS)[number]['key'])) {
          continue
        }
        cleaned[key] = {
          enabled: !!val?.enabled,
          message: String(val?.message || '').slice(0, 500),
        }
      }
      data.sectionMaintenance = cleaned
    }
    if (typeof body.announcementActive === 'boolean') {
      data.announcementActive = body.announcementActive
      data.announcementUpdatedAt = new Date()
    }
    if (body.announcementTitle !== undefined) {
      data.announcementTitle =
        body.announcementTitle === null
          ? null
          : String(body.announcementTitle).slice(0, 200)
      data.announcementUpdatedAt = new Date()
    }
    if (body.announcementBody !== undefined) {
      data.announcementBody =
        body.announcementBody === null
          ? null
          : String(body.announcementBody).slice(0, 2000)
      data.announcementUpdatedAt = new Date()
    }

    await getSiteSettings()
    const settings = await prisma.siteSettings.update({
      where: { id: 'default' },
      data,
    })

    return NextResponse.json({
      settings: {
        ...settings,
        sectionMaintenance: parseSectionMaintenance(settings.sectionMaintenance),
        announcementUpdatedAt:
          settings.announcementUpdatedAt?.toISOString() ?? null,
        updatedAt: settings.updatedAt.toISOString(),
      },
    })
  } catch (error) {
    console.error('Admin settings PATCH error:', error)
    return NextResponse.json({ error: 'Failed to save settings' }, { status: 500 })
  }
}
