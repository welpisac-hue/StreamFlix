/**
 * One-time cleanup before applying WatchHistory @@unique.
 * Run: npx tsx prisma/dedupe-watch-history.ts
 * Then: npx prisma db push
 */
import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Normalize nulls → 0 so unique index can apply
  await prisma.$executeRawUnsafe(`
    UPDATE "WatchHistory"
    SET "seasonNumber" = 0
    WHERE "seasonNumber" IS NULL
  `)
  await prisma.$executeRawUnsafe(`
    UPDATE "WatchHistory"
    SET "episodeNumber" = 0
    WHERE "episodeNumber" IS NULL
  `)

  const rows = await prisma.watchHistory.findMany({
    orderBy: { lastWatched: 'desc' },
  })

  const seen = new Set<string>()
  const deleteIds: string[] = []

  for (const row of rows) {
    const key = [
      row.userId,
      row.tmdbId,
      row.mediaType,
      row.seasonNumber ?? 0,
      row.episodeNumber ?? 0,
    ].join(':')
    if (seen.has(key)) {
      deleteIds.push(row.id)
    } else {
      seen.add(key)
    }
  }

  if (deleteIds.length > 0) {
    // Batch deletes
    const chunk = 100
    for (let i = 0; i < deleteIds.length; i += chunk) {
      await prisma.watchHistory.deleteMany({
        where: { id: { in: deleteIds.slice(i, i + chunk) } },
      })
    }
  }

  console.log(
    `Normalized nulls; removed ${deleteIds.length} duplicate WatchHistory row(s).`
  )
}

main()
  .catch((e) => {
    console.error(e)
    process.exit(1)
  })
  .finally(() => prisma.$disconnect())
