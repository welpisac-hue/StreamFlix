import { NextRequest, NextResponse } from 'next/server'

export async function GET(req: NextRequest) {
  const { searchParams } = new URL(req.url)
  const tmdbId = searchParams.get('tmdbId')
  const season = searchParams.get('season') || '1'
  const episode = searchParams.get('episode') || '1'
  const mediaType = searchParams.get('mediaType')

  // Movies never have TV episode intros
  if (mediaType === 'movie' || !tmdbId) {
    return NextResponse.json({ hasIntro: false, duration: 0 })
  }

  try {
    // 1. Try AniSkip API if anilist / anime mapping exists or search AniSkip
    // AniSkip endpoint: https://api.aniskip.com/v2/skip-times/{id}/{episode}?types=op
    // We can also query AniSkip with tmdbId if mapped or fallback
    let introDuration = 85
    let hasIntro = true

    // Check TMDB episode details to verify episode exists and duration
    const apiKey = process.env.TMDB_API_KEY
    if (apiKey) {
      const tmdbRes = await fetch(
        `https://api.themoviedb.org/3/tv/${tmdbId}/season/${season}/episode/${episode}?api_key=${apiKey}`
      )
      if (tmdbRes.ok) {
        const epData = await tmdbRes.json()
        // If episode runtime is under 5 minutes, it likely doesn't have a standard intro
        if (epData.runtime && epData.runtime < 5) {
          hasIntro = false
          introDuration = 0
        }
      }
    }

    // Attempt AniSkip lookup for anime/shows if anilistId is available or via search
    try {
      const aniSkipRes = await fetch(
        `https://api.aniskip.com/v2/skip-times/${tmdbId}/${episode}?types=op`
      )
      if (aniSkipRes.ok) {
        const aniData = await aniSkipRes.json()
        if (aniData.found && Array.isArray(aniData.results) && aniData.results.length > 0) {
          const op = aniData.results[0]
          if (op.interval && typeof op.interval.end === 'number' && typeof op.interval.start === 'number') {
            const calculatedDuration = Math.round(op.interval.end - op.interval.start)
            if (calculatedDuration > 10 && calculatedDuration < 180) {
              introDuration = calculatedDuration
              hasIntro = true
            }
          }
        }
      }
    } catch {
      // Ignore AniSkip errors and fallback to TMDB check
    }

    return NextResponse.json({
      hasIntro,
      duration: introDuration,
    })
  } catch (err) {
    console.error('Error fetching intro info:', err)
    return NextResponse.json({ hasIntro: true, duration: 85 })
  }
}
