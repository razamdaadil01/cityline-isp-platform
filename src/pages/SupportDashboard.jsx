import { useState, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import {
  BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer,
} from 'recharts'
import {
  LayoutList, Sparkles, UserX, Loader2, Wrench, AlertTriangle, RotateCcw, Zap,
  ChevronDown, Filter,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import {
  getTickets, subscribeTickets, slaStatusOf,
  CATEGORIES, AREAS, PRIORITIES, PRIORITY_LABEL, AGENTS, TECHNICIANS,
} from '../data/ticketsStore'
import { getOutages, subscribeOutages, ACTIVE_OUTAGE_STATUSES } from '../data/outagesStore'

function formatDate(iso) {
  return new Date(iso).toLocaleDateString('en-IN', { day: '2-digit', month: 'short', year: 'numeric' })
}

function SectionTitle({ children }) {
  return <h2 className="text-xs font-semibold text-gray-400 uppercase tracking-wider mb-3">{children}</h2>
}

function WidgetCard({ title, action, children, className = '' }) {
  return (
    <div className={`bg-white rounded-xl shadow-card border border-surface-border overflow-hidden ${className}`}>
      <div className="flex items-center justify-between px-5 py-3.5 border-b border-surface-border">
        <h3 className="text-sm font-semibold text-gray-800">{title}</h3>
        {action && <div>{action}</div>}
      </div>
      <div className="p-5">{children}</div>
    </div>
  )
}

function StatCard({ label, value, icon, iconBg, iconColor, to }) {
  return (
    <Link to={to} className="bg-white rounded-xl p-4 shadow-card border border-surface-border hover:shadow-card-hover hover:border-brand-blue/30 transition-all block">
      <div className="flex items-start justify-between">
        <div className="flex-1 min-w-0">
          <p className="text-xs font-medium text-gray-500 leading-tight">{label}</p>
          <p className="text-xl font-bold text-gray-900 mt-1.5 leading-none">{value}</p>
        </div>
        <div className={`w-9 h-9 rounded-lg ${iconBg} ${iconColor} flex items-center justify-center shrink-0 ml-2`}>
          {icon}
        </div>
      </div>
    </Link>
  )
}

export default function SupportDashboard() {
  const [tickets, setTickets] = useState(getTickets)
  useEffect(() => subscribeTickets(setTickets), [])

  const [outages, setOutages] = useState(getOutages)
  useEffect(() => subscribeOutages(setOutages), [])

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

  const filteredOutages = useMemo(() => outages.filter(o => {
    if (fArea && !o.affectedAreas.includes(fArea)) return false
    if (fDateFrom && o.startTime.slice(0, 10) < fDateFrom) return false
    if (fDateTo && o.startTime.slice(0, 10) > fDateTo) return false
    return true
  }), [outages, fArea, fDateFrom, fDateTo])

  // Query params from the dashboard's own filters, carried through to the drill-down link
  function ticketsLink(extra) {
    const params = new URLSearchParams()
    if (fDateFrom) params.set('dateFrom', fDateFrom)
    if (fDateTo) params.set('dateTo', fDateTo)
    if (fArea) params.set('area', fArea)
    if (fCategory) params.set('category', fCategory)
    if (fPriority) params.set('priority', fPriority)
    if (fAgent) params.set('agent', fAgent)
    if (fTechnician) params.set('technician', fTechnician)
    Object.entries(extra).forEach(([k, v]) => params.set(k, v))
    return `/support/tickets?${params.toString()}`
  }

  function outagesLink(extra) {
    const params = new URLSearchParams()
    if (fArea) params.set('area', fArea)
    Object.entries(extra).forEach(([k, v]) => params.set(k, v))
    return `/support/outages?${params.toString()}`
  }

  const totalOpen = filteredTickets.filter(t => !['Resolved', 'Closed', 'Cancelled'].includes(t.status)).length
  const newCount = filteredTickets.filter(t => t.status === 'New').length
  const unassignedCount = filteredTickets.filter(t => !t.assignedAgent).length
  const inProgressCount = filteredTickets.filter(t => t.status === 'In Progress').length
  const waitingTechCount = filteredTickets.filter(t => t.status === 'Waiting for Technician').length
  const slaBreachedCount = filteredTickets.filter(t => slaStatusOf(t) === 'Breached').length
  const reopenedCount = filteredTickets.filter(t => t.status === 'Reopened').length
  const activeOutagesCount = filteredOutages.filter(o => ACTIVE_OUTAGE_STATUSES.includes(o.status)).length

  const statCards = [
    { label: 'Total Open Tickets', value: totalOpen, icon: <LayoutList size={18} />, iconBg: 'bg-brand-blue/10', iconColor: 'text-brand-blue', to: ticketsLink({ view: 'open' }) },
    { label: 'New Tickets', value: newCount, icon: <Sparkles size={18} />, iconBg: 'bg-blue-100', iconColor: 'text-blue-600', to: ticketsLink({ status: 'New' }) },
    { label: 'Unassigned Tickets', value: unassignedCount, icon: <UserX size={18} />, iconBg: 'bg-gray-100', iconColor: 'text-gray-600', to: ticketsLink({ unassigned: '1' }) },
    { label: 'Tickets In Progress', value: inProgressCount, icon: <Loader2 size={18} />, iconBg: 'bg-brand-orange/10', iconColor: 'text-brand-orange', to: ticketsLink({ status: 'In Progress' }) },
    { label: 'Waiting for Technician', value: waitingTechCount, icon: <Wrench size={18} />, iconBg: 'bg-amber-100', iconColor: 'text-amber-600', to: ticketsLink({ status: 'Waiting for Technician' }) },
    { label: 'SLA-Breached', value: slaBreachedCount, icon: <AlertTriangle size={18} />, iconBg: 'bg-red-100', iconColor: 'text-red-600', to: ticketsLink({ slaStatus: 'Breached' }) },
    { label: 'Reopened Tickets', value: reopenedCount, icon: <RotateCcw size={18} />, iconBg: 'bg-purple-100', iconColor: 'text-purple-700', to: ticketsLink({ status: 'Reopened' }) },
    { label: 'Active Outages', value: activeOutagesCount, icon: <Zap size={18} />, iconBg: 'bg-red-100', iconColor: 'text-red-500', to: outagesLink({ state: 'Active' }) },
  ]

  const categoryBreakdown = useMemo(() => {
    const counts = {}
    filteredTickets.forEach(t => { counts[t.category] = (counts[t.category] ?? 0) + 1 })
    return CATEGORIES.map(c => ({ name: c, count: counts[c] ?? 0 })).filter(c => c.count > 0).sort((a, b) => b.count - a.count)
  }, [filteredTickets])

  const areaBreakdown = useMemo(() => {
    const counts = {}
    filteredTickets.forEach(t => { counts[t.area] = (counts[t.area] ?? 0) + 1 })
    return Object.entries(counts).map(([name, count]) => ({ name, count })).sort((a, b) => b.count - a.count)
  }, [filteredTickets])

  const oldestUnresolved = useMemo(() => {
    return filteredTickets
      .filter(t => !['Resolved', 'Closed'].includes(t.status))
      .sort((a, b) => new Date(a.createdAt) - new Date(b.createdAt))
      .slice(0, 5)
      .map(t => ({ ...t, daysOpen: Math.floor((Date.now() - new Date(t.createdAt).getTime()) / 86400000) }))
  }, [filteredTickets])

  const hasNoTickets = filteredTickets.length === 0

  return (
    <div className="p-6 space-y-6">

      {/* Page heading */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Support Dashboard</h1>
          <p className="text-sm text-gray-500 mt-0.5">Overview of tickets and outages across support operations</p>
        </div>
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

      {/* Metric cards */}
      <div>
        <SectionTitle>Key Metrics</SectionTitle>
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
          {statCards.map(card => <StatCard key={card.label} {...card} />)}
        </div>
      </div>

      {hasNoTickets ? (
        <div className="bg-white rounded-xl border border-surface-border shadow-card p-12 text-center">
          <p className="text-sm text-gray-400">No tickets found for the selected filters.</p>
        </div>
      ) : (
        <>
          {/* Breakdown charts */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
            <WidgetCard title="Tickets by Complaint Category">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={categoryBreakdown} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    angle={-20} textAnchor="end" height={50} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v) => [`${v} tickets`]} />
                  <Bar dataKey="count" name="Tickets" fill="#0A8DCD" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </WidgetCard>

            <WidgetCard title="Tickets by Area">
              <ResponsiveContainer width="100%" height={240}>
                <BarChart data={areaBreakdown} margin={{ top: 5, right: 5, left: 0, bottom: 0 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke="#f0f0f0" />
                  <XAxis dataKey="name" tick={{ fontSize: 10, fill: '#9ca3af' }} axisLine={false} tickLine={false}
                    angle={-20} textAnchor="end" height={50} interval={0} />
                  <YAxis tick={{ fontSize: 11, fill: '#9ca3af' }} axisLine={false} tickLine={false} allowDecimals={false} />
                  <Tooltip formatter={(v) => [`${v} tickets`]} />
                  <Bar dataKey="count" name="Tickets" fill="#E8541A" radius={[4, 4, 0, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </WidgetCard>
          </div>

          {/* Oldest unresolved tickets */}
          <WidgetCard title="Oldest Unresolved Tickets">
            <div className="overflow-x-auto -mx-5 -mb-5">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-y border-surface-border bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                    {['Ticket Number', 'Customer', 'Category', 'Created Date', 'Days Open'].map(h => (
                      <th key={h} className="text-left px-5 py-2.5 whitespace-nowrap">{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {oldestUnresolved.length === 0 ? (
                    <tr><td colSpan={5} className="text-center py-8 text-gray-400 text-sm">No unresolved tickets.</td></tr>
                  ) : oldestUnresolved.map(t => (
                    <tr key={t.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-2.5 whitespace-nowrap">
                        <Link to={`/support/tickets/${t.id}/documents`} className="text-xs font-mono font-semibold text-brand-blue hover:underline">
                          {t.id}
                        </Link>
                      </td>
                      <td className="px-5 py-2.5 text-sm font-medium text-gray-800 whitespace-nowrap">{t.customerName}</td>
                      <td className="px-5 py-2.5 text-xs text-gray-600 whitespace-nowrap">{t.category}</td>
                      <td className="px-5 py-2.5 text-xs text-gray-600 whitespace-nowrap">{formatDate(t.createdAt)}</td>
                      <td className="px-5 py-2.5 whitespace-nowrap">
                        <Badge variant={t.daysOpen > 3 ? 'red' : 'yellow'} size="sm">{t.daysOpen} day{t.daysOpen !== 1 ? 's' : ''}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </WidgetCard>
        </>
      )}

    </div>
  )
}
