type Bucket = {
  count: number
  resetAt: number
}

const buckets = new Map<string, Bucket>()

const MAX_KEYS = 10_000

function pruneIfNeeded() {
  if (buckets.size < MAX_KEYS) return
  const now = Date.now()
  for (const [key, bucket] of buckets) {
    if (bucket.resetAt <= now) buckets.delete(key)
  }
  if (buckets.size < MAX_KEYS) return
  // Drop oldest half if still oversized (best-effort under memory pressure)
  let i = 0
  for (const key of buckets.keys()) {
    if (i++ % 2 === 0) buckets.delete(key)
  }
}

export type RateLimitResult =
  | { ok: true; remaining: number; resetAt: number }
  | { ok: false; remaining: 0; resetAt: number; retryAfterSec: number }

/**
 * Simple in-memory sliding fixed-window limiter.
 * Works per server instance (fine for single-node / warm serverless).
 */
export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number }
): RateLimitResult {
  pruneIfNeeded()
  const now = Date.now()
  const existing = buckets.get(key)

  if (!existing || existing.resetAt <= now) {
    const resetAt = now + opts.windowMs
    buckets.set(key, { count: 1, resetAt })
    return { ok: true, remaining: opts.limit - 1, resetAt }
  }

  if (existing.count >= opts.limit) {
    const retryAfterSec = Math.max(
      1,
      Math.ceil((existing.resetAt - now) / 1000)
    )
    return {
      ok: false,
      remaining: 0,
      resetAt: existing.resetAt,
      retryAfterSec,
    }
  }

  existing.count += 1
  return {
    ok: true,
    remaining: opts.limit - existing.count,
    resetAt: existing.resetAt,
  }
}

export function clientKey(request: Request): string {
  const forwarded = request.headers.get('x-forwarded-for')
  if (forwarded) return forwarded.split(',')[0]!.trim()
  return request.headers.get('x-real-ip') || 'unknown'
}
