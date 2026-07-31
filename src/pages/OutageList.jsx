import { useState, useEffect, useMemo, useRef } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  Plus, Filter, X, ChevronDown, AlertTriangle, Activity, CheckCircle2, Zap,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import {
  getOutages, subscribeOutages, OUTAGE_TYPES, SEVERITIES, ACTIVE_OUTAGE_STATUSES, getLinkedTickets,
} from '../data/outagesStore'
import { getAllLocalities } from '../data/areaMappingStore'
import { branchesForNasPorts } from '../data/ticketsStore'

const SEVERITY_BADGE = { Critical: 'red', High: 'orange', Medium: 'yellow', Low: 'gray' }
const STATUS_BADGE = {
  Confirmed: 'blue', 'Work in Progress': 'orange', Monitoring: 'yellow', Resolved: 'green', Closed: 'gray',
}

function formatDateTime(iso) {
  if (!iso) return '—'
  return new Date(iso).toLocaleString('en-IN', {
    day: '2-digit', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit', hour12: true,
  })
}

// Compact "NAS Port ID(s)" cell — 1 or 2 ports shown in full, 3+ shows the first
// plus a "+N more" badge whose popover (hover on desktop, tap on mobile) lists the rest.
function NasPortListCell({ ports }) {
  const [open, setOpen] = useState(false)
  const ref = useRef(null)

  useEffect(() => {
    if (!open) return
    function handler(e) { if (ref.current && !ref.current.contains(e.target)) setOpen(false) }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [open])

  if (!ports.length) return <span className="text-xs text-gray-300">—</span>

  if (ports.length <= 2) {
    return <span className="text-xs text-gray-600 font-mono">{ports.join(', ')}</span>
  }

  const [first, ...rest] = ports
  return (
    <div className="relative inline-block group" ref={ref}>
      <span className="text-xs text-gray-600 font-mono">{first} </span>
      <button
        type="button"
        onClick={e => { e.stopPropagation(); setOpen(o => !o) }}
        className="relative inline-flex items-center px-1.5 py-0.5 rounded-full bg-brand-blue/10 text-brand-blue text-[10px] font-semibold hover:bg-brand-blue/20 transition-colors"
      >
        +{rest.length} more
      </button>
      <div className={`absolute left-0 top-full mt-1.5 z-20 w-max max-w-[260px] px-2.5 py-1.5 rounded-lg bg-gray-900 text-white text-[11px] font-mono shadow-lg
        ${open ? 'block' : 'hidden group-hover:block'}`}>
        {rest.join(', ')}
      </div>
    </div>
  )
}

export default function OutageList() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const [outages, setOutages] = useState(getOutages)
  const [drawerOpen, setDrawerOpen] = useState(false)

  const [fState, setFState] = useState(() => // '' | 'Active' | 'Resolved'
    ['Active', 'Resolved'].includes(searchParams.get('state')) ? searchParams.get('state') : '')
  const [fArea, setFArea] = useState(() => searchParams.get('area') ?? '')
  const [fSeverity, setFSeverity] = useState(() => searchParams.get('severity') ?? '')
  const [fType, setFType] = useState('')
  const [fDateFrom, setFDateFrom] = useState('')
  const [fDateTo, setFDateTo] = useState('')

  useEffect(() => subscribeOutages(setOutages), [])

  const areas = useMemo(() => getAllLocalities(), [])

  function clearAllFilters() {
    setFState(''); setFArea(''); setFSeverity(''); setFType(''); setFDateFrom(''); setFDateTo('')
  }

  const filtered = outages.filter(o => {
    const isActive = ACTIVE_OUTAGE_STATUSES.includes(o.status)
    if (fState === 'Active' && !isActive) return false
    if (fState === 'Resolved' && isActive) return false
    if (fArea && !o.affectedAreas.includes(fArea)) return false
    if (fSeverity && o.severity !== fSeverity) return false
    if (fType && o.type !== fType) return false
    if (fDateFrom && o.startTime.slice(0, 10) < fDateFrom) return false
    if (fDateTo && o.startTime.slice(0, 10) > fDateTo) return false
    return true
  })

  const filterCount = [fState, fArea, fSeverity, fType, fDateFrom || fDateTo].filter(Boolean).length
  const hasActiveFilters = filterCount > 0

  const stats = useMemo(() => ({
    total: outages.length,
    active: outages.filter(o => ACTIVE_OUTAGE_STATUSES.includes(o.status)).length,
    resolved: outages.filter(o => !ACTIVE_OUTAGE_STATUSES.includes(o.status)).length,
  }), [outages])

  return (
    <div className="p-6 space-y-5">

      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Outages</h1>
          <p className="text-sm text-gray-500 mt-0.5">Track network outages and their impact on customers and tickets</p>
        </div>
        <Button icon={<Plus size={14} />} onClick={() => navigate('/support/outages/new')}>Create Outage</Button>
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-3 gap-3">
        {[
          { label: 'Total Outages', value: stats.total, icon: Zap, color: 'text-brand-blue', bg: 'bg-brand-blue/10' },
          { label: 'Active', value: stats.active, icon: Activity, color: 'text-red-600', bg: 'bg-red-50' },
          { label: 'Resolved', value: stats.resolved, icon: CheckCircle2, color: 'text-emerald-600', bg: 'bg-emerald-50' },
        ].map(s => {
          const Icon = s.icon
          return (
            <div key={s.label} className="bg-white rounded-xl border border-surface-border shadow-card px-4 py-3 flex items-center gap-3">
              <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
                <Icon size={18} className={s.color} />
              </div>
              <div>
                <p className="text-xl font-bold text-gray-900">{s.value}</p>
                <p className="text-[11px] text-gray-500 leading-tight">{s.label}</p>
              </div>
            </div>
          )
        })}
      </div>

      {/* Filters */}
      <div className="space-y-2">
        <div className="flex items-center gap-2 flex-wrap">
          <div className="flex gap-1">
            {['', 'Active', 'Resolved'].map(v => (
              <button key={v || 'all'} onClick={() => setFState(v)}
                className={`px-3 py-1.5 text-xs rounded-lg font-medium transition-colors ${
                  fState === v ? 'bg-navy text-white shadow-sm' : 'bg-white border border-surface-border text-gray-500 hover:bg-gray-50'
                }`}>
                {v || 'All'}
              </button>
            ))}
          </div>

          <button onClick={() => setDrawerOpen(true)}
            className={`relative flex items-center justify-center w-9 h-9 rounded-lg border transition-all shrink-0 ${
              filterCount > (fState ? 1 : 0)
                ? 'border-brand-blue bg-brand-blue/10 text-brand-blue hover:bg-brand-blue/20'
                : 'border-surface-border bg-white text-gray-500 hover:border-brand-blue/40 hover:text-brand-blue hover:bg-brand-blue/5'
            }`}
            title="Open filters">
            <Filter size={15} />
            {filterCount - (fState ? 1 : 0) > 0 && (
              <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center bg-brand-blue text-white text-[10px] font-bold rounded-full px-1 leading-none">
                {filterCount - (fState ? 1 : 0)}
              </span>
            )}
          </button>

          {hasActiveFilters && (
            <button onClick={clearAllFilters} className="text-[11px] font-semibold text-red-500 hover:text-red-700 transition-colors">
              Clear all
            </button>
          )}
        </div>
      </div>

      {/* Table */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                {['Outage Number', 'Outage Title', 'NAS Port ID(s)', 'Branch', 'Network Equipment', 'Severity', 'Start Time', 'Expected Restoration', 'Affected Customers', 'Linked Tickets', 'Status'].map(h => (
                  <th key={h} className={`text-left px-4 py-3 whitespace-nowrap ${h === 'NAS Port ID(s)' ? 'w-64' : ''}`}>{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr><td colSpan={11} className="text-center py-12 text-gray-400 text-sm">No outages match your filters.</td></tr>
              ) : filtered.map(o => (
                <tr key={o.id} className="hover:bg-gray-50 transition-colors cursor-pointer"
                  onClick={() => navigate(`/support/outages/${o.id}`)}>
                  <td className="px-4 py-3 whitespace-nowrap">
                    {ACTIVE_OUTAGE_STATUSES.includes(o.status) && o.severity === 'Critical' && (
                      <AlertTriangle size={11} className="inline text-red-500 mr-1 -mt-0.5" />
                    )}
                    <span className="font-mono text-xs font-bold text-brand-blue">{o.id}</span>
                  </td>
                  <td className="px-4 py-3 max-w-[220px]">
                    <p className="text-gray-800 font-medium truncate">{o.title}</p>
                    <p className="text-[11px] text-gray-400">{o.type}</p>
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 w-64">
                    <NasPortListCell ports={o.affectedNasPorts ?? []} />
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">
                    {branchesForNasPorts(o.affectedNasPorts).join(', ') || <span className="text-gray-300">—</span>}
                  </td>
                  <td className="px-4 py-3 text-xs text-gray-600 max-w-[160px] truncate">{o.affectedEquipment}</td>
                  <td className="px-4 py-3"><Badge variant={SEVERITY_BADGE[o.severity]} size="sm" dot>{o.severity}</Badge></td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(o.startTime)}</td>
                  <td className="px-4 py-3 text-xs text-gray-500 whitespace-nowrap">{formatDateTime(o.expectedRestorationTime)}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 text-center">{o.affectedCustomerCount}</td>
                  <td className="px-4 py-3 text-xs text-gray-600 text-center">{getLinkedTickets(o.id).length}</td>
                  <td className="px-4 py-3"><Badge variant={STATUS_BADGE[o.status] ?? 'gray'} size="sm">{o.status}</Badge></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Filter Drawer */}
      <div className={`fixed top-14 left-0 right-0 bottom-0 z-50 transition-opacity duration-300 ${drawerOpen ? 'opacity-100 pointer-events-auto' : 'opacity-0 pointer-events-none'}`}>
        <div className="absolute inset-0 bg-black/30" onClick={() => setDrawerOpen(false)} />
        <div className={`absolute right-0 top-0 h-full w-80 bg-white shadow-2xl flex flex-col transition-transform duration-300 ease-in-out ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
          <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
            <div className="flex items-center gap-2">
              <Filter size={15} className="text-brand-blue" />
              <h2 className="text-sm font-bold text-gray-900">Filters</h2>
            </div>
            <button onClick={() => setDrawerOpen(false)}
              className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-gray-700 hover:bg-gray-100 transition-colors">
              <X size={15} />
            </button>
          </div>

          <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
            {[
              ['Area', fArea, setFArea, areas],
              ['Severity', fSeverity, setFSeverity, SEVERITIES],
              ['Outage Type', fType, setFType, OUTAGE_TYPES],
            ].map(([label, value, setter, options]) => (
              <div key={label}>
                <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">{label}</label>
                <div className="relative">
                  <select value={value} onChange={e => setter(e.target.value)}
                    className="w-full appearance-none text-sm border border-surface-border rounded-lg pl-3 pr-8 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700 cursor-pointer">
                    <option value="">All</option>
                    {options.map(o => <option key={o} value={o}>{o}</option>)}
                  </select>
                  <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
                </div>
              </div>
            ))}

            <div>
              <label className="block text-xs font-semibold text-gray-500 uppercase tracking-wide mb-2">Start Date</label>
              <div className="space-y-2">
                <div>
                  <p className="text-xs text-gray-400 mb-1">From</p>
                  <input type="date" value={fDateFrom} onChange={e => setFDateFrom(e.target.value)}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700" />
                </div>
                <div>
                  <p className="text-xs text-gray-400 mb-1">To</p>
                  <input type="date" value={fDateTo} onChange={e => setFDateTo(e.target.value)}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2.5 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue text-gray-700" />
                </div>
              </div>
            </div>
          </div>

          <div className="shrink-0 px-5 py-4 border-t border-surface-border bg-gray-50 flex items-center gap-3">
            <button onClick={clearAllFilters}
              className="flex-1 py-2.5 text-sm font-semibold text-red-500 hover:text-red-700 border border-red-200 hover:border-red-300 rounded-xl transition-colors bg-white">
              Clear All Filters
            </button>
            <button onClick={() => setDrawerOpen(false)}
              className="flex-1 py-2.5 text-sm font-semibold text-white bg-brand-blue hover:bg-brand-blue-dark rounded-xl transition-colors shadow-sm">
              Apply Filters
            </button>
          </div>
        </div>
      </div>

    </div>
  )
}
