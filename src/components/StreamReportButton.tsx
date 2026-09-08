'use client'

import { useState } from 'react'
import { AlertTriangle, CheckCircle2, Loader2, X } from 'lucide-react'
import toast from 'react-hot-toast'
import { playSound } from '@/lib/sound'

interface StreamReportButtonProps {
  tmdbId: number
  mediaType: string
  seasonNumber?: number
  episodeNumber?: number
  title: string
}

const ISSUE_TYPES = [
  { id: 'broken_video', label: 'Video will not load / black screen' },
  { id: 'buffering', label: 'Constant buffering / low speed' },
  { id: 'subtitles', label: 'Missing or out-of-sync subtitles' },
  { id: 'audio', label: 'Audio sync or no sound issue' },
  { id: 'wrong_content', label: 'Wrong episode or incorrect movie' },
]

export default function StreamReportButton({
  tmdbId,
  mediaType,
  seasonNumber,
  episodeNumber,
  title,
}: StreamReportButtonProps) {
  const [open, setOpen] = useState(false)
  const [issueType, setIssueType] = useState('broken_video')
  const [details, setDetails] = useState('')
  const [loading, setLoading] = useState(false)
  const [submitted, setSubmitted] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    playSound.click()
    setLoading(true)

    try {
      const res = await fetch('/api/reports', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          tmdbId,
          mediaType,
          seasonNumber,
          episodeNumber,
          issueType,
          details,
        }),
      })

      if (!res.ok) {
        const data = await res.json()
        throw new Error(data.error || 'Failed to submit report')
      }

      playSound.chime()
      setSubmitted(true)
      toast.success('Report submitted! Thank you.')
      setTimeout(() => {
        setOpen(false)
        setSubmitted(false)
        setDetails('')
      }, 1500)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Submission failed')
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          playSound.hover()
          setOpen(true)
        }}
        className="inline-flex items-center gap-1.5 rounded-lg border border-white/10 bg-white/5 px-3 py-1.5 text-xs text-zinc-400 transition hover:border-amber-500/40 hover:bg-amber-500/10 hover:text-amber-300"
        title="Report playback problem"
      >
        <AlertTriangle className="h-3.5 w-3.5 text-amber-400" />
        Report Issue
      </button>

      {open && (
        <div className="fixed inset-0 z-[150] flex items-center justify-center bg-black/75 p-4 backdrop-blur-sm">
          <div className="relative w-full max-w-md rounded-2xl border border-white/10 bg-zinc-950 p-6 shadow-2xl">
            <button
              type="button"
              onClick={() => setOpen(false)}
              className="absolute right-4 top-4 rounded-lg p-1 text-zinc-400 hover:bg-white/10 hover:text-white"
            >
              <X className="h-5 w-5" />
            </button>

            <div className="mb-4 flex items-center gap-2">
              <AlertTriangle className="h-5 w-5 text-amber-400" />
              <h2 className="font-semibold text-white">Report Video Problem</h2>
            </div>

            <p className="mb-4 text-xs text-zinc-400">
              Report playback issues for <span className="font-medium text-white">{title}</span>
              {seasonNumber != null && ` (S${seasonNumber}E${episodeNumber ?? 1})`}.
            </p>

            {submitted ? (
              <div className="py-8 text-center">
                <CheckCircle2 className="mx-auto mb-2 h-12 w-12 text-emerald-400" />
                <p className="font-semibold text-white">Report Received!</p>
                <p className="text-xs text-zinc-400">Our admin team has been notified.</p>
              </div>
            ) : (
              <form onSubmit={handleSubmit} className="space-y-4">
                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                    What is wrong?
                  </label>
                  <select
                    value={issueType}
                    onChange={(e) => setIssueType(e.target.value)}
                    className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm text-white outline-none focus:border-amber-500"
                  >
                    {ISSUE_TYPES.map((t) => (
                      <option key={t.id} value={t.id}>
                        {t.label}
                      </option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="mb-1.5 block text-xs font-medium text-zinc-300">
                    Additional details (optional)
                  </label>
                  <textarea
                    value={details}
                    onChange={(e) => setDetails(e.target.value)}
                    rows={3}
                    maxLength={500}
                    placeholder="Describe timestamp or error message..."
                    className="w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-xs text-white outline-none focus:border-amber-500"
                  />
                </div>

                <div className="flex justify-end gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setOpen(false)}
                    className="rounded-lg px-4 py-2 text-xs text-zinc-400 hover:text-white"
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    disabled={loading}
                    className="inline-flex items-center gap-1.5 rounded-lg bg-amber-500 px-4 py-2 text-xs font-bold text-black hover:bg-amber-400 disabled:opacity-50"
                  >
                    {loading && <Loader2 className="h-3.5 w-3.5 animate-spin" />}
                    Submit Report
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      )}
    </>
  )
}
