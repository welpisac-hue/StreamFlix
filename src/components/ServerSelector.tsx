'use client'

import { Server } from 'lucide-react'
import { playSound } from '@/lib/sound'
import type { ServerProvider } from '@/lib/embeds'

interface ServerSelectorProps {
  provider: ServerProvider
  onChange: (provider: ServerProvider) => void
  className?: string
}

const PROVIDERS: { id: ServerProvider; label: string }[] = [
  { id: 'vidcore', label: 'VidCore' },
  { id: 'cinesrc', label: 'CineSrc' },
]

export default function ServerSelector({ provider, onChange, className }: ServerSelectorProps) {
  return (
    <div className={`inline-flex items-center gap-1.5 ${className ?? ''}`}>
      <Server className="h-3.5 w-3.5 text-zinc-500" />
      <div className="inline-flex rounded-lg border border-white/10 bg-white/5 p-1">
        {PROVIDERS.map((p) => (
          <button
            key={p.id}
            type="button"
            onClick={() => {
              if (p.id === provider) return
              playSound.click()
              onChange(p.id)
            }}
            className={`rounded-md px-3 py-1 text-xs font-semibold transition ${
              provider === p.id
                ? 'bg-[var(--primary)] text-white'
                : 'text-zinc-400 hover:text-white'
            }`}
          >
            {p.label}
          </button>
        ))}
      </div>
    </div>
  )
}
