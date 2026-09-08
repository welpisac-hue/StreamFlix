import 'server-only'
import { PrismaClient } from '@prisma/client'
import { PrismaPg } from '@prisma/adapter-pg'
import { Pool } from 'pg'

const globalForPrisma = globalThis as unknown as {
  prisma: PrismaClient | undefined
}

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL
  if (!connectionString) {
    throw new Error('DATABASE_URL is not set')
  }

  // maxUses: 1 avoids sticky TCP pools on Cloudflare Workers
  // ssl: { rejectUnauthorized: false } ensures Supabase / Cloud TLS handshakes succeed
  const pool = new Pool({
    connectionString,
    maxUses: 1,
    ssl: { rejectUnauthorized: false },
  })

  const adapter = new PrismaPg(pool)

  return new PrismaClient({ adapter })
}

/**
 * Local `next dev`: reuse one client.
 * Cloudflare Workers: create per access so connections are not reused across requests.
 */
function getClient() {
  const onWorkers =
    typeof process !== 'undefined' &&
    (process.env.NEXTJS_ENV === 'production' ||
      process.env.CF_PAGES === '1' ||
      !!process.env.CF_WORKER)

  if (!onWorkers && process.env.NODE_ENV !== 'production') {
    globalForPrisma.prisma ??= createPrismaClient()
    return globalForPrisma.prisma
  }

  // Production / Workers: still allow a process-local singleton on Node hosts;
  // Workers isolates are short-lived and maxUses:1 keeps pools safe.
  globalForPrisma.prisma ??= createPrismaClient()
  return globalForPrisma.prisma
}

export const prisma = new Proxy({} as PrismaClient, {
  get(_target, prop, receiver) {
    const client = getClient()
    const value = Reflect.get(client as object, prop, receiver)
    return typeof value === 'function'
      ? (value as (...args: unknown[]) => unknown).bind(client)
      : value
  },
})
