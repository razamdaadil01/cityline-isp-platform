import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import {
  List, Clock, CheckCircle2, XCircle,
  Search, SlidersHorizontal, MoreVertical, X,
} from 'lucide-react'
import Button from '../components/ui/Button'
import Badge from '../components/ui/Badge'
import Modal from '../components/ui/Modal'
import { FormField, Select, Input } from '../components/ui/FormInputs'
import { getFeasibilityRequests, updateFeasibilityStatus, subscribeFeasibility } from '../data/feasibilityStore'

const STATUS_VARIANT = { Pending: 'yellow', Feasible: 'green', 'Not Feasible': 'red' }

const SITE_TYPE_STYLE = {
  FTTH:    'bg-blue-100 text-blue-700',
  Sector:  'bg-purple-100 text-purple-700',
  Village: 'bg-emerald-100 text-emerald-700',
}

export default function FeasibilityRequests() {
  const navigate   = useNavigate()
  const menuRef    = useRef(null)

  const [requests, setRequests]   = useState(getFeasibilityRequests())
  const [search, setSearch]       = useState('')
  const [drawerOpen, setDrawerOpen] = useState(false)
  const [filterStatus,  setFilterStatus]  = useState('')
  const [filterArea,    setFilterArea]    = useState('')
  const [filterBranch,  setFilterBranch]  = useState('')
  const [filterDateFrom, setFilterDateFrom] = useState('')
  const [filterDateTo,   setFilterDateTo]   = useState('')

  const [menuId,  setMenuId]  = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })

  const [editReq,    setEditReq]   = useState(null)
  const [newStatus,  setNewStatus] = useState('')

  useEffect(() => subscribeFeasibility(setRequests), [])

  useEffect(() => {
    if (!menuId) return
    function onDown(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null) }
    document.addEventListener('mousedown', onDown)
    return () => document.removeEventListener('mousedown', onDown)
  }, [menuId])

  function openMenu(e, id) {
    const rect = e.currentTarget.getBoundingClientRect()
    const menuH = 120
    const top = window.innerHeight - rect.bottom < menuH ? rect.top - menuH - 4 : rect.bottom + 4
    setMenuPos({ top, right: window.innerWidth - rect.right })
    setMenuId(id)
  }

  function openUpdate(req) { setEditReq(req); setNewStatus(req.feasibilityStatus); setMenuId(null) }
  function handleUpdate()  { updateFeasibilityStatus(editReq.id, newStatus); setEditReq(null) }

  function clearFilters() {
    setFilterStatus(''); setFilterArea(''); setFilterBranch('')
    setFilterDateFrom(''); setFilterDateTo('')
  }

  const counts = {
    total:       requests.length,
    pending:     requests.filter(r => r.feasibilityStatus === 'Pending').length,
    feasible:    requests.filter(r => r.feasibilityStatus === 'Feasible').length,
    notFeasible: requests.filter(r => r.feasibilityStatus === 'Not Feasible').length,
  }

  const q = search.trim().toLowerCase()
  const visible = requests.filter(r => {
    if (q && !r.customerName.toLowerCase().includes(q) && !r.leadId.toLowerCase().includes(q)
      && !r.area.toLowerCase().includes(q) && !r.localityName.toLowerCase().includes(q)
      && !r.subLocalityName.toLowerCase().includes(q)) return false
    if (filterStatus && r.feasibilityStatus !== filterStatus) return false
    if (filterArea   && !r.area.toLowerCase().includes(filterArea.toLowerCase())) return false
    if (filterBranch && !r.assignedBranch.toLowerCase().includes(filterBranch.toLowerCase())) return false
    if (filterDateFrom && r.createdAt < filterDateFrom) return false
    if (filterDateTo   && r.createdAt > filterDateTo)   return false
    return true
  })

  const activeFilters = [
    filterStatus   && { label: `Status: ${filterStatus}`,    clear: () => setFilterStatus('')   },
    filterArea     && { label: `Area: ${filterArea}`,        clear: () => setFilterArea('')     },
    filterBranch   && { label: `Branch: ${filterBranch}`,    clear: () => setFilterBranch('')   },
    filterDateFrom && { label: `From: ${filterDateFrom}`,    clear: () => setFilterDateFrom('') },
    filterDateTo   && { label: `To: ${filterDateTo}`,        clear: () => setFilterDateTo('')   },
  ].filter(Boolean)

  const menuReq = requests.find(r => r.id === menuId) ?? null

  return (
    <div className="flex flex-col h-full overflow-hidden bg-surface">

      {/* ── Header ─────────────────────────────────────────────────────── */}
      <div className="px-6 pt-4 pb-4 shrink-0 bg-white border-b border-surface-border">
        {/* Breadcrumb */}
        <div className="flex items-center gap-1.5 text-[12px] mb-3">
          <button onClick={() => navigate('/settings/general')} className="text-gray-400 hover:underline transition-colors">Settings</button>
          <span className="text-gray-300">›</span>
          <button onClick={() => navigate('/settings/area-mapping')} className="text-gray-400 hover:underline transition-colors">Area Mapping</button>
          <span className="text-gray-300">›</span>
          <span className="text-gray-500">Feasibility Requests</span>
        </div>
        <h1 className="text-xl font-bold text-gray-900">Feasibility Requests</h1>
        <p className="text-sm text-gray-500 mt-0.5">Leads requiring feasibility check for unmapped areas</p>
      </div>

      {/* ── Body ───────────────────────────────────────────────────────── */}
      <div className="flex-1 overflow-y-auto p-6 space-y-5">

        {/* Stats */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          {[
            { label: 'Total Requests', value: counts.total,       color: 'text-navy',        bg: 'bg-navy/5',     icon: List         },
            { label: 'Pending',        value: counts.pending,     color: 'text-amber-600',   bg: 'bg-amber-50',   icon: Clock        },
            { label: 'Feasible',       value: counts.feasible,    color: 'text-emerald-600', bg: 'bg-emerald-50', icon: CheckCircle2 },
            { label: 'Not Feasible',   value: counts.notFeasible, color: 'text-red-500',     bg: 'bg-red-50',     icon: XCircle      },
          ].map(({ label, value, color, bg, icon: Icon }) => (
            <div key={label} className="bg-white rounded-xl border border-surface-border p-4 flex items-center gap-3 shadow-card">
              <div className={`w-10 h-10 rounded-xl ${bg} flex items-center justify-center shrink-0`}>
                <Icon size={18} className={color} />
              </div>
              <div>
                <p className={`text-2xl font-bold ${color}`}>{value}</p>
                <p className="text-xs text-gray-500 mt-0.5">{label}</p>
              </div>
            </div>
          ))}
        </div>

        {/* Search + Filter */}
        <div className="flex gap-3">
          <div className="flex-1 relative">
            <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400 pointer-events-none" />
            <input
              value={search} onChange={e => setSearch(e.target.value)}
              placeholder="Search by name, lead ID, location..."
              className="w-full pl-9 pr-3 py-2 text-sm border border-surface-border rounded-xl bg-white placeholder-gray-400 text-gray-800 focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue transition-colors"
            />
          </div>
          <button
            onClick={() => setDrawerOpen(true)}
            className={`flex items-center gap-2 px-3 py-2 rounded-xl border text-sm font-medium transition-colors ${
              activeFilters.length > 0
                ? 'border-brand-blue bg-brand-blue/5 text-brand-blue'
                : 'border-surface-border bg-white text-gray-600 hover:bg-gray-50'
            }`}>
            <SlidersHorizontal size={15} />
            {activeFilters.length > 0 && <span className="text-xs font-bold">{activeFilters.length}</span>}
          </button>
        </div>

        {/* Active filter pills */}
        {activeFilters.length > 0 && (
          <div className="flex flex-wrap items-center gap-2">
            {activeFilters.map(f => (
              <span key={f.label} className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-brand-blue/8 text-brand-blue text-xs font-medium">
                {f.label}
                <button onClick={f.clear} className="hover:text-red-500 transition-colors"><X size={11} /></button>
              </span>
            ))}
            <button onClick={clearFilters} className="text-xs text-gray-400 hover:text-gray-600 transition-colors">Clear all</button>
          </div>
        )}

        {/* Table */}
        <div className="bg-white rounded-xl border border-surface-border overflow-x-auto shadow-card">
          {visible.length === 0 ? (
            <div className="p-16 text-center">
              <p className="text-gray-400 text-sm">No requests found.</p>
              <p className="text-gray-300 text-xs mt-1">Requests appear when a lead is submitted with "Feasibility Required" checked.</p>
            </div>
          ) : (
            <table className="w-full min-w-[800px]">
              <thead>
                <tr className="border-b border-surface-border bg-gray-50/80">
                  {['Req ID', 'Lead / Customer', 'Location', 'Site Type', 'Branch', 'Status', 'Created', 'Actions'].map(h => (
                    <th key={h} className="px-4 py-3 text-left text-[11px] font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">
                      {h}
                    </th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-surface-border">
                {visible.map(r => (
                  <tr key={r.id} className="hover:bg-gray-50/50 transition-colors">

                    {/* Req ID */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs font-semibold text-brand-blue font-mono cursor-default">{r.id}</span>
                    </td>

                    {/* Lead / Customer */}
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-gray-900 leading-tight">{r.customerName}</p>
                      <p className="text-xs text-brand-blue font-mono mt-0.5">{r.leadId}</p>
                      {r.phone && <p className="text-xs text-gray-400 mt-0.5">{r.phone}</p>}
                    </td>

                    {/* Location */}
                    <td className="px-4 py-3.5">
                      <p className="text-sm font-semibold text-gray-900 leading-tight truncate max-w-[160px]">{r.subLocalityName}</p>
                      <p className="text-xs text-gray-400 mt-0.5 truncate max-w-[160px]">{r.localityName} · {r.area}</p>
                    </td>

                    {/* Site Type */}
                    <td className="px-4 py-3.5">
                      <span className={`inline-block px-2 py-0.5 rounded-full text-[11px] font-semibold ${SITE_TYPE_STYLE[r.connectionType] ?? 'bg-gray-100 text-gray-600'}`}>
                        {r.connectionType}
                      </span>
                    </td>

                    {/* Branch */}
                    <td className="px-4 py-3.5">
                      {r.assignedBranch
                        ? <span className="text-xs font-mono bg-gray-100 text-gray-600 px-2 py-0.5 rounded">{r.assignedBranch}</span>
                        : <span className="text-xs text-gray-300">—</span>
                      }
                    </td>

                    {/* Status */}
                    <td className="px-4 py-3.5">
                      <Badge variant={STATUS_VARIANT[r.feasibilityStatus] ?? 'gray'} size="sm">
                        {r.feasibilityStatus}
                      </Badge>
                    </td>

                    {/* Created */}
                    <td className="px-4 py-3.5">
                      <span className="text-xs text-gray-500 whitespace-nowrap">{r.createdAt}</span>
                    </td>

                    {/* Actions */}
                    <td className="px-4 py-3.5">
                      <button
                        onClick={e => openMenu(e, r.id)}
                        className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors ${
                          menuId === r.id ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:bg-gray-100 hover:text-gray-600'
                        }`}>
                        <MoreVertical size={15} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </div>

      {/* ── ⋮ Dropdown portal ───────────────────────────────────────────── */}
      {menuReq && (
        <div
          ref={menuRef}
          style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
          className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-44"
        >
          <button
            onClick={() => openUpdate(menuReq)}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
            <CheckCircle2 size={13} className="text-brand-blue shrink-0" /> Update Status
          </button>
          <button
            onClick={() => { navigate(`/sales/leads/${menuReq.leadId}/overview`); setMenuId(null) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
            <List size={13} className="text-gray-400 shrink-0" /> View Lead
          </button>
          <button
            onClick={() => { setMenuId(null) }}
            className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
            <Search size={13} className="text-gray-400 shrink-0" /> View Details
          </button>
        </div>
      )}

      {/* ── Filter Drawer ───────────────────────────────────────────────── */}
      {drawerOpen && (
        <div className="fixed inset-0 z-40" onClick={() => setDrawerOpen(false)} />
      )}
      <div className={`fixed top-14 right-0 bottom-0 w-80 bg-white border-l border-surface-border shadow-2xl z-50 flex flex-col transition-transform duration-300 ${drawerOpen ? 'translate-x-0' : 'translate-x-full'}`}>
        <div className="flex items-center justify-between px-5 py-4 border-b border-surface-border shrink-0">
          <h3 className="text-sm font-semibold text-gray-800">Filters</h3>
          <button onClick={() => setDrawerOpen(false)} className="w-7 h-7 flex items-center justify-center rounded-lg hover:bg-gray-100 text-gray-400 transition-colors">
            <X size={15} />
          </button>
        </div>

        <div className="flex-1 overflow-y-auto px-5 py-4 space-y-5">
          <FormField label="Status">
            <Select value={filterStatus} onChange={e => setFilterStatus(e.target.value)}>
              <option value="">All Statuses</option>
              <option value="Pending">Pending</option>
              <option value="Feasible">Feasible</option>
              <option value="Not Feasible">Not Feasible</option>
            </Select>
          </FormField>

          <FormField label="Area / Location">
            <Input
              value={filterArea} onChange={e => setFilterArea(e.target.value)}
              placeholder="e.g. Noida, Bangalore…"
            />
          </FormField>

          <FormField label="Branch Code">
            <Input
              value={filterBranch} onChange={e => setFilterBranch(e.target.value)}
              placeholder="e.g. CNPL-001…"
            />
          </FormField>

          <FormField label="Created From">
            <Input type="date" value={filterDateFrom} onChange={e => setFilterDateFrom(e.target.value)} />
          </FormField>

          <FormField label="Created To">
            <Input type="date" value={filterDateTo} onChange={e => setFilterDateTo(e.target.value)} />
          </FormField>
        </div>

        <div className="px-5 py-4 border-t border-surface-border flex gap-3 shrink-0">
          <Button variant="secondary" className="flex-1" onClick={clearFilters}>Clear All</Button>
          <Button className="flex-1" onClick={() => setDrawerOpen(false)}>Apply Filters</Button>
        </div>
      </div>

      {/* ── Update Status Modal ─────────────────────────────────────────── */}
      <Modal
        isOpen={!!editReq}
        onClose={() => setEditReq(null)}
        title={`Update Status — ${editReq?.id}`}
        size="sm"
        footer={<>
          <Button variant="secondary" size="sm" onClick={() => setEditReq(null)}>Cancel</Button>
          <Button size="sm" onClick={handleUpdate}>Save</Button>
        </>}>
        <div className="space-y-4">
          {editReq && (
            <div className="bg-gray-50 rounded-lg p-3 text-sm space-y-1.5">
              <p><span className="text-gray-500">Customer: </span><span className="font-medium text-gray-800">{editReq.customerName}</span></p>
              <p><span className="text-gray-500">Location: </span><span className="font-medium text-gray-800">{editReq.subLocalityName} · {editReq.localityName}</span></p>
              <p><span className="text-gray-500">Type: </span><span className="font-medium text-gray-800">{editReq.connectionType}</span></p>
              <div className="flex items-center gap-2 pt-1">
                <span className="text-gray-500">Current status:</span>
                <Badge variant={STATUS_VARIANT[editReq.feasibilityStatus] ?? 'gray'} size="sm">{editReq.feasibilityStatus}</Badge>
              </div>
            </div>
          )}
          <FormField label="New Status">
            <Select value={newStatus} onChange={e => setNewStatus(e.target.value)}>
              <option value="Pending">Pending</option>
              <option value="Feasible">Feasible</option>
              <option value="Not Feasible">Not Feasible</option>
            </Select>
          </FormField>
        </div>
      </Modal>
    </div>
  )
}
