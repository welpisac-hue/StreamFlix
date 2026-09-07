'use client'

import { useCallback, useEffect, useState } from 'react'
import {
  Loader2,
  Megaphone,
  Plus,
  Settings,
  Trash2,
  Wrench,
} from 'lucide-react'
import toast from 'react-hot-toast'
import type { SectionMaintenanceState } from '@/lib/site-settings'

type SectionMeta = { key: string; label: string }

type SettingsState = {
  maintenanceMode: boolean
  maintenanceMessage: string | null
  sectionMaintenance: SectionMaintenanceState
  announcementActive: boolean
  announcementTitle: string | null
  announcementBody: string | null
}

type PollRow = {
  id: string
  question: string
  options: string[]
  isActive: boolean
  endsAt: string | null
  resultsRevealAt: string | null
  createdAt: string
  voteCount: number
  counts?: number[]
}

function toLocalInput(iso: string | null) {
  if (!iso) return ''
  const d = new Date(iso)
  const pad = (n: number) => String(n).padStart(2, '0')
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`
}

export default function AdminSettingsTab() {
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [settings, setSettings] = useState<SettingsState | null>(null)
  const [sections, setSections] = useState<SectionMeta[]>([])
  const [polls, setPolls] = useState<PollRow[]>([])
  const [pollQuestion, setPollQuestion] = useState('')
  const [pollOptions, setPollOptions] = useState('Yes\nNo')
  const [pollEndsAt, setPollEndsAt] = useState('')
  const [pollRevealAt, setPollRevealAt] = useState('')

  const load = useCallback(async () => {
    setLoading(true)
    try {
      const [sRes, pRes] = await Promise.all([
        fetch('/api/admin/settings', { cache: 'no-store' }),
        fetch('/api/admin/polls', { cache: 'no-store' }),
      ])
      if (!sRes.ok || !pRes.ok) throw new Error('Failed to load settings')
      const sData = await sRes.json()
      const pData = await pRes.json()
      setSettings({
        maintenanceMode: !!sData.settings.maintenanceMode,
        maintenanceMessage: sData.settings.maintenanceMessage,
        sectionMaintenance: sData.settings.sectionMaintenance || {},
        announcementActive: !!sData.settings.announcementActive,
        announcementTitle: sData.settings.announcementTitle,
        announcementBody: sData.settings.announcementBody,
      })
      setSections(sData.sections || [])
      setPolls(pData.polls || [])
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Load failed')
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    void load()
  }, [load])

  const saveSettings = async (
    next: SettingsState,
    successMessage = 'Settings saved'
  ) => {
    setSaving(true)
    try {
      const res = await fetch('/api/admin/settings', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          maintenanceMode: next.maintenanceMode,
          maintenanceMessage: next.maintenanceMessage,
          sectionMaintenance: next.sectionMaintenance,
          announcementActive: next.announcementActive,
          announcementTitle: next.announcementTitle,
          announcementBody: next.announcementBody,
        }),
        cache: 'no-store',
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Save failed')
      setSettings({
        maintenanceMode: !!data.settings.maintenanceMode,
        maintenanceMessage: data.settings.maintenanceMessage,
        sectionMaintenance: data.settings.sectionMaintenance || {},
        announcementActive: !!data.settings.announcementActive,
        announcementTitle: data.settings.announcementTitle,
        announcementBody: data.settings.announcementBody,
      })
      // Tell the live site overlay to re-fetch immediately
      window.dispatchEvent(new Event('streamflix:site-refresh'))
      toast.success(successMessage)
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Save failed')
      // Reload from server so UI matches DB after a failed/ambiguous save
      await load()
    } finally {
      setSaving(false)
    }
  }

  const createPoll = async (e: React.FormEvent) => {
    e.preventDefault()
    const options = pollOptions
      .split('\n')
      .map((o) => o.trim())
      .filter(Boolean)
    try {
      const res = await fetch('/api/admin/polls', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          question: pollQuestion,
          options,
          endsAt: pollEndsAt ? new Date(pollEndsAt).toISOString() : null,
          resultsRevealAt: pollRevealAt
            ? new Date(pollRevealAt).toISOString()
            : null,
        }),
      })
      const data = await res.json()
      if (!res.ok) throw new Error(data.error || 'Create failed')
      toast.success('Poll created')
      setPollQuestion('')
      setPollOptions('Yes\nNo')
      setPollEndsAt('')
      setPollRevealAt('')
      await load()
    } catch (err) {
      toast.error(err instanceof Error ? err.message : 'Create failed')
    }
  }

  if (loading || !settings) {
    return (
      <div className="flex items-center justify-center py-16 text-zinc-500">
        <Loader2 className="mr-2 h-5 w-5 animate-spin" />
        Loading settings…
      </div>
    )
  }

  return (
    <div className="space-y-8">
      <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <Wrench className="h-4 w-4 text-orange-400" />
          Full site maintenance
        </h2>
        <label className="flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.maintenanceMode}
            disabled={saving}
            onChange={(e) => {
              const next = {
                ...settings,
                maintenanceMode: e.target.checked,
              }
              setSettings(next)
              void saveSettings(
                next,
                e.target.checked
                  ? 'Maintenance mode enabled'
                  : 'Maintenance mode disabled'
              )
            }}
            className="h-4 w-4"
          />
          Enable maintenance mode (blocks all non-admin use)
          {settings.maintenanceMode && (
            <span className="rounded bg-orange-500/20 px-2 py-0.5 text-xs font-semibold text-orange-300">
              ON
            </span>
          )}
        </label>
        <textarea
          value={settings.maintenanceMessage || ''}
          onChange={(e) =>
            setSettings({ ...settings, maintenanceMessage: e.target.value })
          }
          rows={2}
          placeholder="Custom maintenance message"
          className="mt-3 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
        />
        <button
          type="button"
          disabled={saving}
          onClick={() => void saveSettings(settings, 'Maintenance message saved')}
          className="mt-3 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold disabled:opacity-50"
        >
          Save message
        </button>
      </section>

      <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-5">
        <h2 className="mb-2 flex items-center gap-2 font-semibold">
          <Settings className="h-4 w-4 text-sky-400" />
          Section maintenance
        </h2>
        <p className="mb-4 text-sm text-zinc-500">
          Grey out / lock individual areas with a custom reason. Home pages
          stay open — use full-site maintenance to block those.
        </p>
        <div className="space-y-3">
          {sections.map((s) => {
            const entry = settings.sectionMaintenance[s.key as keyof SectionMaintenanceState] || {
              enabled: false,
              message: '',
            }
            return (
              <div
                key={s.key}
                className="rounded-lg border border-white/10 bg-black/30 p-3"
              >
                <label className="flex items-center gap-3 text-sm font-medium">
                  <input
                    type="checkbox"
                    checked={!!entry.enabled}
                    disabled={saving}
                    onChange={(e) => {
                      const next = {
                        ...settings,
                        sectionMaintenance: {
                          ...settings.sectionMaintenance,
                          [s.key]: {
                            enabled: e.target.checked,
                            message: entry.message || '',
                          },
                        },
                      }
                      setSettings(next)
                      void saveSettings(
                        next,
                        e.target.checked
                          ? `${s.label} locked`
                          : `${s.label} unlocked`
                      )
                    }}
                  />
                  {s.label}
                  {entry.enabled && (
                    <span className="rounded bg-sky-500/20 px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wide text-sky-300">
                      Locked
                    </span>
                  )}
                </label>
                <input
                  value={entry.message || ''}
                  onChange={(e) =>
                    setSettings({
                      ...settings,
                      sectionMaintenance: {
                        ...settings.sectionMaintenance,
                        [s.key]: {
                          enabled: !!entry.enabled,
                          message: e.target.value,
                        },
                      },
                    })
                  }
                  onBlur={(e) => {
                    if (!entry.enabled) return
                    const next = {
                      ...settings,
                      sectionMaintenance: {
                        ...settings.sectionMaintenance,
                        [s.key]: {
                          enabled: true,
                          message: e.target.value,
                        },
                      },
                    }
                    setSettings(next)
                    void saveSettings(next, 'Section message saved')
                  }}
                  placeholder="Why this section is locked"
                  className="mt-2 w-full rounded-lg border border-white/10 bg-zinc-900 px-3 py-2 text-sm outline-none"
                />
              </div>
            )
          })}
        </div>
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            void saveSettings(settings, 'Section locks saved')
          }
          className="mt-4 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold"
        >
          Save section locks
        </button>
      </section>

      <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <Megaphone className="h-4 w-4 text-red-400" />
          Site announcement
        </h2>
        <label className="mb-3 flex items-center gap-3 text-sm">
          <input
            type="checkbox"
            checked={settings.announcementActive}
            onChange={(e) =>
              setSettings({
                ...settings,
                announcementActive: e.target.checked,
              })
            }
          />
          Show announcement banner
        </label>
        <input
          value={settings.announcementTitle || ''}
          onChange={(e) =>
            setSettings({ ...settings, announcementTitle: e.target.value })
          }
          placeholder="Title"
          className="mb-2 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
        />
        <textarea
          value={settings.announcementBody || ''}
          onChange={(e) =>
            setSettings({ ...settings, announcementBody: e.target.value })
          }
          rows={3}
          placeholder="Body"
          className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
        />
        <button
          type="button"
          disabled={saving}
          onClick={() =>
            void saveSettings(settings, 'Announcement saved')
          }
          className="mt-3 rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold"
        >
          Save announcement
        </button>
      </section>

      <section className="rounded-xl border border-white/10 bg-zinc-950/60 p-5">
        <h2 className="mb-4 flex items-center gap-2 font-semibold">
          <Plus className="h-4 w-4" />
          Polls
        </h2>
        <form onSubmit={createPoll} className="mb-6 space-y-3">
          <input
            value={pollQuestion}
            onChange={(e) => setPollQuestion(e.target.value)}
            required
            placeholder="Poll question"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
          />
          <textarea
            value={pollOptions}
            onChange={(e) => setPollOptions(e.target.value)}
            required
            rows={4}
            placeholder="One option per line (min 2)"
            className="w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm outline-none"
          />
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs text-zinc-500">
              Ends at
              <input
                type="datetime-local"
                value={pollEndsAt}
                onChange={(e) => setPollEndsAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
            <label className="text-xs text-zinc-500">
              Results reveal at
              <input
                type="datetime-local"
                value={pollRevealAt}
                onChange={(e) => setPollRevealAt(e.target.value)}
                className="mt-1 w-full rounded-lg border border-white/10 bg-black/40 px-3 py-2 text-sm text-white outline-none"
              />
            </label>
          </div>
          <button
            type="submit"
            className="rounded-lg bg-[var(--primary)] px-4 py-2 text-sm font-semibold"
          >
            Create poll
          </button>
        </form>

        <div className="space-y-3">
          {polls.length === 0 && (
            <p className="text-sm text-zinc-500">No polls yet.</p>
          )}
          {polls.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-white/10 bg-black/30 p-4"
            >
              <div className="flex flex-wrap items-start justify-between gap-2">
                <div>
                  <p className="font-medium">{p.question}</p>
                  <p className="mt-1 text-xs text-zinc-500">
                    {p.voteCount} votes ·{' '}
                    {p.isActive ? 'Active' : 'Inactive'}
                    {p.endsAt && ` · ends ${new Date(p.endsAt).toLocaleString()}`}
                    {p.resultsRevealAt &&
                      ` · reveal ${new Date(p.resultsRevealAt).toLocaleString()}`}
                  </p>
                </div>
                <div className="flex gap-2">
                  <button
                    type="button"
                    onClick={async () => {
                      const res = await fetch('/api/admin/polls', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          id: p.id,
                          isActive: !p.isActive,
                        }),
                      })
                      if (!res.ok) {
                        toast.error('Update failed')
                        return
                      }
                      toast.success(p.isActive ? 'Paused' : 'Activated')
                      await load()
                    }}
                    className="rounded-lg bg-white/10 px-3 py-1.5 text-xs"
                  >
                    {p.isActive ? 'Pause' : 'Activate'}
                  </button>
                  <button
                    type="button"
                    onClick={async () => {
                      if (!confirm('Delete this poll?')) return
                      const res = await fetch(
                        `/api/admin/polls?id=${encodeURIComponent(p.id)}`,
                        { method: 'DELETE' }
                      )
                      if (!res.ok) {
                        toast.error('Delete failed')
                        return
                      }
                      toast.success('Poll deleted')
                      await load()
                    }}
                    className="rounded-lg p-1.5 text-red-400 hover:bg-red-500/10"
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              </div>
              <ul className="mt-3 space-y-1 text-sm text-zinc-400">
                {p.options.map((o, i) => (
                  <li key={o}>
                    {o}
                    {p.counts ? ` — ${p.counts[i] ?? 0}` : ''}
                  </li>
                ))}
              </ul>
              <div className="mt-3 grid gap-2 sm:grid-cols-2">
                <label className="text-xs text-zinc-500">
                  Update end
                  <input
                    type="datetime-local"
                    defaultValue={toLocalInput(p.endsAt)}
                    onBlur={async (e) => {
                      const val = e.target.value
                      await fetch('/api/admin/polls', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          id: p.id,
                          endsAt: val ? new Date(val).toISOString() : null,
                        }),
                      })
                      await load()
                    }}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-sm"
                  />
                </label>
                <label className="text-xs text-zinc-500">
                  Update reveal
                  <input
                    type="datetime-local"
                    defaultValue={toLocalInput(p.resultsRevealAt)}
                    onBlur={async (e) => {
                      const val = e.target.value
                      await fetch('/api/admin/polls', {
                        method: 'PATCH',
                        headers: { 'Content-Type': 'application/json' },
                        body: JSON.stringify({
                          id: p.id,
                          resultsRevealAt: val
                            ? new Date(val).toISOString()
                            : null,
                        }),
                      })
                      await load()
                    }}
                    className="mt-1 w-full rounded-lg border border-white/10 bg-zinc-900 px-2 py-1.5 text-sm"
                  />
                </label>
              </div>
            </div>
          ))}
        </div>
      </section>
    </div>
  )
}
