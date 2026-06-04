import { useState, useEffect, useRef, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  CalendarDays, UserX, Loader2, CheckCircle2, Search, Filter, X,
  MoreVertical, CalendarClock, UserCog, Eye, Wrench, XCircle,
} from 'lucide-react'
import {
  getInstallations, subscribeInstallations, FIELD_ENGINEERS,
} from '../data/installationsStore'
import Button from '../components/ui/Button'

// ── Constants ──────────────────────────────────────────────────────────────────

const TODAY      = new Date().toISOString().split('T')[0]
const TOMORROW   = new Date(Date.now() + 86400000).toISOString().split('T')[0]
const DAY_AFTER  = new Date(Date.now() + 2 * 86400000).toISOString().split('T')[0]

const STATUS_CHIP = {
  'Pending':     'bg-gray-100 text-gray-500',
  'Assigned':    'bg-blue-100 text-blue-700',
  'Scheduled':   'bg-purple-100 text-purple-700',
  'In Progress': 'bg-amber-100 text-amber-700',
  'Completed':   'bg-emerald-100 text-emerald-700',
  'Cancelled':   'bg-red-100 text-red-600',
}

const ALL_STATUSES = ['Pending', 'Assigned', 'Scheduled', 'In Progress', 'Completed', 'Cancelled']

const TABS = [
  { key: 'today',    label: 'Today'      },
  { key: 'tomorrow', label: 'Tomorrow'   },
  { key: 'dayafter', label: 'Day After'  },
  { key: 'thisweek', label: 'This Week'  },
  { key: 'future',   label: 'Future'     },
  { key: 'all',      label: 'All'        },
]

function matchesTab(tab, inst) {
  const d = inst.slotDate
  if (tab === 'today')    return d === TODAY
  if (tab === 'tomorrow') return d === TOMORROW
  if (tab === 'dayafter') return d === DAY_AFTER
  if (tab === 'thisweek') {
    const now = new Date()
    const dow = now.getDay()
    const monday = new Date(now.getTime() - (dow === 0 ? 6 : dow - 1) * 86400000)
    monday.setHours(0,0,0,0)
    const sunday = new Date(monday.getTime() + 6 * 86400000)
    return d >= monday.toISOString().split('T')[0] && d <= sunday.toISOString().split('T')[0]
  }
  if (tab === 'future') return d > DAY_AFTER
  return true
}

// ── Main page ─────────────────────────────────────────────────────────────────

export default function Installations() {
  const navigate = useNavigate()
  const [installations, setInstallations] = useState(getInstallations)
  const [activeTab,     setActiveTab]     = useState('today')
  const [search,        setSearch]        = useState('')
  const [filterDrawer,  setFilterDrawer]  = useState(false)
  const [filterEngineer, setFilterEngineer] = useState('')
  const [filterStatus,  setFilterStatus]  = useState('')
  const [filterArea,    setFilterArea]    = useState('')
  const [menuOpenId, setMenuOpenId] = useState(null)
  const menuRef = useRef(null)

  useEffect(() => subscribeInstallations(setInstallations), [])

  useEffect(() => {
    function close(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpenId(null)
    }
    document.addEventListener('mousedown', close)
    return () => document.removeEventListener('mousedown', close)
  }, [])

  const allAreas = useMemo(() => [...new Set(installations.map(i => i.area))].sort(), [installations])

  const tabCounts = useMemo(() =>
    Object.fromEntries(TABS.map(t => [t.key, installations.filter(i => matchesTab(t.key, i)).length]))
  , [installations])

  const filtered = useMemo(() => {
    const q = search.toLowerCase()
    return installations.filter(inst => {
      if (!matchesTab(activeTab, inst)) return false
      if (q && !inst.customerName.toLowerCase().includes(q) &&
               !inst.id.toLowerCase().includes(q) &&
               !inst.area.toLowerCase().includes(q)) return false
      if (filterEngineer && inst.engineerId !== filterEngineer) return false
      if (filterStatus  && inst.status      !== filterStatus)   return false
      if (filterArea    && inst.area        !== filterArea)      return false
      return true
    })
  }, [installations, activeTab, search, filterEngineer, filterStatus, filterArea])

  // Stats
  const statsToday     = installations.filter(i => i.slotDate === TODAY).length
  const statsPending   = installations.filter(i => !i.engineerId).length
  const statsInProgress = installations.filter(i => i.status === 'In Progress').length
  const statsCompleted = (() => {
    const now = new Date()
    const monday = new Date(now.getTime() - (now.getDay() === 0 ? 6 : now.getDay() - 1) * 86400000)
    monday.setHours(0,0,0,0)
    const weekStart = monday.toISOString().split('T')[0]
    return installations.filter(i => i.status === 'Completed' && i.slotDate >= weekStart).length
  })()

  function goAction(instId, actionParam) {
    setMenuOpenId(null)
    navigate(`/installations/${instId}?action=${actionParam}`)
  }

  function slotClass(inst) {
    if (inst.slotDate < TODAY) return 'text-red-600'
    if (inst.slotDate === TODAY) return 'text-amber-600 font-semibold'
    return 'text-gray-800'
  }

  const hasFilters = filterEngineer || filterStatus || filterArea

  return (
    <div className="p-6 space-y-5 max-w-[1800px]">

      {/* Header */}
      <div className="flex items-start justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Installation Management</h1>
          <p className="text-sm text-gray-500 mt-0.5">Manage and track all installation visits</p>
        </div>
      </div>

      {/* Stats row */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        {[
          { label: "Today's Installations", value: statsToday,     icon: CalendarDays,  cls: 'text-brand-blue',  bg: 'bg-blue-50'    },
          { label: 'Pending Assignment',    value: statsPending,   icon: UserX,         cls: 'text-amber-600', bg: 'bg-amber-50'   },
          { label: 'In Progress',           value: statsInProgress,icon: Loader2,       cls: 'text-brand-blue',  bg: 'bg-blue-50'    },
          { label: 'Completed This Week',   value: statsCompleted, icon: CheckCircle2,  cls: 'text-emerald-600',bg: 'bg-emerald-50' },
        ].map(({ label, value, icon: Icon, cls, bg }) => (
          <div key={label} className="bg-white rounded-xl p-4 shadow-card border border-surface-border flex items-center gap-4">
            <div className={`w-10 h-10 ${bg} rounded-xl flex items-center justify-center shrink-0`}>
              <Icon size={18} className={cls} />
            </div>
            <div>
              <p className="text-xs text-gray-500 font-medium">{label}</p>
              <p className={`text-2xl font-bold mt-0.5 ${cls}`}>{value}</p>
            </div>
          </div>
        ))}
      </div>

      {/* Tabs + Search/Filter */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">

        {/* Tab bar */}
        <div className="flex overflow-x-auto border-b border-surface-border scrollbar-none">
          {TABS.map(tab => (
            <button key={tab.key} onClick={() => setActiveTab(tab.key)}
              className={`shrink-0 flex items-center gap-2 px-4 py-3.5 text-xs font-medium transition-all border-b-2 -mb-px whitespace-nowrap
                ${activeTab === tab.key
                  ? 'border-brand-blue text-brand-blue'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:bg-gray-50/50'
                }`}>
              {tab.label}
              <span className={`text-[10px] font-bold px-1.5 py-0.5 rounded-full ${
                activeTab === tab.key ? 'bg-brand-blue text-white' : 'bg-gray-100 text-gray-500'
              }`}>{tabCounts[tab.key]}</span>
            </button>
          ))}
        </div>

        {/* Search + filter row */}
        <div className="flex items-center gap-3 px-4 py-3 border-b border-surface-border">
          <div className="relative flex-1">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input type="text" placeholder="Search by customer, installation ID, area..."
              value={search} onChange={e => setSearch(e.target.value)}
              className="pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white w-full focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400" />
          </div>
          <div className="relative">
            <Button variant="secondary" size="sm" icon={<Filter size={13} />}
              onClick={() => setFilterDrawer(v => !v)}>
              Filter{hasFilters && <span className="ml-1.5 w-1.5 h-1.5 rounded-full bg-brand-blue inline-block" />}
            </Button>
            {/* Filter drawer */}
            {filterDrawer && (
              <div className="absolute right-0 top-full mt-2 z-40 w-72 bg-white border border-surface-border rounded-xl shadow-xl p-4 space-y-4">
                <div className="flex items-center justify-between mb-1">
                  <p className="text-sm font-semibold text-gray-700">Filters</p>
                  <button onClick={() => setFilterDrawer(false)} className="text-gray-400 hover:text-gray-600">
                    <X size={14} />
                  </button>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Engineer</label>
                  <select value={filterEngineer} onChange={e => setFilterEngineer(e.target.value)}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-700">
                    <option value="">All Engineers</option>
                    {FIELD_ENGINEERS.map(e => <option key={e.id} value={e.id}>{e.name}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Status</label>
                  <select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-700">
                    <option value="">All Statuses</option>
                    {ALL_STATUSES.map(s => <option key={s}>{s}</option>)}
                  </select>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-500 mb-1 block">Area / Zone</label>
                  <select value={filterArea} onChange={e => setFilterArea(e.target.value)}
                    className="w-full text-sm border border-surface-border rounded-lg px-3 py-2 bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 text-gray-700">
                    <option value="">All Areas</option>
                    {allAreas.map(a => <option key={a}>{a}</option>)}
                  </select>
                </div>
                {hasFilters && (
                  <button onClick={() => { setFilterEngineer(''); setFilterStatus(''); setFilterArea('') }}
                    className="text-xs text-gray-400 hover:text-gray-600 transition-colors">
                    Clear all filters
                  </button>
                )}
              </div>
            )}
          </div>
          <span className="text-xs text-gray-400 shrink-0">{filtered.length} installation{filtered.length !== 1 ? 's' : ''}</span>
        </div>

        {/* Table */}
        {filtered.length === 0 ? (
          <div className="text-center py-16">
            <Wrench size={28} className="mx-auto text-gray-300 mb-3" />
            <p className="text-sm font-medium text-gray-500">No installations found</p>
            <p className="text-xs text-gray-400 mt-1">Try a different tab or clear filters</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-surface-border bg-gray-50/50">
                  {['INST ID','CUSTOMER','LEAD ID','ADDRESS','SLOT','ENGINEER','HARDWARE','STATUS','ACTIONS'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[10px] font-semibold text-gray-400 uppercase tracking-wider whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {filtered.map(inst => {
                  const hwCount = (inst.hardware?.length ?? 0) + (inst.wires?.length ?? 0)
                  const eng = FIELD_ENGINEERS.find(e => e.id === inst.engineerId)
                  return (
                    <tr key={inst.id} className="hover:bg-gray-50/50 transition-colors">
                      {/* INST ID */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <button onClick={() => navigate(`/installations/${inst.id}`)}
                          className="text-brand-blue font-semibold text-xs hover:underline transition-colors">
                          {inst.id}
                        </button>
                      </td>

                      {/* CUSTOMER */}
                      <td className="px-4 py-3">
                        <p className="text-xs font-semibold text-gray-800 whitespace-nowrap">{inst.customerName}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{inst.customerPhone}</p>
                      </td>

                      {/* LEAD ID */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {inst.leadId ? (
                          <button onClick={() => navigate(`/sales/leads/${inst.leadId}/overview`)}
                            className="text-brand-blue text-xs font-medium hover:underline">
                            {inst.leadId}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">—</span>
                        )}
                      </td>

                      {/* ADDRESS */}
                      <td className="px-4 py-3">
                        <p className="text-xs text-gray-700 whitespace-nowrap">{inst.area}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{inst.city}</p>
                      </td>

                      {/* SLOT */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <p className={`text-xs font-medium ${slotClass(inst)}`}>{inst.slotDate}</p>
                        <p className="text-[10px] text-gray-400 mt-0.5">{inst.slotTime}</p>
                      </td>

                      {/* ENGINEER */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {eng ? (
                          <div className="flex items-center gap-2">
                            <div className={`w-6 h-6 rounded-full flex items-center justify-center text-white text-[9px] font-bold shrink-0 ${eng.color}`}>
                              {eng.initials}
                            </div>
                            <span className="text-xs text-gray-700">{eng.name}</span>
                          </div>
                        ) : (
                          <span className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-amber-100 text-amber-700">Unassigned</span>
                        )}
                      </td>

                      {/* HARDWARE */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {hwCount > 0 ? (
                          <button onClick={() => navigate(`/installations/${inst.id}?action=add-hardware`)}
                            className="text-[10px] font-semibold px-2 py-0.5 rounded-full bg-blue-100 text-blue-700 hover:bg-blue-200 transition-colors">
                            {hwCount} item{hwCount !== 1 ? 's' : ''}
                          </button>
                        ) : (
                          <span className="text-xs text-gray-300">None</span>
                        )}
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className={`text-[10px] font-semibold px-2 py-0.5 rounded-full ${STATUS_CHIP[inst.status] ?? 'bg-gray-100 text-gray-500'}`}>
                          {inst.status}
                        </span>
                      </td>

                      {/* ACTIONS */}
                      <td className="px-4 py-3 whitespace-nowrap" ref={menuOpenId === inst.id ? menuRef : null}>
                        <div className="relative">
                          <button onClick={() => setMenuOpenId(id => id === inst.id ? null : inst.id)}
                            className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 transition-colors">
                            <MoreVertical size={14} />
                          </button>
                          {menuOpenId === inst.id && (
                            <div className="absolute right-0 top-full mt-1 z-50 w-52 bg-white border border-surface-border rounded-xl shadow-xl overflow-hidden">
                              {[
                                { icon: CalendarClock, label: 'Edit Slot',                  onClick: () => goAction(inst.id, 'edit-slot') },
                                { icon: UserCog,       label: 'Assign Engineer',            onClick: () => goAction(inst.id, 'assign-engineer') },
                                { icon: Eye,           label: 'View Lead',                  onClick: () => { setMenuOpenId(null); if (inst.leadId) navigate(`/sales/leads/${inst.leadId}/overview`) }, disabled: !inst.leadId },
                                { icon: Wrench,        label: 'Add Hardware Requirements',  onClick: () => goAction(inst.id, 'add-hardware') },
                                { icon: XCircle,       label: 'Mark Cancelled',             onClick: () => goAction(inst.id, 'cancel'), danger: true, disabled: inst.status === 'Cancelled' || inst.status === 'Completed' },
                              ].map(item => (
                                <button key={item.label} onClick={item.disabled ? undefined : item.onClick}
                                  disabled={item.disabled}
                                  className={`flex items-center gap-2.5 w-full px-4 py-2.5 text-sm transition-colors
                                    ${item.disabled ? 'opacity-40 cursor-not-allowed text-gray-500'
                                      : item.danger  ? 'text-red-600 hover:bg-red-50'
                                      : 'text-gray-700 hover:bg-gray-50'}`}>
                                  <item.icon size={13} className="shrink-0" />
                                  {item.label}
                                </button>
                              ))}
                            </div>
                          )}
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>

    </div>
  )
}
