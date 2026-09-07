import 'server-only'
import { prisma } from '@/lib/prisma'
import { defaultSectionMaintenance } from '@/lib/site-settings'

export { parseSectionMaintenance } from '@/lib/site-settings'

export async function getSiteSettings() {
  const existing = await prisma.siteSettings.findUnique({
    where: { id: 'default' },
  })
  if (existing) return existing

  return prisma.siteSettings.create({
    data: {
      id: 'default',
      sectionMaintenance: defaultSectionMaintenance(),
    },
  })
}
