import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  CalendarDays, Clock, UserCheck, Loader2, CheckCircle2, RefreshCw, XCircle,
  Search, Wrench, ChevronDown,
} from 'lucide-react'
import { getInstallations as getInternetInstallations, subscribeInstallations as subscribeInternetInstallations } from '../data/installationsStore'
import { getInstallations as getIntercomInstallations, subscribeInstallations as subscribeIntercomInstallations } from '../data/intercomInstallationsStore'
import Badge from '../components/ui/Badge'

/* ── Type badge — follows the "Internet + Intercom" / "Intercom Only" pattern ── */
const TYPE_BADGE = {
  Internet: 'blue',
  Intercom: 'cyan',
}

/* ── Literal status → badge variant (covers both source vocabularies, nothing is renamed) ── */
const STATUS_BADGE = {
  'Scheduled':                   'blue',
  'Assigned':                    'purple',
  'Hardware Collection Pending': 'yellow',
  'Dispatched':                  'orange',
  'Completed':                   'green',
  'Rescheduled':                 'cyan',
  'Cancelled':                   'red',
  'Pending':                     'orange',
  'In Progress':                 'navy',
}

/* ── Normalized status buckets — used only for the summary cards + status filter,
   the table always shows the original literal status so no data is lost ── */
const NORMALIZED_BUCKETS = ['Scheduled', 'Assigned', 'In Progress', 'Completed', 'Rescheduled', 'Cancelled']

function normalizeInternetStatus(status) {
  if (status === 'Hardware Collection Pending' || status === 'Dispatched') return 'In Progress'
  return status
}

function normalizeIntercomStatus(status) {
  switch (status) {
    case 'pending':    return 'Scheduled'
    case 'inprogress': return 'In Progress'
    case 'completed':  return 'Completed'
    case 'cancelled':  return 'Cancelled'
    default:            return status
  }
}

const INTERCOM_STATUS_LABEL = {
  pending:    'Pending',
  inprogress: 'In Progress',
  completed:  'Completed',
  cancelled:  'Cancelled',
}

/* dd-mm-yyyy or yyyy-mm-dd -> "05 Jun 2026" for a consistent display across both sources */
function formatDate(raw, format) {
  if (!raw) return '—'
  const parts = raw.split('-')
  if (parts.length !== 3) return raw
  const [a, b, c] = parts
  const [y, m, d] = format === 'iso' ? [a, b, c] : [c, b, a]
  const dt = new Date(Number(y), Number(m) - 1, Number(d))
  if (Number.isNaN(dt.getTime())) return raw
  return dt.toLocaleDateString('en-GB', { day: '2-digit', month: 'short', year: 'numeric' })
}

/* ── Merge both stores into one unified row shape ─────────────────────────── */
function buildUnifiedRows(internet, intercom) {
  const internetRows = internet.map(inst => ({
    key:              `net-${inst.id}`,
    type:             'Internet',
    workOrderId:      inst.id,
    leadId:           inst.leadId ?? null,
    leadHref:         inst.leadId ? `/sales/leads/${inst.leadId}/overview` : null,
    detailHref:       `/installations/${inst.id}`,
    customerName:     inst.customerName,
    mobile:           inst.mobile || inst.customerPhone || '—',
    areaLocality:     [inst.area, inst.locality].filter(Boolean).join(' — ') || '—',
    assignedEngineer: inst.engineerName || '—',
    installationDate: formatDate(inst.slotDate, 'iso'),
    status:           inst.status,
    normalizedStatus: normalizeInternetStatus(inst.status),
  }))

  const intercomRows = intercom.map(o => ({
    key:              `ic-${o.id}`,
    type:             'Intercom',
    workOrderId:      o.id,
    leadId:           o.leadId ?? null,
    leadHref:         o.leadId ? `/intercom/leads/${o.leadId}` : null,
    detailHref:       `/intercom/installations/${o.id}`,
    customerName:     o.customer,
    mobile:           o.phone || '—',
    areaLocality:     o.zone || '—',
    assignedEngineer: o.engineer || '—',
    installationDate: formatDate(o.installDate, 'dmy'),
    status:           INTERCOM_STATUS_LABEL[o.status] ?? o.status,
    normalizedStatus: normalizeIntercomStatus(o.status),
  }))

  return [...internetRows, ...intercomRows]
}

export default function Installations() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [internet, setInternet] = useState(getInternetInstallations)
  const [intercom, setIntercom] = useState(getIntercomInstallations)
  useEffect(() => subscribeInternetInstallations(setInternet), [])
  useEffect(() => subscribeIntercomInstallations(setIntercom), [])

  const initialType = ['Internet', 'Intercom'].includes(searchParams.get('type')) ? searchParams.get('type') : 'All'

  const [search,       setSearch]       = useState('')
  const [filterType,   setFilterType]   = useState(initialType)
  const [filterStatus, setFilterStatus] = useState('')
  const [page,         setPage]         = useState(1)
  const [pageSize,     setPageSize]     = useState(10)

  function changeType(next) {
    setFilterType(next)
    setPage(1)
    const params = new URLSearchParams(searchParams)
    if (next === 'All') params.delete('type')
    else params.set('type', next)
    setSearchParams(params, { replace: true })
  }

  const rows = useMemo(() => buildUnifiedRows(internet, intercom), [internet, intercom])

  const counts = useMemo(() => {
    const c = {
      total: rows.length,
      internet: rows.filter(r => r.type === 'Internet').length,
      intercom: rows.filter(r => r.type === 'Intercom').length,
    }
    NORMALIZED_BUCKETS.forEach(b => { c[b] = rows.filter(r => r.normalizedStatus === b).length })
    return c
  }, [rows])

  const visible = useMemo(() => {
    const q = search.trim().toLowerCase()
    return rows.filter(r => {
      if (filterType !== 'All' && r.type !== filterType) return false
      if (filterStatus && r.normalizedStatus !== filterStatus) return false
      if (q &&
          !r.customerName.toLowerCase().includes(q) &&
          !r.workOrderId.toLowerCase().includes(q) &&
          !(r.leadId || '').toLowerCase().includes(q) &&
          !r.mobile.toLowerCase().includes(q) &&
          !r.areaLocality.toLowerCase().includes(q)) return false
      return true
    })
  }, [rows, search, filterType, filterStatus])

  const totalPages = Math.max(1, Math.ceil(visible.length / pageSize))
  const safePage   = Math.min(page, totalPages)
  const paged      = visible.slice((safePage - 1) * pageSize, safePage * pageSize)

  function goToDetail(row) { navigate(row.detailHref) }

  const STAT_CARDS = [
    { key: 'total',       label: 'Total Visits', value: counts.total,       color: 'text-gray-700',    bg: 'bg-gray-100',    icon: CalendarDays },
    { key: 'Scheduled',   label: 'Scheduled',    value: counts.Scheduled,   color: 'text-brand-blue',  bg: 'bg-blue-50',     icon: Clock         },
    { key: 'Assigned',    label: 'Assigned',     value: counts.Assigned,    color: 'text-purple-600',  bg: 'bg-purple-50',   icon: UserCheck     },
    { key: 'In Progress', label: 'In Progress',  value: counts['In Progress'], color: 'text-orange-600', bg: 'bg-orange-50', icon: Loader2       },
    { key: 'Completed',   label: 'Completed',    value: counts.Completed,   color: 'text-emerald-600', bg: 'bg-emerald-50',  icon: CheckCircle2  },
    { key: 'Rescheduled', label: 'Rescheduled',  value: counts.Rescheduled, color: 'text-yellow-600',  bg: 'bg-yellow-50',   icon: RefreshCw     },
    { key: 'Cancelled',   label: 'Cancelled',    value: counts.Cancelled,   color: 'text-red-500',     bg: 'bg-red-50',      icon: XCircle       },
  ]

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">

      {/* Header */}
      <div className="px-6 pt-5 pb-4 shrink-0 bg-white border-b border-surface-border">
        <h1 className="text-xl font-bold text-gray-900">Installations</h1>
        <p className="text-sm text-gray-500 mt-0.5">Unified list of Internet and Intercom installation work orders</p>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 sm:grid-cols-4 xl:grid-cols-7 gap-3">
          {STAT_CARDS.map(({ key, label, value, color, bg, icon: Icon }) => (
            <div key={key} className="bg-white rounded-xl border border-surface-border p-4 flex items-center gap-3 shadow-card">
              <div className={`w-8 h-8 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={14} className={color} />
              </div>
              <div className="min-w-0">
                <p className={`text-lg font-bold leading-none ${color}`}>{value}</p>
                <p className="text-[10px] text-gray-500 mt-0.5 leading-tight truncate">{label}</p>
                {key === 'total' && (
                  <p className="text-[9px] text-gray-400 mt-0.5 leading-tight truncate">
                    {counts.internet} Internet / {counts.intercom} Intercom
                  </p>
                )}
              </div>
            </div>
          ))}
        </div>

        {/* Filters + table card */}
        <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">

          {/* Search + Type filter + Status filter */}
          <div className="px-4 py-3 border-b border-surface-border flex flex-wrap items-center gap-3">
            <div className="relative flex-1 min-w-[240px]">
              <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
              <input
                value={search} onChange={e => { setSearch(e.target.value); setPage(1) }}
                placeholder="Search by customer name, work order ID, mobile, area..."
                className="w-full pl-9 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
              />
            </div>

            <div className="relative shrink-0">
              <select
                value={filterType}
                onChange={e => changeType(e.target.value)}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-surface-border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue cursor-pointer">
                <option value="All">All Types</option>
                <option value="Internet">Internet</option>
                <option value="Intercom">Intercom</option>
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <div className="relative shrink-0">
              <select
                value={filterStatus}
                onChange={e => { setFilterStatus(e.target.value); setPage(1) }}
                className="appearance-none pl-3 pr-8 py-2 text-sm border border-surface-border rounded-lg bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue cursor-pointer">
                <option value="">All Statuses</option>
                {NORMALIZED_BUCKETS.map(b => <option key={b} value={b}>{b}</option>)}
              </select>
              <ChevronDown size={13} className="absolute right-2.5 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            </div>

            <span className="text-xs text-gray-400 shrink-0">
              {visible.length} work order{visible.length !== 1 ? 's' : ''}
            </span>
          </div>

          {/* Table */}
          {visible.length === 0 ? (
            <div className="py-16 text-center">
              <Wrench size={28} className="mx-auto text-gray-300 mb-3" />
              <p className="text-sm font-medium text-gray-500">No installations found</p>
              <p className="text-xs text-gray-400 mt-1">Try a different type/status filter or clear the search</p>
            </div>
          ) : (
            <div className="overflow-x-auto">
              <table className="w-full" style={{ minWidth: 1300 }}>
                <thead>
                  <tr className="border-b border-surface-border bg-gray-50 text-[11px] font-semibold text-gray-500 uppercase tracking-wider">
                    {['Work Order ID', 'Type', 'Lead ID', 'Customer Name', 'Mobile', 'Area / Locality',
                      'Assigned Engineer', 'Installation Date', 'Status'].map((h, i) => (
                      <th key={h} className={`px-4 py-3 text-left whitespace-nowrap ${i === 0 ? 'pl-6' : ''}`}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-surface-border">
                  {paged.map(row => (
                    <tr key={row.key} onClick={() => goToDetail(row)}
                      className="hover:bg-gray-50/60 transition-colors cursor-pointer">

                      {/* WORK ORDER ID */}
                      <td className="pl-6 pr-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs font-semibold text-brand-blue hover:underline">
                          {row.workOrderId}
                        </span>
                      </td>

                      {/* TYPE */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={TYPE_BADGE[row.type] ?? 'gray'} size="sm">{row.type}</Badge>
                      </td>

                      {/* LEAD ID */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        {row.leadId
                          ? <button onClick={e => { e.stopPropagation(); navigate(row.leadHref) }}
                              className="font-mono text-xs font-semibold text-gray-600 hover:text-brand-blue hover:underline">
                              {row.leadId}
                            </button>
                          : <span className="text-gray-300 text-xs">—</span>}
                      </td>

                      {/* CUSTOMER NAME */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs font-semibold text-gray-900">{row.customerName}</span>
                      </td>

                      {/* MOBILE */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs text-gray-600">{row.mobile}</span>
                      </td>

                      {/* AREA / LOCALITY */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-700">{row.areaLocality}</span>
                      </td>

                      {/* ASSIGNED ENGINEER */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-700">{row.assignedEngineer}</span>
                      </td>

                      {/* INSTALLATION DATE */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="text-xs text-gray-700 font-medium">{row.installationDate}</span>
                      </td>

                      {/* STATUS */}
                      <td className="px-4 py-3 whitespace-nowrap">
                        <Badge variant={STATUS_BADGE[row.status] ?? 'gray'} size="sm">{row.status}</Badge>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Pagination footer */}
          {visible.length > 0 && (
            <div className="flex items-center justify-between px-4 py-3 border-t border-surface-border bg-gray-50">
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-500">Show</span>
                <select value={pageSize}
                  onChange={e => { setPageSize(Number(e.target.value)); setPage(1) }}
                  className="text-xs border border-surface-border rounded-lg px-2 py-1 bg-white text-gray-700 focus:outline-none focus:ring-2 focus:ring-brand-blue/30">
                  {[10, 25, 50].map(n => <option key={n} value={n}>{n}</option>)}
                </select>
                <span className="text-xs text-gray-500">per page</span>
              </div>
              <span className="text-xs text-gray-500">
                Showing {visible.length === 0 ? 0 : (safePage - 1) * pageSize + 1}–{Math.min(safePage * pageSize, visible.length)} of {visible.length} work order{visible.length !== 1 ? 's' : ''}
              </span>
              <div className="flex items-center gap-1">
                <button onClick={() => setPage(p => Math.max(1, p - 1))} disabled={safePage === 1}
                  className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
                  Prev
                </button>
                {Array.from({ length: totalPages }, (_, i) => i + 1).map(p => (
                  <button key={p} onClick={() => setPage(p)}
                    className={`w-7 h-7 text-xs font-semibold rounded-lg transition-colors ${
                      p === safePage ? 'bg-brand-blue text-white' : 'border border-surface-border hover:bg-white text-gray-600'
                    }`}>
                    {p}
                  </button>
                ))}
                <button onClick={() => setPage(p => Math.min(totalPages, p + 1))} disabled={safePage === totalPages}
                  className="px-2.5 py-1 text-xs font-semibold border border-surface-border rounded-lg disabled:opacity-40 hover:bg-white transition-colors bg-gray-50">
                  Next
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
