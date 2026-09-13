import { useState, useMemo, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { Plus, Search, ArrowLeftRight, CalendarDays, Store as StoreIcon, MoreVertical, Edit2, Undo2, AlertTriangle, FileText, PackageCheck, Upload } from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import Modal from '../../components/ui/Modal'
import { FormField, Input } from '../../components/ui/FormInputs'
import { getStoreTransfers, subscribeStoreTransfers, reverseStoreTransferLine, receiveStoreTransfer } from '../../data/storeTransferStore'
import { getUnits, getDrums } from '../../data/inventoryLedger'
import { getProduct } from '../../data/productStore'
import { usePermission } from '../../data/rolesStore'

// 'Sent' reuses the 'yellow' variant, which is this app's actual amber tone
// (Badge.jsx's own yellow = bg-amber-100/text-amber-700) — matches the same
// "awaiting a decision/action" color Purchase Orders' own 'Approval
// Request' status already uses. 'Reversed' matches Assign to User's own
// 'Reversed' status color (gray) for the same word elsewhere in this app.
const STATUS_BADGE = { Completed: 'green', Sent: 'yellow', Reversed: 'gray' }

// Same live-lookup helper as CreateStoreTransfer.jsx's/CreateAssignment.jsx's
// own liveTrackingType — reads the product's *current* Tracking
// Configuration so a quantity-tracked line (e.g. Wall Mount Bracket) never
// gets misread as carrying a serial/MAC/drum identifier just because one of
// its item fields happens to be non-empty.
function liveTrackingType(productId) {
  const p = getProduct(productId)
  if (!p) return 'quantity'
  if (p.trackedBySerial && p.trackedByMac) return 'dual'
  if (p.trackedBySerial) return 'serial'
  if (p.trackedByMac) return 'mac'
  return 'quantity'
}

// A transferred line is only offered for reversal while what it moved is
// still sitting untouched — either already 'Available' at Store To (a
// 'Completed' transfer), or still 'In Transit' and tied to this exact
// transfer (a 'Sent' one awaiting receipt — see inventoryLedger.js's own
// Store Transfers block for what 'In Transit' means and when it's set).
// Serial/MAC units are checked against their own live ledger status (same
// idea as Assignments.jsx's own lineStatus() gating "Back to Store"); an
// In-Transit unit's storeId is still Store From's (it hasn't arrived
// anywhere), so the lookup below deliberately doesn't filter by storeId up
// front — it checks storeId only for the 'Available' case, and
// `lastTransferNumber` (set on every transfer this unit was ever part of)
// to confirm an In-Transit unit is tied to THIS transfer specifically, not
// some other one it happens to still be mid-flight on. Wire lines are
// checked against the specific transfer-scoped destination drum
// inventoryLedger.js's Store Transfers block creates for them once
// Completed (a Sent line's meters have already left the source drum but
// don't yet exist as any destination drum, so there's nothing to check
// against — still freely reversible while 'Sent', no explicit "in transit"
// case for drums the way there is for units). Quantity-tracked lines have
// no discrete per-line identity to check —
// same laxness Assign to Engineer's own quantity-line "Back to Store"
// already accepts — so those stay reversible as long as the transfer
// itself hasn't already been reversed.
function isLineReversible(t, it) {
  const values = [...it.serials, ...it.macs]
  if (values.length) {
    if (t.status === 'Sent') {
      return values.every(v => {
        const unit = getUnits({ productId: it.productId, storeId: t.storeFromId }).find(u => u.value === v)
        return !!unit && unit.status === 'In Transit' && unit.lastTransferNumber === t.transferNumber
      })
    }
    return values.every(v => {
      const unit = getUnits({ productId: it.productId }).find(u => u.value === v)
      if (!unit) return false
      if (unit.status === 'Available' && unit.storeId === t.storeToId) return true
      if (unit.status === 'In Transit' && unit.lastTransferNumber === t.transferNumber) return true
      return false
    })
  }
  if (it.drumNumber) {
    if (t.status === 'Sent') return true
    const destDrumNumber = `${it.drumNumber}-${t.transferNumber}`
    const destDrum = getDrums({ productId: it.productId, storeId: t.storeToId }).find(d => d.drumNumber === destDrumNumber)
    return !!destDrum && destDrum.remainingMeters >= it.qty
  }
  return true
}

// Serial/MAC/Drum identifier for one line — same split Assignments.jsx's
// own flattenRows() uses (a dedicated identifier column instead of folding
// a bare quantity into it): a serial/MAC-tracked line shows its unit
// value(s) (dual-tracked pairs each serial with its own MAC, same combined
// display CreateStoreTransfer.jsx's own line rows use), a wire line shows
// its drum number, and a quantity-tracked line — which has no unit
// identifier at all — shows '—' rather than misleadingly echoing its qty.
function serialMacDrumLabel(it, trackingType) {
  if (it.drumNumber) return it.drumNumber
  if (trackingType === 'dual') return it.serials.map((s, i) => `${s} / MAC:${it.macs[i] ?? '—'}`).join(', ') || '—'
  if (trackingType === 'serial') return it.serials.join(', ') || '—'
  if (trackingType === 'mac') return it.macs.join(', ') || '—'
  return '—'
}

// Actual transferred quantity for one line, regardless of tracking type —
// 1 (or more) for a serial/MAC unit, the real qty for a quantity-tracked
// product, meters (suffixed) for a wire/drum line. Math.max(serials.length,
// macs.length) rather than their combined length avoids double-counting a
// dual-tracked unit (same fix Assign to User's own qtyLabel() applies) —
// `it.qty` on a Store Transfer item is stored as serials.length +
// macs.length (see storeTransferStore.js's validateAndBuildItems), which
// would otherwise double it for dual-tracked lines.
function qtyValue(it, trackingType) {
  if (it.drumNumber) return `${it.qty}m`
  if (trackingType === 'dual' || trackingType === 'serial' || trackingType === 'mac') return Math.max(it.serials.length, it.macs.length)
  return it.qty
}

// Flattens { transfer, items: [...] } into one row per line — Date/Store
// From/Store To/Assigned By repeat per line, Product Name/Serial-MAC-Drum/
// Qty vary per line, matching the table shape the PRD asks for (same
// (record × item-line) flattening pattern Assignments.jsx uses for Assign
// to Engineer). Each row keeps its own transferId + itemId so the 3-dot
// menu can target the exact line to edit/reverse.
function flattenRows(transfers) {
  const rows = []
  transfers.forEach(t => {
    t.items.forEach(it => {
      const trackingType = liveTrackingType(it.productId)
      rows.push({
        key: `${t.id}-${it.id}`, transferId: t.id, itemId: it.id, transferNumber: t.transferNumber,
        date: t.date,
        storeFromName: t.storeFromName, storeToName: t.storeToName,
        productName: it.productName,
        serialMacDrumLabel: serialMacDrumLabel(it, trackingType),
        qty: qtyValue(it, trackingType),
        assignedBy: t.assignedBy,
        status: t.status,
        reversible: isLineReversible(t, it),
      })
    })
  })
  return rows.sort((a, b) => new Date(b.date) - new Date(a.date))
}

export default function StoreTransfer() {
  const canCreate = usePermission('Inventory', 'Create')
  const navigate = useNavigate()
  const [transfers, setTransfers] = useState(getStoreTransfers)
  useEffect(() => subscribeStoreTransfers(setTransfers), [])

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

  // "Reverse Transfer" undoes one line — removing it from the transfer's
  // own `items` is all that's needed since inventoryLedger.js's
  // computeLedger() derives every unit's storeId/balance/drum meters purely
  // from current transfers' item contents (see reverseStoreTransferLine in
  // storeTransferStore.js). Confirmed via this Modal, same as Assignments.jsx's
  // own "Back to Store" confirmation.
  const [reverseTarget, setReverseTarget] = useState(null)
  const [reverseError, setReverseError] = useState('')

  function confirmReverse() {
    if (!reverseTarget) return
    try {
      reverseStoreTransferLine(reverseTarget.transferId, reverseTarget.itemId)
      setReverseTarget(null)
      setReverseError('')
    } catch (err) {
      setReverseError(err.message || 'Could not reverse this transfer line.')
    }
  }

  // "Receive Transfer" confirms a 'Sent' shipment has arrived — every
  // transfer goes through this Send → Receive step now, same-city or
  // cross-city alike. Acts on the whole transfer (not a single line), same
  // as Edit/View
  // Delivery Challan already do off row.transferId, since receiving is a
  // single physical shipment landing, not a per-line action. Flips the
  // whole transfer to 'Completed' via receiveStoreTransfer(), which is what
  // actually applies the destination-side ledger effect (see
  // inventoryLedger.js's own Store Transfers block). The signed challan
  // upload uses the same FileReader.readAsDataURL() pattern as
  // SalesNewLead.jsx's ProfilePictureUpload — converted here in the UI
  // layer into a plain { name, size, type, preview } object before being
  // handed to the (synchronous) store function, never inside the store
  // itself. Optional — the receiver may not always have a scanner/camera
  // on hand; the transfer still completes without one.
  const [receiveTarget, setReceiveTarget] = useState(null)
  const [receivedByInput, setReceivedByInput] = useState('Admin User')
  const [signedChallanFile, setSignedChallanFile] = useState(null)
  const [receiveError, setReceiveError] = useState('')
  const receiveFileRef = useRef(null)

  function openReceiveModal(row) {
    setReceiveTarget(row)
    setReceivedByInput('Admin User')
    setSignedChallanFile(null)
    setReceiveError('')
  }

  function handleSignedChallanFile(file) {
    if (!file) return
    const reader = new FileReader()
    reader.onload = ev => setSignedChallanFile({ name: file.name, size: file.size, type: file.type, preview: ev.target.result })
    reader.readAsDataURL(file)
  }

  function confirmReceive() {
    if (!receiveTarget) return
    try {
      receiveStoreTransfer(receiveTarget.transferId, { receivedBy: receivedByInput.trim() || 'Admin User', signedChallanFile })
      setReceiveTarget(null)
      setReceiveError('')
    } catch (err) {
      setReceiveError(err.message || 'Could not receive this transfer.')
    }
  }

  const stats = useMemo(() => {
    const today = new Date().toISOString().slice(0, 10)
    return {
      total: transfers.length,
      today: transfers.filter(t => (t.date || '').slice(0, 10) === today).length,
    }
  }, [transfers])

  const [search, setSearch] = useState('')

  const allRows = useMemo(() => flattenRows(transfers), [transfers])
  const rows = useMemo(() => {
    const q = search.toLowerCase().trim()
    if (!q) return allRows
    return allRows.filter(r =>
      r.productName.toLowerCase().includes(q) ||
      r.storeFromName.toLowerCase().includes(q) ||
      r.storeToName.toLowerCase().includes(q) ||
      r.serialMacDrumLabel.toLowerCase().includes(q) ||
      r.assignedBy.toLowerCase().includes(q)
    )
  }, [allRows, search])

  return (
    <div className="p-6 space-y-5">
      <div className="flex items-center justify-between">
        <div>
          <h1 className="text-2xl font-bold text-gray-900">Store Transfer</h1>
          <p className="text-sm text-gray-500 mt-0.5">{rows.length} of {allRows.length} transfer lines</p>
        </div>
        {canCreate && <Button size="sm" icon={<Plus size={14} />} onClick={() => navigate('/inventory/store-transfer/new')}>Transfer Product</Button>}
      </div>

      {/* Summary cards */}
      <div className="grid grid-cols-2 sm:grid-cols-3 gap-3">
        {[
          { label: 'Total Transfers',   value: stats.total, icon: ArrowLeftRight, color: 'text-brand-blue',  bg: 'bg-brand-blue/10' },
          { label: "Today's Transfers", value: stats.today, icon: CalendarDays,   color: 'text-emerald-600', bg: 'bg-emerald-50' },
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
          placeholder="Search product, store, serial, assigned by…"
          className="pl-9 pr-3 py-1.5 text-sm w-96 bg-white border border-surface-border rounded-lg focus:outline-none focus:ring-2 focus:ring-brand-blue/30"
        />
      </div>

      <div className="bg-white rounded-xl shadow-card border border-surface-border overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-surface-border bg-gray-50/60">
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Product Name</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Store From</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Store To</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Transfer Date</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide">Serial/MAC/Drum</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Qty</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Assigned By</th>
                <th className="px-4 py-3 text-left text-xs font-semibold text-gray-500 uppercase tracking-wide whitespace-nowrap">Status</th>
                <th className="px-4 py-3 w-16 text-center text-xs font-semibold text-gray-500 uppercase tracking-wide">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-surface-border">
              {rows.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-4 py-14 text-center text-sm text-gray-400">
                    <StoreIcon size={32} className="mx-auto mb-2 text-gray-200" />
                    No store transfers found
                  </td>
                </tr>
              ) : rows.map(r => (
                <tr key={r.key} className="hover:bg-blue-50/40 transition-colors">
                  <td className="px-4 py-3 text-gray-800 text-xs font-medium whitespace-nowrap">{r.productName}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">{r.storeFromName}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap">{r.storeToName}</td>
                  <td className="px-4 py-3 text-gray-500 text-xs whitespace-nowrap">{(r.date || '').slice(0, 10)}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs font-mono">{r.serialMacDrumLabel}</td>
                  <td className="px-4 py-3 text-gray-700 text-xs whitespace-nowrap font-semibold">{r.qty}</td>
                  <td className="px-4 py-3 text-gray-600 text-xs whitespace-nowrap">{r.assignedBy}</td>
                  <td className="px-4 py-3 whitespace-nowrap">
                    <Badge variant={STATUS_BADGE[r.status] ?? 'gray'} dot size="sm">{r.status === 'Sent' ? 'In Transit' : r.status}</Badge>
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
            className="bg-white rounded-xl border border-surface-border shadow-xl py-1 w-52"
          >
            <button onClick={() => { navigate(`/inventory/store-transfer/${row.transferId}/edit`); setMenuId(null) }} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              <Edit2 size={13} className="text-gray-400 shrink-0" /> Edit
            </button>
            <button onClick={() => { navigate(`/inventory/store-transfer/${row.transferId}/challan`); setMenuId(null) }} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
              <FileText size={13} className="text-gray-400 shrink-0" /> View Delivery Challan
            </button>
            {row.status === 'Sent' && (
              <button onClick={() => { openReceiveModal(row); setMenuId(null) }} className="flex items-center gap-2.5 w-full px-3 py-2 text-xs text-gray-700 hover:bg-gray-50 transition-colors">
                <PackageCheck size={13} className="text-brand-blue shrink-0" /> Receive Transfer
              </button>
            )}
            <button
              onClick={() => { if (!row.reversible) return; setReverseTarget(row); setReverseError(''); setMenuId(null) }}
              disabled={!row.reversible}
              title={!row.reversible ? 'This line has already moved on at the destination store — cannot reverse' : undefined}
              className={`flex items-center gap-2.5 w-full px-3 py-2 text-xs transition-colors ${!row.reversible ? 'text-gray-300 cursor-not-allowed' : 'text-gray-700 hover:bg-gray-50'}`}
            >
              <Undo2 size={13} className={!row.reversible ? 'text-gray-300 shrink-0' : 'text-emerald-500 shrink-0'} /> Reverse Transfer
            </button>
          </div>
        )
      })()}

      <Modal
        isOpen={!!reverseTarget}
        onClose={() => { setReverseTarget(null); setReverseError('') }}
        title="Reverse Transfer"
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
              Move <span className="font-semibold text-gray-900">{reverseTarget.qty} × {reverseTarget.productName}</span> back from{' '}
              <span className="font-semibold text-gray-900">{reverseTarget.storeToName}</span> to{' '}
              <span className="font-semibold text-gray-900">{reverseTarget.storeFromName}</span>?
            </p>
            {reverseError && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {reverseError}
              </div>
            )}
          </div>
        )}
      </Modal>

      <Modal
        isOpen={!!receiveTarget}
        onClose={() => { setReceiveTarget(null); setReceiveError('') }}
        title="Receive Transfer"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => { setReceiveTarget(null); setReceiveError('') }}>Cancel</Button>
            <Button onClick={confirmReceive}>Confirm Receipt</Button>
          </>
        }
      >
        {receiveTarget && (
          <div className="space-y-3">
            <p className="text-sm text-gray-600">
              Confirm transfer <span className="font-semibold text-gray-900">{receiveTarget.transferNumber}</span> has arrived at{' '}
              <span className="font-semibold text-gray-900">{receiveTarget.storeToName}</span>? All items on this transfer become available there once received.
            </p>
            <FormField label="Received By">
              <Input value={receivedByInput} onChange={e => setReceivedByInput(e.target.value)} placeholder="Name of person receiving" />
            </FormField>
            <FormField label="Signed Challan Copy (optional)">
              <input
                ref={receiveFileRef}
                type="file"
                accept="image/*,.pdf"
                className="hidden"
                onChange={e => handleSignedChallanFile(e.target.files?.[0] ?? null)}
              />
              <button
                type="button"
                onClick={() => receiveFileRef.current?.click()}
                className="flex items-center gap-2 px-3 py-2 text-xs text-gray-600 border border-dashed border-surface-border rounded-lg hover:bg-gray-50 transition-colors w-full justify-center"
              >
                <Upload size={13} className="text-gray-400" />
                {signedChallanFile ? 'Replace uploaded file' : 'Upload signed challan copy'}
              </button>
              {signedChallanFile && (
                <div className="mt-2 flex items-center gap-2">
                  {signedChallanFile.type?.startsWith('image/') ? (
                    <img src={signedChallanFile.preview} alt="Signed challan preview" className="w-14 h-14 object-cover rounded-lg border border-surface-border" />
                  ) : (
                    <FileText size={20} className="text-gray-400" />
                  )}
                  <span className="text-xs text-gray-500 truncate">{signedChallanFile.name}</span>
                </div>
              )}
            </FormField>
            <p className="text-[11px] text-gray-400">
              The receiver is expected to sign the printed delivery challan and upload a photo/scan as proof of receipt.
            </p>
            {receiveError && (
              <div className="flex items-start gap-2 px-3 py-2 rounded-lg bg-red-50 text-red-600 text-xs">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {receiveError}
              </div>
            )}
          </div>
        )}
      </Modal>
    </div>
  )
}
