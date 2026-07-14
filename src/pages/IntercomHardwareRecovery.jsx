import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  Search, X, PackageSearch, Clock, AlertTriangle, PackageX, PackageMinus, PackageCheck,
} from 'lucide-react'
import Badge from '../components/ui/Badge'
import { Select } from '../components/ui/FormInputs'
import {
  getRecoveries, subscribeRecoveries, updateRecovery, RECOVERY_STATUS_CFG,
} from '../data/intercomRecoveryStore'

// Parse dd-mm-yyyy for date comparisons
function toISO(ddmmyyyy) {
  if (!ddmmyyyy) return ''
  const [d, m, y] = ddmmyyyy.split('-')
  return `${y}-${m}-${d}`
}

export default function IntercomHardwareRecovery() {
  const navigate = useNavigate()

  const [recoveries, setRecoveries] = useState(getRecoveries())
  useEffect(() => subscribeRecoveries(setRecoveries), [])

  const [search, setSearch] = useState('')
  const [filterStatus, setFilterStatus] = useState('')

  const todayISO = new Date().toISOString().slice(0, 10)

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase()
    return recoveries.filter(r => {
      if (q && !r.customer.toLowerCase().includes(q) && !r.id.toLowerCase().includes(q) && !r.customerId.toLowerCase().includes(q)) return false
      if (filterStatus && r.status !== filterStatus) return false
      return true
    })
  }, [recoveries, search, filterStatus])

  const stats = useMemo(() => ({
    pending:   recoveries.filter(r => r.status === 'pending').length,
    overdue:   recoveries.filter(r => (r.status === 'pending' || r.status === 'inprogress') && toISO(r.scheduledDate) < todayISO).length,
    partial:   recoveries.filter(r => r.status === 'partial_recovery').length,
    missing:   recoveries.filter(r => r.status === 'missing_hardware').length,
    damaged:   recoveries.filter(r => r.status === 'damaged_hardware').length,
    returned:  recoveries.filter(r => r.status === 'completed').length,
  }), [recoveries, todayISO])

  function handleStatusChange(id, status) {
    const patch = { status }
    if (status === 'completed') {
      patch.completedDate = new Date().toLocaleDateString('en-GB').split('/').join('-')
    }
    updateRecovery(id, patch)
  }

  return (
    <div className="p-6 space-y-5">

      {/* ── Header ─────────────────────────────────────────────────────────── */}
      <div>
        <h1 className="text-xl font-bold text-gray-900">Hardware Recovery</h1>
        <p className="text-sm text-gray-500 mt-0.5">Technician visits scheduled to recover intercom hardware</p>
      </div>

      {/* ── Stats ──────────────────────────────────────────────────────────── */}
      <div className="grid grid-cols-2 sm:grid-cols-3 xl:grid-cols-6 gap-3">
        {[
          { label: 'Recovery Pending',   value: stats.pending,  icon: Clock,         color: 'text-brand-orange', bg: 'bg-brand-orange/10' },
          { label: 'Overdue Recoveries', value: stats.overdue,  icon: AlertTriangle, color: 'text-red-600',      bg: 'bg-red-100'          },
          { label: 'Partial Recoveries', value: stats.partial,  icon: PackageMinus,  color: 'text-amber-600',    bg: 'bg-amber-100'        },
          { label: 'Missing Hardware',   value: stats.missing,  icon: PackageX,      color: 'text-red-600',      bg: 'bg-red-100'          },
          { label: 'Damaged Hardware',   value: stats.damaged,  icon: PackageX,      color: 'text-orange-600',   bg: 'bg-orange-100'       },
          { label: 'Returned to Inventory', value: stats.returned, icon: PackageCheck, color: 'text-emerald-700', bg: 'bg-emerald-100'   },
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

      {/* ── Search + Filter ────────────────────────────────────────────────── */}
      <div className="flex items-center gap-2">
        <div className="relative flex-1">
          <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
          <input
            value={search}
            onChange={e => setSearch(e.target.value)}
            placeholder="Search by customer, work order ID…"
            className="pl-9 pr-4 py-2 text-sm border border-surface-border rounded-lg bg-white w-full focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue placeholder-gray-400"
          />
          {search && (
            <button onClick={() => setSearch('')} className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-400 hover:text-gray-600">
              <X size={14} />
            </button>
          )}
        </div>
        <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)} className="!w-auto min-w-[170px]">
          <option value="">All Statuses</option>
          {Object.entries(RECOVERY_STATUS_CFG).map(([key, cfg]) => (
            <option key={key} value={key}>{cfg.label}</option>
          ))}
        </Select>
      </div>

      {/* ── Table ──────────────────────────────────────────────────────────── */}
      <div className="bg-white rounded-xl border border-surface-border shadow-card overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50 text-xs text-gray-500 font-semibold uppercase tracking-wider">
                {['Work Order ID', 'Customer', 'Reason', 'Technician', 'Scheduled Date', 'Status', 'Actions'].map(h => (
                  <th key={h} className="text-left px-4 py-3 whitespace-nowrap">{h}</th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {filtered.length === 0 ? (
                <tr>
                  <td colSpan={7} className="text-center py-14 text-gray-400 text-sm">
                    <PackageSearch size={32} className="mx-auto mb-2 text-gray-200" />
                    No hardware recovery work orders found
                  </td>
                </tr>
              ) : (
                filtered.map(r => {
                  const cfg = RECOVERY_STATUS_CFG[r.status] ?? RECOVERY_STATUS_CFG.pending
                  return (
                    <tr key={r.id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-4 py-3 whitespace-nowrap">
                        <span className="font-mono text-xs text-brand-blue font-semibold">{r.id}</span>
                      </td>
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-2.5">
                          <div className="w-7 h-7 rounded-full bg-gradient-to-br from-brand-blue to-navy flex items-center justify-center text-white text-xs font-bold shrink-0">
                            {r.customer.charAt(0)}
                          </div>
                          <button
                            onClick={() => navigate(`/intercom/customers/${r.customerId}/profile`)}
                            className="font-medium text-gray-800 hover:text-brand-blue hover:underline whitespace-nowrap"
                          >
                            {r.customer}
                          </button>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{r.reason}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{r.technician || '—'}</td>
                      <td className="px-4 py-3 text-xs text-gray-600 whitespace-nowrap">{r.scheduledDate}</td>
                      <td className="px-4 py-3">
                        <Badge variant={cfg.variant} dot size="sm">{cfg.label}</Badge>
                      </td>
                      <td className="px-4 py-3">
                        <Select
                          value={r.status}
                          onChange={e => handleStatusChange(r.id, e.target.value)}
                          className="!py-1 !text-xs !w-auto min-w-[150px]"
                        >
                          {Object.entries(RECOVERY_STATUS_CFG).map(([key, c]) => (
                            <option key={key} value={key}>{c.label}</option>
                          ))}
                        </Select>
                      </td>
                    </tr>
                  )
                })
              )}
            </tbody>
          </table>
        </div>
      </div>

    </div>
  )
}
