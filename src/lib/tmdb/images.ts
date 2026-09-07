export function getImageUrl(path: string | null | undefined, size: string = 'original') {
  return path ? `https://image.tmdb.org/t/p/${size}${path}` : '/placeholder.svg'
}
