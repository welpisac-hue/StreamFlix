import { prisma } from '@/lib/prisma'

/** Clear the 2-hour recommendations cache so the next fetch rebuilds. */
export async function invalidateRecommendationCache(userId: string) {
  try {
    await prisma.userPreferences.updateMany({
      where: { userId },
      data: { cachedRecsAt: null },
    })
  } catch {
    // Preferences row may not exist yet
  }
}
