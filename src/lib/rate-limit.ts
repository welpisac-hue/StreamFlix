import { prisma } from '@/lib/prisma'

type Bucket = {
  count: number
  resetAt: number
}

/** L1 cache — same warm isolate only; Postgres is the source of truth on Vercel. */
const memory = new Map<string, Bucket>()
const MAX_KEYS = 5_000

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; remaining: 0; resetAt: number; retryAfterSec: number }

function pruneMemory() {
  if (memory.size < MAX_KEYS) return
  const now = Date.now()
  for (const [key, bucket] of memory) {
    if (bucket.resetAt <= now) memory.delete(key)
  }
  if (memory.size < MAX_KEYS) return
  let i = 0
  for (const key of memory.keys()) {
    if (i++ % 2 === 0) memory.delete(key)
  }
}

function memoryLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): RateLimitResult {
  pruneMemory()
  const now = Date.now()
  const existing = memory.get(key)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs
    memory.set(key, { count: 1, resetAt })
    return { ok: true, remaining: opts.limit - 1, resetAt }
  }

  if (existing.count >= opts.limit) {
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSec: Math.max(1, Math.ceil((existing.resetAt - now) / 1000)),
    }
  }

  existing.count += 1
  return {
    ok: true,
    remaining: opts.limit - existing.count,
    resetAt: existing.resetAt,
  }
}

/**
 * Durable fixed-window rate limit via Postgres (shared across Vercel instances).
 * Falls back to in-memory if the DB is unavailable.
 */
export async function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): Promise<RateLimitResult> {
  const now = Date.now()

  try {
    const existing = await prisma.rateLimitBucket.findUnique({ where: { key } })

    if (!existing || existing.resetAt.getTime() <= now) {
      const resetAt = new Date(now + opts.windowMs)
      await prisma.rateLimitBucket.upsert({
        where: { key },
        create: { key, count: 1, resetAt },
        update: { count: 1, resetAt },
      })
      memory.set(key, { count: 1, resetAt: resetAt.getTime() })
      return { ok: true, remaining: opts.limit - 1, resetAt: resetAt.getTime() }
    }

    if (existing.count >= opts.limit) {
      const resetAt = existing.resetAt.getTime()
      return {
        ok: false,
        remaining: 0,
        resetAt,
        retryAfterSec: Math.max(1, Math.ceil((resetAt - now) / 1000)),
      }
    }

    const updated = await prisma.rateLimitBucket.update({
      where: { key },
      data: { count: { increment: 1 } },
    })

    memory.set(key, {
      count: updated.count,
      resetAt: updated.resetAt.getTime(),
    })

    return {
      ok: true,
      remaining: Math.max(0, opts.limit - updated.count),
      resetAt: updated.resetAt.getTime(),
    }
  } catch {
    return memoryLimit(key, opts)
  }
}

/** Sync fallback for rare non-async call sites — memory only. Prefer `rateLimit`. */
export function rateLimitSync(
  key: string,
  opts: { limit: number; windowMs: number }
): RateLimitResult {
  return memoryLimit(key, opts)
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return request.headers.get('x-real-ip') || 'unknown'
}
