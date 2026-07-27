import { useState, useEffect, useMemo } from 'react'
import {
  FileText, Unlock, Lock, RotateCcw, Users, Clock, CheckCircle2, ChevronDown, Filter, Smile,
} from 'lucide-react'
import {
  getTickets, subscribeTickets,
  CATEGORIES, AREAS, PRIORITIES, PRIORITY_LABEL, AGENTS, TECHNICIANS,
} from '../data/ticketsStore'

function SectionTitle({ children }) {
  return <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{children}</h2>
}

function WidgetCard({ title, subtitle, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-card border border-surface-border overflow-hidden ${className}`}>
      <div className="px-5 py-3.5 border-b border-surface-border">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {subtitle && <p className="text-xs text-gray-400 mt-0.5">{subtitle}</p>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function StatCard({ label, value, icon, iconBg, iconColor }) {
  return (
    <div className="bg-white rounded-xl p-4 shadow-card border border-surface-border">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 leading-tight">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1.5 leading-none">{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0 ml-2`}>
          {icon}
        </div>
      </div>
    </div>
  )
}

function average(nums) {
  const valid = nums.filter(n => n !== null && n !== undefined && !Number.isNaN(n))
  if (!valid.length) return null
  return valid.reduce((a, b) => a + b, 0) / valid.length
}

function hoursBetween(startIso, endIso) {
  return (new Date(endIso).getTime() - new Date(startIso).getTime()) / 3600000
}

function formatDuration(hours) {
  if (hours === null || hours === undefined || Number.isNaN(hours)) return '—'
  if (hours < 48) return `${hours.toFixed(1)} hours`
  return `${(hours / 24).toFixed(1)} days`
}

export default function SupportReports() {
  const [tickets, setTickets] = useState(getTickets)
  useEffect(() => subscribeTickets(setTickets), [])

  const [fDateFrom, setFDateFrom] = useState('')
  const [fDateTo, setFDateTo] = useState('')
  const [fArea, setFArea] = useState('')
  const [fCategory, setFCategory] = useState('')
  const [fPriority, setFPriority] = useState('')
  const [fAgent, setFAgent] = useState('')
  const [fTechnician, setFTechnician] = useState('')

  function clearAllFilters() {
    setFDateFrom(''); setFDateTo(''); setFArea(''); setFCategory(''); setFPriority(''); setFAgent(''); setFTechnician('')
  }
  const filterCount = [fDateFrom || fDateTo, fArea, fCategory, fPriority, fAgent, fTechnician].filter(Boolean).length

  const filteredTickets = useMemo(() => tickets.filter(t => {
    if (fDateFrom && t.createdAt.slice(0, 10) < fDateFrom) return false
    if (fDateTo && t.createdAt.slice(0, 10) > fDateTo) return false
    if (fArea && t.area !== fArea) return false
    if (fCategory && t.category !== fCategory) return false
    if (fPriority && t.priority !== fPriority) return false
    if (fAgent && t.assignedAgent !== fAgent) return false
    if (fTechnician && t.assignedTechnician !== fTechnician) return false
    return true
  }), [tickets, fDateFrom, fDateTo, fArea, fCategory, fPriority, fAgent, fTechnician])

  // ── Summary cards ─────────────────────────────────────────────────────────
  const totalComplaintsAllTime = tickets.length // deliberately ignores the filter bar — "all-time" per spec
  const openCount = filteredTickets.filter(t => !['Resolved', 'Closed', 'Cancelled'].includes(t.status)).length
  const closedCount = filteredTickets.filter(t => t.status === 'Closed').length
  const reopenedCount = filteredTickets.filter(t => t.status === 'Reopened').length

  const repeatComplaintCount = useMemo(() => {
    const byAccount = {}
    filteredTickets.forEach(t => { byAccount[t.accountNumber] = (byAccount[t.accountNumber] ?? 0) + 1 })
    return Object.values(byAccount).filter(count => count > 1).length
  }, [filteredTickets])

  // ── Response / resolution time ────────────────────────────────────────────
  const avgResponseHours = average(
    filteredTickets.filter(t => t.firstResponseAt).map(t => hoursBetween(t.createdAt, t.firstResponseAt))
  )
  const avgResolutionHours = average(
    filteredTickets.filter(t => t.resolution?.resolvedAt).map(t => hoursBetween(t.createdAt, t.resolution.resolvedAt))
  )

  // ── Agent performance ──────────────────────────────────────────────────────
  const agentPerformance = useMemo(() => {
    return AGENTS.map(agent => {
      const assigned = filteredTickets.filter(t => t.assignedAgent === agent)
      const resolved = assigned.filter(t => t.resolution)
      const closed = assigned.filter(t => t.status === 'Closed')
      const avgResolution = average(resolved.map(t => hoursBetween(t.createdAt, t.resolution.resolvedAt)))
      return { agent, assignedCount: assigned.length, resolvedCount: resolved.length, closedCount: closed.length, avgResolution }
    }).sort((a, b) => b.resolvedCount - a.resolvedCount)
  }, [filteredTickets])

  // ── Technician performance ─────────────────────────────────────────────────
  const technicianPerformance = useMemo(() => {
    return TECHNICIANS.map(tech => {
      const scheduled = filteredTickets.filter(t => t.technicianVisit?.technician === tech)
      const completed = scheduled.filter(t => t.technicianVisit.visitStatus === 'Work Completed')
      return { technician: tech, scheduledCount: scheduled.length, completedCount: completed.length }
    }).sort((a, b) => b.completedCount - a.completedCount)
  }, [filteredTickets])

  // ── Root causes ─────────────────────────────────────────────────────────────
  const rootCauses = useMemo(() => {
    const counts = {}
    filteredTickets.forEach(t => {
      const cause = t.resolution?.rootCause?.trim()
      if (cause) counts[cause] = (counts[cause] ?? 0) + 1
    })
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count).slice(0, 5)
  }, [filteredTickets])

  // ── Customer feedback (stub unless csatScore is present) ───────────────────
  const ratedTickets = filteredTickets.filter(t => typeof t.csatScore === 'number')
  const avgCsat = average(ratedTickets.map(t => t.csatScore))

  const hasNoTickets = filteredTickets.length === 0

  return (
    <div className="p-6 space-y-6">

      {/* Page heading */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Support Reports</h1>
        <p className="text-sm text-gray-500 mt-0.5">Ticket performance, SLA and resolution analytics</p>
      </div>

      {/* Filters bar */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card p-4">
        <div className="flex items-center gap-2 mb-3">
          <Filter size={13} className="text-brand-blue" />
          <p className="text-xs font-semibold text-gray-600 uppercase tracking-wide">Filters</p>
          {filterCount > 0 && (
            <button onClick={clearAllFilters} className="ml-auto text-[11px] font-semibold text-red-500 hover:text-red-700">
              Clear all
            </button>
          )}
        </div>
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div>
            <p className="text-[11px] text-gray-400 mb-1">From</p>
            <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)}
              className="w-full text-sm border border-surface-border rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
          </div>
          <div>
            <p className="text-[11px] text-gray-400 mb-1">To</p>
            <input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)}
              className="w-full text-sm border border-surface-border rounded-lg px-2.5 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30" />
          </div>
          {[
            ['Area', fArea, setFArea, AREAS],
            ['Category', fCategory, setFCategory, CATEGORIES],
            ['Priority', fPriority, setFPriority, PRIORITIES],
            ['Agent', fAgent, setFAgent, AGENTS],
            ['Technician', fTechnician, setFTechnician, TECHNICIANS],
          ].map(([label, value, setter, options]) => (
            <div key={label}>
              <p className="text-[11px] text-gray-400 mb-1">{label}</p>
              <div className="relative">
                <select value={value} onChange={e => setter(e.target.value)}
                  className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-2.5 pr-7 py-1.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 cursor-pointer">
                  <option value="">All</option>
                  {options.map(o => <option key={o} value={o}>{label === 'Priority' ? PRIORITY_LABEL[o] : o}</option>)}
                </select>
                <ChevronDown size={12} className="absolute right-2 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* Summary cards */}
      <div>
        <SectionTitle>Summary</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-5 gap-4">
          <StatCard label="Total Complaints (all-time)" value={totalComplaintsAllTime} icon={<FileText size={18} />} iconBg="bg-brand-blue/10" iconColor="text-brand-blue" />
          <StatCard label="Open Tickets" value={openCount} icon={<Unlock size={18} />} iconBg="bg-blue-100" iconColor="text-blue-600" />
          <StatCard label="Closed Tickets" value={closedCount} icon={<Lock size={18} />} iconBg="bg-gray-100" iconColor="text-gray-600" />
          <StatCard label="Reopened Tickets" value={reopenedCount} icon={<RotateCcw size={18} />} iconBg="bg-red-100" iconColor="text-red-600" />
          <StatCard label="Repeat Complaints" value={repeatComplaintCount} icon={<Users size={18} />} iconBg="bg-purple-100" iconColor="text-purple-700" />
        </div>
      </div>

      {/* Response / Resolution time */}
      <div>
        <SectionTitle>Response &amp; Resolution Time</SectionTitle>
        <div className="grid grid-cols-2 gap-4">
          <StatCard label="Average Response Time" value={formatDuration(avgResponseHours)} icon={<Clock size={18} />} iconBg="bg-amber-100" iconColor="text-amber-600" />
          <StatCard label="Average Resolution Time" value={formatDuration(avgResolutionHours)} icon={<CheckCircle2 size={18} />} iconBg="bg-emerald-100" iconColor="text-emerald-600" />
        </div>
      </div>

      {hasNoTickets ? (
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-12 text-center">
          <p className="text-sm text-gray-400">No tickets found for the selected filters.</p>
        </div>
      ) : (
        <>
          {/* Agent / Technician performance */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WidgetCard title="Agent Performance">
              <div className="overflow-x-auto -mx-5 -mb-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-surface-border bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                      {['Agent', 'Assigned', 'Resolved', 'Closed', 'Avg Resolution'].map(h => (
                        <th key={h} className="text-left px-5 py-2.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {agentPerformance.map(a => (
                      <tr key={a.agent} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-2.5 text-sm font-medium text-gray-800 whitespace-nowrap">{a.agent}</td>
                        <td className="px-5 py-2.5 text-xs text-gray-600">{a.assignedCount}</td>
                        <td className="px-5 py-2.5 text-xs text-gray-600">{a.resolvedCount}</td>
                        <td className="px-5 py-2.5 text-xs text-gray-600">{a.closedCount}</td>
                        <td className="px-5 py-2.5 text-xs text-gray-600 whitespace-nowrap">{formatDuration(a.avgResolution)}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </WidgetCard>

            <WidgetCard title="Technician Performance" subtitle="Average time-to-complete needs visit start/end timestamps not yet tracked">
              <div className="overflow-x-auto -mx-5 -mb-5">
                <table className="w-full text-sm">
                  <thead>
                    <tr className="border-y border-surface-border bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                      {['Technician', 'Visits Scheduled', 'Visits Completed', 'Avg Time-to-Complete'].map(h => (
                        <th key={h} className="text-left px-5 py-2.5 whitespace-nowrap">{h}</th>
                      ))}
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-surface-border">
                    {technicianPerformance.map(t => (
                      <tr key={t.technician} className="hover:bg-gray-50 transition-colors">
                        <td className="px-5 py-2.5 text-sm font-medium text-gray-800 whitespace-nowrap">{t.technician}</td>
                        <td className="px-5 py-2.5 text-xs text-gray-600">{t.scheduledCount}</td>
                        <td className="px-5 py-2.5 text-xs text-gray-600">{t.completedCount}</td>
                        <td className="px-5 py-2.5 text-xs text-gray-400">—</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            </WidgetCard>
          </div>

          {/* Root causes / Customer feedback */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WidgetCard title="Top Root Causes" subtitle="From resolved tickets — free-text, so distinct write-ups won't merge">
              {rootCauses.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-4">No resolved tickets with a recorded root cause yet.</p>
              ) : (
                <div className="space-y-3">
                  {rootCauses.map((r, i) => (
                    <div key={r.name} className="flex items-center gap-3">
                      <div className="w-6 h-6 rounded-lg bg-brand-blue/10 text-brand-blue flex items-center justify-center text-xs font-bold shrink-0">
                        {i + 1}
                      </div>
                      <span className="text-sm text-gray-700 truncate flex-1" title={r.name}>{r.name}</span>
                      <span className="text-sm font-bold text-gray-900 shrink-0">{r.count}</span>
                    </div>
                  ))}
                </div>
              )}
            </WidgetCard>

            <WidgetCard title="Customer Feedback">
              {ratedTickets.length === 0 ? (
                <p className="text-sm text-gray-400 text-center py-6">
                  No customer feedback data yet — will populate once Customer Portal is built.
                </p>
              ) : (
                <div className="flex items-center gap-4">
                  <div className="w-14 h-14 rounded-xl bg-amber-100 text-amber-600 flex items-center justify-center shrink-0">
                    <Smile size={24} />
                  </div>
                  <div>
                    <p className="text-2xl font-bold text-gray-900">{avgCsat.toFixed(1)} / 5</p>
                    <p className="text-xs text-gray-500 mt-0.5">Average satisfaction from {ratedTickets.length} rated ticket{ratedTickets.length !== 1 ? 's' : ''}</p>
                  </div>
                </div>
              )}
            </WidgetCard>
          </div>
        </>
      )}

    </div>
  )
}
