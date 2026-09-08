/** Strip episode/season suffixes from watch-history titles. */
export function cleanMediaTitle(title: string): string {
  if (!title) return ''
  return title
    .replace(/\s*[–—:-]?\s*S\d+\s*E\d+.*$/i, '')
    .replace(/\s*[–—:-]?\s*Season\s+\d+.*$/i, '')
    .replace(/\s*[–—:-]?\s*EP(?:isode)?\s*\d+.*$/i, '')
    .replace(/\s+[Ee]\d+\b.*$/, '')
    .trim()
}
