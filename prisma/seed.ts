import { PrismaClient } from '@prisma/client'

const prisma = new PrismaClient()

async function main() {
  // Wipe all app data (order respects FKs via cascade where possible)
  await prisma.pageView.deleteMany()
  await prisma.inviteRedemption.deleteMany()
  await prisma.inviteCode.deleteMany()
  await prisma.review.deleteMany()
  await prisma.watchLater.deleteMany()
  await prisma.watchHistory.deleteMany()
  await prisma.userPreferences.deleteMany()
  await prisma.session.deleteMany()
  await prisma.account.deleteMany()
  await prisma.verificationToken.deleteMany()
  await prisma.user.deleteMany()

  await prisma.inviteCode.create({
    data: {
      code: 'WILLCHANGE',
      kind: 'ADMIN',
      maxUses: 1,
      usedCount: 0,
      isActive: true,
      grantsAdmin: true,
      note: 'Bootstrap admin invite — first registrant owns the dashboard',
    },
  })

  console.log('Database reset complete.')
  console.log('Seeded invite code: WILLCHANGE (1 use, grants ADMIN)')
}

main()
  .catch((error) => {
    console.error(error)
    process.exit(1)
  })
  .finally(async () => {
    await prisma.$disconnect()
  })
