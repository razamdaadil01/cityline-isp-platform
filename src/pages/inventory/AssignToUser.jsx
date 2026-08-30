import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, MoreVertical, Edit2, Undo2, Users, CalendarDays, UserCog, ClipboardList, AlertTriangle } from 'lucide-react'
import Badge from '../../components/ui/Badge'
import Button from '../../components/ui/Button'
import Modal from '../../components/ui/Modal'
import { getUserAssignments, subscribeUserAssignments, reverseUserAssignmentItem } from '../../data/userAssignmentStore'
import { getUnits } from '../../data/inventoryLedger'
import { usePermission } from '../../data/rolesStore'

const STATUS_BADGE = { 'Handed Off': 'purple', Reversed: 'gray' }
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

// A handed-off line is only offered for reversal while the unit it named is
// still sitting untouched with the user — i.e. its live ledger status is
// still 'Assigned to User' (not since Replaced, or moved on some other
// way). Same idea as Assignments.jsx's own lineStatus()-gated "Back to
// Store" and Store Transfer's isLineReversible(). Quantity/wire lines have
// no discrete per-unit identity to check — same laxness Assign to
// Engineer's own quantity-line return already accepts.
function isItemReversible(it) {
  const values = [...it.serials, ...it.macs]
  if (!values.length) return true
  return values.every(v => {
    const unit = getUnits({ productId: it.productId }).find(u => u.value === v)
    return !!unit && unit.status === 'Assigned to User'
  })
}

// Flattens each assignment's items into one row per line — Date/Engineer/
// Type/User repeat per line, Product/Serial-MAC/Qty vary per line — same
// (record × item-line) flattening pattern Assignments.jsx uses for Assign
// to Engineer, reused here so the two lists stay consistent. Each row keeps
// its own assignmentId + itemId so the 3-dot menu can target the exact line
// to edit/reverse.
function flattenRows(assignments) {
  const rows = []
  assignments.forEach(a => {
    a.items.forEach(it => {
      rows.push({
        key: `${a.id}-${it.id}`, assignmentId: a.id, itemId: it.id, assignmentNumber: a.assignmentNumber,
        date: a.assignedAt, engineerName: a.engineerName, assignmentType: a.assignmentType,
        userLabel: userLabel(a),
        productName: it.productName,
        serialMac: serialMacLabel(it),
        qty: qtyLabel(it),
        status: a.status,
        reversible: isItemReversible(it),
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

  const [menuId, setMenuId] = useState(null)
  const [menuPos, setMenuPos] = useState({ top: 0, right: 0 })
  const menuRef = useRef(null)

  useEffect(() => {
    if (!menuId) return
    function handleClick(e) { if (menuRef.current && !menuRef.current.contains(e.target)) setMenuId(null) }
    document.addEventListener('mousedown', handleClick)
    return () => document.removeEventListener('mousedown', handleClick)
  }, [menuId])

  function openMenu(e, id) {
    e.stopPropagation()
    const rect = e.currentTarget.getBoundingClientRect()
    setMenuPos({ top: rect.bottom + 4, right: window.innerWidth - rect.right })
    setMenuId(id)
  }

  // "Reverse Handoff" undoes one line — removing it from the assignment's
  // own `items` array is all that's needed since inventoryLedger.js's
  // computeLedger() derives every unit's status/held balance purely from
  // CURRENT user assignments' item contents (see
  // reverseUserAssignmentItem in userAssignmentStore.js). Confirmed via
  // this Modal, same as Assignments.jsx's own "Back to Store" confirmation.
  const [reverseTarget, setReverseTarget] = useState(null)
  const [reverseError, setReverseError] = useState('')

  function confirmReverse() {
    if (!reverseTarget) return
    try {
      reverseUserAssignmentItem(reverseTarget.assignmentId, reverseTarget.itemId)
      setReverseTarget(null)
      setReverseError('')
    } catch (err) {
      setReverseError(err.message || 'Could not reverse this handoff line.')
    }
  }

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
                <tr key={r.key} className="hover:bg-blue-50/40 transition-colors">
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
                  <td className="px-4 py-3 w-16 text-center">
                    <button
                      onClick={e => openMenu(e, r.key)}
                      className={`w-7 h-7 flex items-center justify-center rounded-lg transition-colors mx-auto ${menuId === r.key ? 'bg-gray-100 text-gray-700' : 'text-gray-400 hover:text-gray-600 hover:bg-gray-100'}`}
                    >
                      <MoreVertical size={15} />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {menuId && (() => {
        const row = rows.find(r => r.key === menuId)
        if (!row) return null
        return (
          <div
            ref={menuRef}
            style={{ position: 'fixed', top: menuPos.top, right: menuPos.right, zIndex: 9999 }}
            className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-48"
          >
            <button onClick={() => { navigate(`/inventory/assign-to-user/${row.assignmentId}/edit`); setMenuId(null) }} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              <Edit2 size={13} className="text-gray-400 shrink-0" /> Edit
            </button>
            <button
              onClick={() => { if (!row.reversible) return; setReverseTarget(row); setReverseError(''); setMenuId(null) }}
              disabled={!row.reversible}
              title={!row.reversible ? 'This unit has already moved on with the user — cannot reverse' : undefined}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors ${!row.reversible ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <Undo2 size={13} className={!row.reversible ? 'text-gray-300 shrink-0' : 'text-emerald-500 shrink-0'} /> Back to Engineer
            </button>
          </div>
        )
      })()}

      <Modal
        isOpen={!!reverseTarget}
        onClose={() => { setReverseTarget(null); setReverseError('') }}
        title="Back to Engineer"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setReverseTarget(null); setReverseError('') }}>Cancel</Button>
            <Button onClick={confirmReverse}>Confirm</Button>
          </>
        }
      >
        {reverseTarget && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Move <span className="font-semibold text-gray-900">{reverseTarget.qty} × {reverseTarget.productName}</span> from{' '}
              <span className="font-semibold text-gray-900">{reverseTarget.userLabel}</span> back into{' '}
              <span className="font-semibold text-gray-900">{reverseTarget.engineerName}</span>'s holdings?
            </p>
            {reverseError && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {reverseError}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
