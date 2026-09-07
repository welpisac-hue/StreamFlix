import { randomBytes } from 'crypto'

const DAY_MS = 24 * 60 * 60 * 1000

/** Users who joined via a FRIEND invite must wait this long before their first code. */
export const FRIEND_INVITED_FIRST_WAIT_MS = 30 * DAY_MS

/**
 * Cooldown before the next friend-invite can be created, based on how many
 * friends have already redeemed this user's invites.
 *
 * 0 redeemed → first code available immediately (unless friend-invited gate applies)
 * 1 → 30 days
 * 2 → 14 days
 * 3 → 7 days
 * 4 → 4 days
 * 5+ → 2 days (floor)
 */
export function friendInviteCooldownMs(redeemedCount: number): number {
  const n = Math.max(0, Math.floor(redeemedCount))
  if (n <= 0) return 0
  if (n === 1) return 30 * DAY_MS
  if (n === 2) return 14 * DAY_MS
  if (n === 3) return 7 * DAY_MS
  if (n === 4) return 4 * DAY_MS
  return 2 * DAY_MS
}

export type InviteAvailabilityInput = {
  createdCount: number
  redeemedCount: number
  lastCreatedAt: Date | null
  /** True when this user signed up by redeeming a FRIEND invite. */
  wasFriendInvited: boolean
  /** When the user redeemed their invite (fallback: account createdAt). */
  joinedAt: Date
}

/**
 * Resolve when the user may create another friend invite.
 * Friend-invited accounts cannot generate their first invite for 30 days.
 */
export function resolveInviteAvailability(input: InviteAvailabilityInput): {
  nextAvailableAt: Date | null
  remainingMs: number
  firstInviteGate: boolean
} {
  const candidates: Date[] = []
  let firstInviteGate = false

  if (input.wasFriendInvited && input.createdCount === 0) {
    firstInviteGate = true
    candidates.push(
      new Date(input.joinedAt.getTime() + FRIEND_INVITED_FIRST_WAIT_MS)
    )
  }

  const cooldownMs = friendInviteCooldownMs(input.redeemedCount)
  if (input.lastCreatedAt && cooldownMs > 0) {
    candidates.push(new Date(input.lastCreatedAt.getTime() + cooldownMs))
  }

  if (candidates.length === 0) {
    return { nextAvailableAt: null, remainingMs: 0, firstInviteGate }
  }

  const nextAvailableAt = new Date(
    Math.max(...candidates.map((d) => d.getTime()))
  )
  const remainingMs = Math.max(0, nextAvailableAt.getTime() - Date.now())
  return { nextAvailableAt, remainingMs, firstInviteGate }
}

export function formatCooldownDuration(ms: number): string {
  if (ms <= 0) return 'available now'
  const days = Math.round(ms / DAY_MS)
  if (days >= 30) return '30 days'
  if (days === 1) return '1 day'
  return `${days} days`
}

export function formatRemaining(ms: number): string {
  if (ms <= 0) return 'available now'
  const totalMinutes = Math.ceil(ms / (60 * 1000))
  if (totalMinutes < 60) return `${totalMinutes}m`
  const totalHours = Math.ceil(ms / (60 * 60 * 1000))
  if (totalHours < 48) return `${totalHours}h`
  const days = Math.ceil(ms / DAY_MS)
  return `${days} day${days === 1 ? '' : 's'}`
}

export function nextCooldownPreview(redeemedCount: number): string {
  // After this redemption lands, what will the next wait be?
  return formatCooldownDuration(friendInviteCooldownMs(redeemedCount))
}

export function generateFriendInviteCode(username: string): string {
  const prefix = username
    .replace(/[^a-zA-Z0-9]/g, '')
    .slice(0, 4)
    .toUpperCase()
    .padEnd(2, 'X')
  const alphabet = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789'
  const bytes = randomBytes(8)
  let rand = ''
  for (let i = 0; i < 8; i++) {
    rand += alphabet[bytes[i]! % alphabet.length]
  }
  return `${prefix}-${rand}`
}
