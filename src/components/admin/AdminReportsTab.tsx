'use client'

import { useCallback, useEffect, useState } from 'react'
import { AlertTriangle, CheckCircle, Clock, Loader2, XCircle } from 'lucide-react'
import toast from 'react-hot-toast'

type Report = {
  id: string
  tmdbId: number
  mediaType: string
  seasonNumber: number | null
  episodeNumber: number | null
  issueType: string
  details: string | null
  status: string
  createdAt: string
  user: { username: string } | null
}

export default function AdminReportsTab() {
  const [reports, setReports] = useState<Report[]>([])
  const [loading, setLoading] = useState(true)

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const res = await fetch('/api/admin/reports')
      if (!res.ok) throw new Error('Failed to load reports')
      const data = await res.json()
      setReports(data.reports || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const updateStatus = async (id: string, status: 'RESOLVED' | 'DISMISSED') => {
    try {
      const res = await fetch('/api/admin/reports', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ id, status }),
      })
      if (!res.ok) throw new Error('Update failed')
      toast.success(`Report ${status.toLowerCase()}`)
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Update failed')
    }
  }

  if (loading) {
    return (
      <div className="flex justify-center py-12 text-zinc-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading playback health reports…
      </div>
    )
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between">
        <div>
          <h2 className="flex items-center gap-2 font-semibold text-white">
            <AlertTriangle className="h-4 w-4 text-amber-400" />
            Playback Health Queue ({reports.filter((r) => r.status === 'PENDING').length} Pending)
          </h2>
          <p className="text-xs text-zinc-400">
            User-reported stream loading failures, subtitle sync issues, and broken player links.
          </p>
        </div>
        <button
          type="button"
          onClick={() => void load()}
          className="rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-300 hover:text-white"
        >
          Refresh Queue
        </button>
      </div>

      <div className="overflow-x-auto rounded-xl border border-white/10">
        <table className="min-w-full text-left text-sm">
          <thead className="bg-zinc-950 text-xs uppercase tracking-wide text-zinc-500">
            <tr>
              <th className="px-4 py-3">Content</th>
              <th className="px-4 py-3">Issue</th>
              <th className="px-4 py-3">Details</th>
              <th className="px-4 py-3">Reported By</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Actions</th>
            </tr>
          </thead>
          <tbody>
            {reports.length === 0 ? (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-zinc-500">
                  No playback reports in queue. Everything is running healthy!
                </td>
              </tr>
            ) : (
              reports.map((r) => (
                <tr key={r.id} className="border-t border-white/5 odd:bg-white/[0.02]">
                  <td className="px-4 py-3">
                    <span className="font-semibold text-white">TMDB #{r.tmdbId}</span>
                    <span className="ml-2 rounded bg-white/10 px-1.5 py-0.5 text-[10px] uppercase text-zinc-300">
                      {r.mediaType}
                      {r.seasonNumber != null && ` S${r.seasonNumber}E${r.episodeNumber ?? 1}`}
                    </span>
                  </td>
                  <td className="px-4 py-3 font-medium text-amber-300">{r.issueType}</td>
                  <td className="max-w-xs truncate px-4 py-3 text-xs text-zinc-400">
                    {r.details || '—'}
                  </td>
                  <td className="px-4 py-3 text-xs text-zinc-400">
                    {r.user ? `@${r.user.username}` : 'Anonymous'}
                  </td>
                  <td className="px-4 py-3">
                    <span
                      className={`rounded px-2 py-0.5 text-xs font-semibold ${
                        r.status === 'RESOLVED'
                          ? 'bg-emerald-500/20 text-emerald-300'
                          : r.status === 'DISMISSED'
                            ? 'bg-zinc-700 text-zinc-400'
                            : 'bg-amber-500/20 text-amber-300'
                      }`}
                    >
                      {r.status}
                    </span>
                  </td>
                  <td className="px-4 py-3">
                    {r.status === 'PENDING' && (
                      <div className="flex items-center gap-2">
                        <button
                          type="button"
                          onClick={() => updateStatus(r.id, 'RESOLVED')}
                          className="inline-flex items-center gap-1 rounded bg-emerald-600/20 px-2 py-1 text-xs text-emerald-300 hover:bg-emerald-600/30"
                          title="Mark Fixed"
                        >
                          <CheckCircle className="h-3.5 w-3.5" /> Fix
                        </button>
                        <button
                          type="button"
                          onClick={() => updateStatus(r.id, 'DISMISSED')}
                          className="inline-flex items-center gap-1 rounded bg-white/10 px-2 py-1 text-xs text-zinc-300 hover:bg-white/20"
                          title="Dismiss"
                        >
                          <XCircle className="h-3.5 w-3.5" /> Dismiss
                        </button>
                      </div>
                    )}
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
