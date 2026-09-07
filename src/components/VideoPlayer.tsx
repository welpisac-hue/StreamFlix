'use client'

import { useMemo } from 'react'
import { getMovieEmbedUrl, getTVEmbedUrl } from '@/lib/embeds'

type MovieProps = {
  mediaType: 'movie'
  tmdbId: string | number
  title: string
  startAt?: number
}

type TVProps = {
  mediaType: 'tv'
  tmdbId: string | number
  title: string
  season: string | number
  episode: string | number
  startAt?: number
}

type VideoPlayerProps = MovieProps | TVProps

export default function VideoPlayer(props: VideoPlayerProps) {
  const embedUrl = useMemo(() => {
    const progress = props.startAt && props.startAt > 15 ? props.startAt : undefined
    if (props.mediaType === 'movie') {
      return getMovieEmbedUrl(props.tmdbId, { progress })
    }
    return getTVEmbedUrl(props.tmdbId, props.season, props.episode, {
      progress,
    })
  }, [props])

  return (
    <div className="relative overflow-hidden rounded-2xl border border-white/10 bg-black shadow-[0_24px_80px_rgba(0,0,0,0.55)]">
      <div className="aspect-video w-full">
        <iframe
          key={embedUrl}
          src={embedUrl}
          className="h-full w-full"
          allowFullScreen
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          referrerPolicy="origin"
          title={props.title}
        />
      </div>
    </div>
  )
}
