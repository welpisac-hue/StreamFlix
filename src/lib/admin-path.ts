/**
 * Optional obscured admin URL.
 * Set NEXT_PUBLIC_ADMIN_PATH (and ADMIN_PATH to the same value) in .env
 * e.g. ops-console-7f3a — client links use /{slug}; next.config rewrites to /admin.
 * On Cloudflare, middleware must still allow /admin for admins (rewrite destination).
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
