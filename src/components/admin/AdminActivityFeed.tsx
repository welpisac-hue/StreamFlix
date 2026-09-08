'use client'

import { useState, useEffect } from 'react'
import { Activity, Film, Heart, Star, UserPlus, AlertTriangle, Users, Loader2 } from 'lucide-react'

interface ActivityItem {
  id: string
  type: 'signup' | 'review' | 'report' | 'party' | 'watch'
  user: string
  title: string
  time: string
  timestamp: string
}

function formatRelativeTime(dateStr: string): string {
  const diffMs = Date.now() - new Date(dateStr).getTime()
  const diffSec = Math.floor(diffMs / 1000)
  if (diffSec < 60) return 'Just now'
  const diffMin = Math.floor(diffSec / 60)
  if (diffMin < 60) return `${diffMin}m ago`
  const diffHr = Math.floor(diffMin / 60)
  if (diffHr < 24) return `${diffHr}h ago`
  const diffDays = Math.floor(diffHr / 24)
  return `${diffDays}d ago`
}

export default function AdminActivityFeed() {
  const [activities, setActivities] = useState<ActivityItem[]>([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    async function loadActivity() {
      try {
        const res = await fetch('/api/admin/activity')
        if (res.ok) {
          const data = await res.json()
          setActivities(data.activities || [])
        }
      } catch (err) {
        console.error('Activity load error:', err)
      } finally {
        setLoading(false)
      }
    }
    loadActivity()
  }, [])

  const getIconAndColor = (type: string) => {
    switch (type) {
      case 'signup':
        return { Icon: UserPlus, color: 'text-emerald-400' }
      case 'review':
        return { Icon: Star, color: 'text-amber-400' }
      case 'report':
        return { Icon: AlertTriangle, color: 'text-red-400' }
      case 'party':
        return { Icon: Users, color: 'text-purple-400' }
      case 'watch':
      default:
        return { Icon: Film, color: 'text-sky-400' }
    }
  }

  return (
    <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-5">
      <h2 className="mb-4 flex items-center gap-2 font-semibold text-white">
        <Activity className="h-4 w-4 text-emerald-400 animate-pulse" />
        Live Real-time Activity Feed
      </h2>

      {loading ? (
        <div className="flex items-center justify-center py-8 text-zinc-500">
          <Loader2 className="h-5 w-5 animate-spin mr-2" />
          Fetching live activity...
        </div>
      ) : activities.length === 0 ? (
        <p className="text-center py-6 text-xs text-zinc-500">No recent activity logged.</p>
      ) : (
        <div className="space-y-2.5">
          {activities.map((act) => {
            const { Icon, color } = getIconAndColor(act.type)
            return (
              <div
                key={act.id}
                className="flex items-center justify-between gap-3 rounded-lg bg-white/5 px-3.5 py-2 text-xs backdrop-blur"
              >
                <div className="flex items-center gap-2.5 min-w-0">
                  <Icon className={`h-4 w-4 shrink-0 ${color}`} />
                  <div className="truncate">
                    <span className="font-semibold text-white">@{act.user}</span>{' '}
                    <span className="text-zinc-400">{act.title}</span>
                  </div>
                </div>
                <span className="shrink-0 text-[10px] text-zinc-500">
                  {formatRelativeTime(act.time)}
                </span>
              </div>
            )
          })}
        </div>
      )}
    </section>
  )
}
