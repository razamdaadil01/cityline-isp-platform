import { useState, useMemo, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, Pencil, Users, CalendarDays, UserCog, ClipboardList } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import { getUserAssignments, subscribeUserAssignments } from '../../data/userAssignmentStore'
import { usePermission } from '../../data/rolesStore'

const STATUS_BADGE = { 'Handed Off': 'purple' }
const TYPE_BADGE = { new: 'blue', replace: 'orange', disconnection: 'red' }
const TYPE_LABEL = { new: 'New', replace: 'Replace', disconnection: 'Disconnection' }

// Serial/MAC label for one line — dual-tracked items carry both `serials`
// and `macs` paired at the same index (same physical unit, two
// identifiers; see CreateUserAssignment.jsx's HandoffLineRow), so those
// pair up as "value / MAC:mac" rather than listing all serials then all
// macs flat. Single-tracked items fall back to whichever array is
// populated; a wire line has neither and shows its drum instead.
function serialMacLabel(it) {
  if (it.serials.length && it.macs.length) return it.serials.map((s, i) => `${s} / MAC:${it.macs[i] ?? '—'}`).join(', ')
  if (it.serials.length) return it.serials.join(', ')
  if (it.macs.length) return it.macs.join(', ')
  if (it.drumNumber) return `Drum: ${it.drumNumber}`
  return '—'
}

// Actual handed-off quantity for one line — a dual-tracked item's `qty` is
// stored as serials.length + macs.length (see userAssignmentStore.js's
// saveUserAssignment), which double-counts a physical unit carrying both
// identifiers; Math.max recovers the real per-unit count the same way
// assignmentStore.js's own dual-tracked lines already do. A wire line's qty
// is meters, suffixed accordingly.
function qtyLabel(it) {
  if (it.serials.length || it.macs.length) return Math.max(it.serials.length, it.macs.length)
  if (it.drumNumber) return `${it.qty}m`
  return it.qty
}

// User (reference) label — customer name + reference ID + Work Order Type,
// e.g. "Manoj Deshmukh · INS-016 (Installation)". An Incident reference has
// no customer (area-wide), so that half is simply omitted.
function userLabel(a) {
  const ref = `${a.workOrderLabel}${a.workOrderType ? ` (${a.workOrderType})` : ''}`
  return a.customerName ? `${a.customerName} · ${ref}` : ref
}

// Flattens each assignment's items into one row per line — Date/Engineer/
// Type/User repeat per line, Product/Serial-MAC/Qty vary per line — same
// (record × item-line) flattening pattern Assignments.jsx uses for Assign
// to Engineer, reused here so the two lists stay consistent.
function flattenRows(assignments) {
  const rows = []
  assignments.forEach(a => {
    a.items.forEach((it, i) => {
      rows.push({
        key: `${a.id}-${i}`, assignmentId: a.id, assignmentNumber: a.assignmentNumber,
        date: a.assignedAt, engineerName: a.engineerName, assignmentType: a.assignmentType,
        userLabel: userLabel(a),
        productName: it.productName,
        serialMac: serialMacLabel(it),
        qty: qtyLabel(it),
        status: a.status,
      })
    })
  })
  return rows.sort((a, b) => new Date(b.date) - new Date(a.date))
}

export default function AssignToUser() {
  const canCreate = usePermission('Inventory', 'Create')
  const navigate = useNavigate()
  const [assignments, setAssignments] = useState(getUserAssignments)
  useEffect(() => subscribeUserAssignments(setAssignments), [])

  // Assignment-record-level aggregates — these stay meaningful counted
  // against the raw records, not the flattened line rows below (a single
  // handoff with three line items is still one handoff, one engineer
  // touchpoint, not three).
  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      total: assignments.length,
      today: assignments.filter(a => (a.assignedAt || '').slice(0, 10) === today).length,
      engineers: new Set(assignments.map(a => a.engineerId)).size,
    }
  }, [assignments])

  const [search, setSearch] = useState('')

  const allRows = useMemo(() => flattenRows(assignments), [assignments])
  const rows = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return allRows
    return allRows.filter(r =>
      r.assignmentNumber.toLowerCase().includes(q) ||
      r.engineerName.toLowerCase().includes(q) ||
      r.userLabel.toLowerCase().includes(q) ||
      r.productName.toLowerCase().includes(q) ||
      r.serialMac.toLowerCase().includes(q)
    )
  }, [allRows, search])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Assign to User</h1>
          <p className="text-sm text-gray-500 mt-0.5">{rows.length} of {allRows.length} handoff lines</p>
        </div>
        {canCreate && <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate('/inventory/assign-to-user/new')}>Assign to User</Button>}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Handoffs',      value: stats.total,     icon: ClipboardList, color: 'text-brand-blue',  bg: 'bg-brand-blue/10' },
          { label: "Today's Handoffs",    value: stats.today,     icon: CalendarDays,  color: 'text-emerald-600', bg: 'bg-emerald-50' },
          { label: 'Engineers Involved',  value: stats.engineers, icon: UserCog,       color: 'text-purple-600',  bg: 'bg-purple-50' },
        ].map(s => (
          <div key={s.label} className="bg-white rounded-xl border border-surface-border shadow-card px-4 py-3 flex items-center gap-3">
            <div className={`w-9 h-9 rounded-lg flex items-center justify-center shrink-0 ${s.bg}`}>
              <s.icon size={18} className={s.color} />
            </div>
            <div className="min-w-0">
              <p className="text-xl font-bold text-gray-900">{s.value}</p>
              <p className="text-[11px] text-gray-500 leading-tight">{s.label}</p>
            </div>
          </div>
        ))}
      </div>

      <div className="relative">
        <Search size={14} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
        <input
          value={search}
          onChange={e => setSearch(e.target.value)}
          placeholder="Search assignment number, engineer, product, serial/MAC, user…"
          className="pl-9 pr-3 py-1.5 text-sm w-96 bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Engineer</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Type</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Product</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Serial/MAC No.</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">User</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Status</th>
                <th className="px-4 py-3 w-16 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center text-sm text-gray-400">
                    <Users size={32} className="mx-auto mb-2 text-gray-200" />
                    No user assignments found
                  </td>
                </tr>
              ) : rows.map(r => (
                <tr key={r.key} onClick={() => navigate(`/inventory/assign-to-user/${r.assignmentId}/edit`)} className="cursor-pointer hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{(r.date || '').slice(0, 10)}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">{r.engineerName}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={TYPE_BADGE[r.assignmentType] ?? 'blue'} size="sm">{TYPE_LABEL[r.assignmentType] ?? 'New'}</Badge>
                  </td>
                  <td className="px-4 py-3 text-gray-800 text-xs font-medium whitespace-nowrap">{r.productName}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono">{r.serialMac}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{r.userLabel}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap font-semibold">{r.qty}</td>
                  <td className="px-4 py-3">
                    <Badge variant={STATUS_BADGE[r.status] ?? 'gray'} dot size="sm">{r.status}</Badge>
                  </td>
                  <td className="px-4 py-3 w-16 text-center" onClick={e => e.stopPropagation()}>
                    <button
                      onClick={() => navigate(`/inventory/assign-to-user/${r.assignmentId}/edit`)}
                      title="Edit"
                      className="w-7 h-7 flex items-center justify-center rounded-lg text-gray-400 hover:text-brand-blue hover:bg-brand-blue/10 transition-colors mx-auto"
                    >
                      <Pencil size={14} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  )
}
