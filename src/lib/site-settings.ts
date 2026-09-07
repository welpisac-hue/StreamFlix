export const MAINTENANCE_SECTIONS = [
  {
    key: 'movies_browse',
    label: 'Movies browse',
    paths: ['/movies'],
    navHrefs: ['/movies'],
  },
  {
    key: 'tv_browse',
    label: 'TV browse',
    paths: ['/tv'],
    navHrefs: ['/tv'],
  },
  {
    key: 'anime_browse',
    label: 'Anime browse',
    paths: ['/anime/browse'],
    navHrefs: ['/anime/browse'],
  },
  {
    key: 'my_list',
    label: 'My List (movies)',
    paths: ['/my-list'],
    navHrefs: ['/my-list'],
  },
  {
    key: 'anime_my_list',
    label: 'My List (anime)',
    paths: ['/anime/my-list'],
    navHrefs: ['/anime/my-list'],
  },
  {
    key: 'continue',
    label: 'Continue Watching',
    paths: ['/continue-watching', '/anime/continue-watching'],
    navHrefs: ['/continue-watching', '/anime/continue-watching'],
  },
  {
    key: 'search',
    label: 'Search',
    paths: ['/search'],
    navHrefs: ['/search'],
  },
] as const

export type MaintenanceSectionKey = (typeof MAINTENANCE_SECTIONS)[number]['key']

export type SectionMaintenanceState = Partial<
  Record<MaintenanceSectionKey, { enabled: boolean; message: string }>
>

/** Legacy keys that used to lock home pages — home is full-site maintenance only. */
const LEGACY_HOME_KEYS = new Set(['movies_home', 'anime_home'])

export function defaultSectionMaintenance(): SectionMaintenanceState {
  return {}
}

export function parseSectionMaintenance(
  value: unknown
): SectionMaintenanceState {
  if (!value || typeof value !== 'object') return {}
  const allowed = new Set(MAINTENANCE_SECTIONS.map((s) => s.key))
  const cleaned: SectionMaintenanceState = {}
  for (const [key, val] of Object.entries(
    value as Record<string, { enabled?: boolean; message?: string }>
  )) {
    if (LEGACY_HOME_KEYS.has(key)) continue
    if (!allowed.has(key as MaintenanceSectionKey)) continue
    cleaned[key as MaintenanceSectionKey] = {
      enabled: !!val?.enabled,
      message: String(val?.message || ''),
    }
  }
  return cleaned
}

export function getSectionForPath(
  pathname: string
): (typeof MAINTENANCE_SECTIONS)[number] | null {
  const normalized = pathname.split('?')[0] || '/'
  const matches = MAINTENANCE_SECTIONS.filter((s) =>
    s.paths.some(
      (p) => normalized === p || normalized.startsWith(`${p}/`)
    )
  )
  if (matches.length === 0) return null
  return matches.sort(
    (a, b) =>
      Math.max(...b.paths.map((p) => p.length)) -
      Math.max(...a.paths.map((p) => p.length))
  )[0]!
}

/** Resolve which section owns a navbar href (exact match preferred). */
export function getSectionForNavHref(
  href: string
): (typeof MAINTENANCE_SECTIONS)[number] | null {
  const normalized = href.split('?')[0] || '/'
  // Never lock home routes via section maintenance
  if (normalized === '/' || normalized === '/anime') return null
  const byNav = MAINTENANCE_SECTIONS.find(
    (s) =>
      (s.navHrefs as readonly string[]).includes(normalized) ||
      (s.paths as readonly string[]).includes(normalized)
  )
  if (byNav) return byNav
  return getSectionForPath(normalized)
}
