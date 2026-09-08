import { NextResponse } from 'next/server'
import axios from 'axios'

const TMDB_BASE_URL = 'https://api.themoviedb.org/3'
const TMDB_API_KEY = process.env.TMDB_API_KEY?.trim()
const isV4Token = !!TMDB_API_KEY && TMDB_API_KEY.startsWith('eyJ')

const tmdbApi = axios.create({
  baseURL: TMDB_BASE_URL,
  ...(isV4Token
    ? {
        headers: {
          Authorization: `Bearer ${TMDB_API_KEY}`,
          Accept: 'application/json',
        },
      }
    : {
        params: {
          api_key: TMDB_API_KEY,
        },
      }),
})

export async function GET(
  request: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params
    const personId = parseInt(id, 10)
    if (!Number.isFinite(personId) || personId <= 0) {
      return NextResponse.json({ error: 'Invalid person id' }, { status: 400 })
    }

    const [detailsRes, creditsRes] = await Promise.all([
      tmdbApi.get(`/person/${personId}`),
      tmdbApi.get(`/person/${personId}/combined_credits`),
    ])

    const details = detailsRes.data
    const credits = creditsRes.data

    // Filter and sort credits by popularity
    const castWorks = (credits.cast || [])
      .filter((item: any) => item.poster_path && (item.title || item.name))
      .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 30)

    const crewWorks = (credits.crew || [])
      .filter((item: any) => item.poster_path && (item.title || item.name))
      .sort((a: any, b: any) => (b.popularity || 0) - (a.popularity || 0))
      .slice(0, 20)

    return NextResponse.json({
      person: {
        id: details.id,
        name: details.name,
        biography: details.biography,
        profile_path: details.profile_path,
        birthday: details.birthday,
        place_of_birth: details.place_of_birth,
        known_for_department: details.known_for_department,
      },
      castWorks,
      crewWorks,
    })
  } catch (error) {
    console.error('Error fetching person details:', error)
    return NextResponse.json({ error: 'Failed to fetch person details' }, { status: 500 })
  }
}
