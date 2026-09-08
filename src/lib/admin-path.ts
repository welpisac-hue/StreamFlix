/**
 * Optional obscured admin URL.
 * Set NEXT_PUBLIC_ADMIN_PATH (and ADMIN_PATH to the same value) in .env
 * e.g. ops-console-7f3a — client links use /{slug}; next.config rewrites to /admin.
 *
 * On Vercel production, an obscured path is required — plain /admin is blocked
 * when ADMIN_PATH is unset so the dashboard URL is not guessable.
 */
export function getAdminPath(): string {
  const raw = (
    process.env.NEXT_PUBLIC_ADMIN_PATH ||
    process.env.ADMIN_PATH ||
    ''
  )
    .trim()
    .replace(/^\/+|\/+$/g, '')
  if (!raw || raw === 'admin') return '/admin'
  return `/${raw}`
}

export function isObscuredAdminPath(): boolean {
  return getAdminPath() !== '/admin'
}

/** True when production is missing a non-default ADMIN_PATH. */
export function isAdminPathMisconfigured(): boolean {
  if (process.env.NODE_ENV !== 'production') return false
  return !isObscuredAdminPath()
}
