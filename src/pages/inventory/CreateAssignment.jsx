import { useState, useEffect, useMemo } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import {
  ArrowLeft, ChevronLeft, ChevronRight, MapPin, UserCog, ClipboardList,
  PackageOpen, CheckCircle2, Search, AlertTriangle, Check,
} from 'lucide-react'
import Button from '../../components/ui/Button'
import Badge from '../../components/ui/Badge'
import { FormField, Textarea } from '../../components/ui/FormInputs'
import StepProgress from '../../components/customer-type/StepProgress'
import { getStores } from '../../data/storeStore'
import { getProduct } from '../../data/productStore'
import { getUnits, getDrums, getProductAvailability } from '../../data/inventoryLedger'
import {
  getStoreForBranch, getEngineersForBranch, getAssignableWorkOrders, getWorkOrder,
  resolveWorkOrderRequirement, saveAssignment,
} from '../../data/assignmentStore'

const STEPS = [
  { id: 1, label: 'Branch',       icon: MapPin },
  { id: 2, label: 'Engineer',     icon: UserCog },
  { id: 3, label: 'Requirement',  icon: ClipboardList },
  { id: 4, label: 'Select Items', icon: PackageOpen },
  { id: 5, label: 'Confirm',      icon: CheckCircle2 },
]

// ── Step 4 line cards ────────────────────────────────────────────────────

// Always reads the product's *current* Tracking Type live from
// productStore.js rather than a value captured once and cached in hwLines
// state — a Tracking Type changed in Product Management after this Work
// Order/store was already selected earlier in the same session must be
// reflected immediately, never silently stale. Called fresh on every
// render, same as getProductAvailability()/getUnits() calls elsewhere in
// this file already are.
function liveTrackingType(productId) {
  return productId ? (getProduct(productId)?.trackingType ?? 'quantity') : 'quantity'
}

// Raw store availability for a hardware line, ignoring what other lines on
// THIS assignment might also want — used only to answer "does this store
// have any of this product at all," not to cap an input.
function hwLineAvailability(l, storeId) {
  if (!l.productId) return 0
  return liveTrackingType(l.productId) === 'quantity'
    ? getProductAvailability(l.productId, storeId)
    : getUnits({ productId: l.productId, storeId, status: 'Available' }).length
}

function wireLineAvailability(l, storeId) {
  if (!l.productId) return 0
  return getDrums({ productId: l.productId, storeId })
    .filter(d => d.remainingMeters > 0)
    .reduce((s, d) => s + d.remainingMeters, 0)
}

// A required line the store genuinely has zero stock/serials/drums for —
// there's nothing for the user to pick, so it can't be treated as "must be
// filled to submit." It's still shown as unfulfilled (see outOfStock prop
// on the line cards, and the Step 5 "Not Fulfilled" list), just not a
// blocker — a partial assignment (issue what's in stock, leave the rest
// pending) is a legitimate outcome, not an error state.
function isHwLineOutOfStock(l, storeId) {
  return !!l.productId && Number(l.requiredQty) > 0 && hwLineAvailability(l, storeId) === 0
}
function isWireLineOutOfStock(l, storeId) {
  return !!l.productId && Number(l.requiredMeters) > 0 && wireLineAvailability(l, storeId) === 0
}

// A hardware line with no requirement, no matching product (the amber
// "cannot be issued" card has no input to fill in the first place), or
// genuinely zero stock at this store is trivially "complete" — nothing
// blocks submission on it. Otherwise it needs a real pick matching its
// live tracking type.
function isHwLineComplete(l, storeId) {
  if (!l.productId || Number(l.requiredQty) <= 0 || isHwLineOutOfStock(l, storeId)) return true
  return liveTrackingType(l.productId) === 'quantity'
    ? (Number(l.assignedQty) || 0) > 0
    : (l.serials.length + l.macs.length) > 0
}

function isWireLineComplete(l, storeId) {
  if (!l.productId || Number(l.requiredMeters) <= 0 || isWireLineOutOfStock(l, storeId)) return true
  return (Number(l.assignedMeters) || 0) > 0
}

function HardwareLineCard({ line, storeId, otherLines, onChange, showError, outOfStock }) {
  const trackingType = liveTrackingType(line.productId)
  const usedElsewhere = otherLines.reduce((s, l) => l.productId === line.productId ? s + (liveTrackingType(l.productId) === 'quantity' ? Number(l.assignedQty) || 0 : l.serials.length + l.macs.length) : s, 0)
  const grossAvailable = line.productId ? getProductAvailability(line.productId, storeId) : 0
  // Room left for THIS line to still grow into (excludes its own current
  // pick) — used as the input's max. The badge instead shows what's left in
  // the pool including this line's own pick, so it visibly decrements as
  // the user raises the qty, not just when other lines consume stock.
  const roomToGrow = Math.max(0, grossAvailable - usedElsewhere)
  const remainingInPool = Math.max(0, grossAvailable - usedElsewhere - (Number(line.assignedQty) || 0))

  if (!line.productId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-gray-800">{line.name}</p>
        <p className="text-xs text-amber-700 mt-1 flex items-center gap-1.5"><AlertTriangle size={12} /> No matching product in Inventory — cannot be issued from this flow.</p>
      </div>
    )
  }

  const pickedElsewhere = new Set(otherLines.flatMap(l => [...l.serials, ...l.macs]))
  const errorBorder = showError ? 'border-red-300 bg-red-50/30' : outOfStock ? 'border-amber-200 bg-amber-50/40' : 'border-surface-border'

  if (trackingType === 'serial' || trackingType === 'mac') {
    const kindLabel = trackingType === 'serial' ? 'Serial' : 'MAC'
    const units = getUnits({ productId: line.productId, storeId, status: 'Available' }).filter(u => !pickedElsewhere.has(u.value))
    const picked = trackingType === 'serial' ? line.serials : line.macs
    // Units already checked on THIS line stay visible in the list (so they
    // can be unchecked) but no longer count toward "available" — matching
    // the same self-inclusive live-decrement the quantity-only input uses.
    const remainingAvailable = Math.max(0, units.length - picked.length)
    const atRequiredCap = picked.length >= line.requiredQty
    function toggle(value) {
      const isPicked = picked.includes(value)
      if (!isPicked && atRequiredCap) return
      const next = isPicked ? picked.filter(v => v !== value) : [...picked, value]
      onChange(trackingType === 'serial' ? { serials: next } : { macs: next })
    }
    return (
      <div className={`rounded-xl border p-4 space-y-3 ${errorBorder}`}>
        <div className="flex items-center justify-between">
          <div>
            <p className="text-sm font-semibold text-gray-800">{line.productName}</p>
            <p className="text-xs text-gray-400">Required: {line.requiredQty} · {kindLabel}-tracked</p>
          </div>
          <Badge variant={remainingAvailable > 0 ? 'green' : 'gray'} size="sm">{picked.length} selected · {remainingAvailable} available</Badge>
        </div>
        {units.length === 0 ? (
          outOfStock ? (
            <p className="text-xs text-amber-700 flex items-center gap-1.5 py-2"><AlertTriangle size={12} /> Out of stock at this store — this line will be left unfulfilled in this assignment.</p>
          ) : (
            <p className="text-xs text-gray-400 py-2">No available {kindLabel.toLowerCase()} units for this product at this store.</p>
          )
        ) : (
          <>
            <div className="grid grid-cols-2 sm:grid-cols-3 gap-2 max-h-48 overflow-y-auto">
              {units.map(u => {
                const isPicked = picked.includes(u.value)
                const disabled = !isPicked && atRequiredCap
                return (
                  <label key={u.value} className={`flex items-center gap-2 px-2.5 py-2 rounded-lg border text-xs font-mono transition-colors ${
                    isPicked ? 'border-brand-blue bg-brand-blue/5 text-brand-blue cursor-pointer'
                      : disabled ? 'border-surface-border text-gray-300 cursor-not-allowed'
                      : 'border-surface-border text-gray-600 hover:bg-gray-50 cursor-pointer'
                  }`}>
                    <input type="checkbox" checked={isPicked} disabled={disabled} onChange={() => toggle(u.value)} className="accent-brand-blue" />
                    {u.value}
                  </label>
                )
              })}
            </div>
            {atRequiredCap && <p className="text-[11px] text-gray-400">Required quantity reached — uncheck a unit to pick a different one.</p>}
          </>
        )}
        {showError && (
          <p className="text-xs text-red-600 flex items-center gap-1.5"><AlertTriangle size={12} /> Select at least one {kindLabel.toLowerCase()} for this line.</p>
        )}
      </div>
    )
  }

  // Quantity-only
  return (
    <div className={`rounded-xl border p-4 space-y-3 ${errorBorder}`}>
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-gray-800">{line.productName}</p>
          <p className="text-xs text-gray-400">Required: {line.requiredQty}</p>
        </div>
        <Badge variant={remainingInPool > 0 ? 'green' : outOfStock ? 'gray' : 'red'} size="sm">{remainingInPool} available</Badge>
      </div>
      <FormField label="Assign Qty">
        <input
          type="number" min="0" max={roomToGrow} disabled={outOfStock}
          value={line.assignedQty}
          onChange={e => {
            const v = Math.max(0, Math.min(roomToGrow, Number(e.target.value) || 0))
            onChange({ assignedQty: v })
          }}
          className="w-32 px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue disabled:bg-gray-50"
        />
      </FormField>
      {outOfStock ? (
        <p className="text-xs text-amber-700 flex items-center gap-1.5"><AlertTriangle size={12} /> Out of stock at this store — this line will be left unfulfilled in this assignment.</p>
      ) : showError && (
        <p className="text-xs text-red-600 flex items-center gap-1.5"><AlertTriangle size={12} /> Enter a quantity to assign for this line.</p>
      )}
    </div>
  )
}

function WireLineCard({ line, storeId, otherLines, onChange, showError, outOfStock }) {
  if (!line.productId) {
    return (
      <div className="rounded-xl border border-amber-200 bg-amber-50 p-4">
        <p className="text-sm font-semibold text-gray-800">{line.name}</p>
        <p className="text-xs text-amber-700 mt-1 flex items-center gap-1.5"><AlertTriangle size={12} /> No matching wire product in Inventory — cannot be issued from this flow.</p>
      </div>
    )
  }

  const drums = getDrums({ productId: line.productId, storeId }).filter(d => d.remainingMeters > 0)
  const usedOnDrum = drumNumber => otherLines.reduce((s, l) => l.drumNumber === drumNumber ? s + (Number(l.assignedMeters) || 0) : s, 0)
  const selectedDrum = drums.find(d => d.drumNumber === line.drumNumber) ?? null
  // roomToGrow (excludes this line's own meters) caps the input; the
  // dropdown option text and remaining-after-pick figure include this
  // line's own meters so they visibly decrement as the user raises it.
  const roomToGrow = selectedDrum ? Math.max(0, selectedDrum.remainingMeters - usedOnDrum(selectedDrum.drumNumber)) : 0

  return (
    <div className={`rounded-xl border p-4 space-y-3 ${showError ? 'border-red-300 bg-red-50/30' : outOfStock ? 'border-amber-200 bg-amber-50/40' : 'border-surface-border'}`}>
      <div>
        <p className="text-sm font-semibold text-gray-800">{line.productName}</p>
        <p className="text-xs text-gray-400">Required: {line.requiredMeters} m</p>
      </div>
      {drums.length === 0 ? (
        outOfStock ? (
          <p className="text-xs text-amber-700 flex items-center gap-1.5 py-2"><AlertTriangle size={12} /> Out of stock at this store — this line will be left unfulfilled in this assignment.</p>
        ) : (
          <p className="text-xs text-gray-400 py-2">No drums with remaining meters for this product at this store.</p>
        )
      ) : (
        <div className="grid grid-cols-2 gap-3">
          <FormField label="Drum">
            <select
              value={line.drumNumber}
              onChange={e => onChange({ drumNumber: e.target.value, assignedMeters: 0 })}
              className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue"
            >
              <option value="">Select drum…</option>
              {drums.map(d => {
                const selfMeters = d.drumNumber === line.drumNumber ? (Number(line.assignedMeters) || 0) : 0
                return (
                  <option key={d.drumNumber} value={d.drumNumber}>{d.drumNumber} — {Math.max(0, d.remainingMeters - usedOnDrum(d.drumNumber) - selfMeters)}m left</option>
                )
              })}
            </select>
          </FormField>
          <FormField label="Meters">
            <input
              type="number" min="0" max={roomToGrow} disabled={!selectedDrum}
              value={line.assignedMeters}
              onChange={e => {
                const v = Math.max(0, Math.min(roomToGrow, Number(e.target.value) || 0))
                onChange({ assignedMeters: v })
              }}
              className="w-full px-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue disabled:bg-gray-50"
            />
          </FormField>
        </div>
      )}
      {showError && (
        <p className="text-xs text-red-600 flex items-center gap-1.5"><AlertTriangle size={12} /> Select a drum and enter meters to assign for this line.</p>
      )}
    </div>
  )
}

export default function CreateAssignment() {
  const navigate = useNavigate()
  const [searchParams, setSearchParams] = useSearchParams()

  const [branchCode, setBranchCode] = useState('')
  const [engineer, setEngineer] = useState(null)
  const [workOrderId, setWorkOrderId] = useState(null)
  const [woSearch, setWoSearch] = useState('')
  const [remarks, setRemarks] = useState('')
  const [hwLines, setHwLines] = useState([])
  const [wireLines, setWireLines] = useState([])
  const [attemptedAction, setAttemptedAction] = useState(null)
  const [saveError, setSaveError] = useState('')

  const stores = getStores().filter(s => s.status === 'active')
  const branches = useMemo(() => [...new Set(stores.map(s => s.branchCode).filter(Boolean))].sort(), [stores])
  const store = branchCode ? getStoreForBranch(branchCode) : null
  const engineers = branchCode ? getEngineersForBranch(branchCode) : []
  const workOrders = (branchCode && engineer) ? getAssignableWorkOrders(branchCode, engineer.name) : []
  const workOrder = workOrderId ? getWorkOrder(workOrderId) : null
  const requirement = useMemo(() => workOrder ? resolveWorkOrderRequirement(workOrder) : { hardware: [], wire: [] }, [workOrder])

  // Rebuild Step 4's editable line state whenever a new Work Order's
  // requirement resolves. Every line starts fully empty — assignedQty: 0,
  // no serials/macs picked, no drum/meters — so landing on Step 4 never
  // shows a reduced Available count before the user has touched anything.
  // A prior draft that never reached Confirm never wrote anything to
  // assignmentStore either: saveAssignment() (called only from
  // handleAssign(), Step 5's "Assign Inventory" button) is the sole place
  // that appends to _assignments, so nothing here or in the ledger's
  // read-only queries below can leave a phantom deduction behind.
  useEffect(() => {
    if (!workOrder || !store) { setHwLines([]); setWireLines([]); return }
    // trackingType is intentionally NOT captured here — HardwareLineCard and
    // every validity check below call liveTrackingType(productId) fresh
    // instead, so a Tracking Type edited in Product Management after this
    // Work Order/store was already selected is picked up immediately rather
    // than staying stuck on whatever it was at the moment this effect ran.
    setHwLines(requirement.hardware.map(h => ({
      name: h.name, productId: h.productId, productName: h.productName, requiredQty: h.requiredQty,
      assignedQty: 0, serials: [], macs: [],
    })))
    setWireLines(requirement.wire.map(w => ({
      name: w.name, productId: w.productId, productName: w.productName, requiredMeters: w.requiredMeters,
      drumNumber: '', assignedMeters: 0,
    })))
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrder?.id, store?.id])

  function updateHwLine(idx, patch) { setHwLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l)) }
  function updateWireLine(idx, patch) { setWireLines(prev => prev.map((l, i) => i === idx ? { ...l, ...patch } : l)) }

  const stepParam = Number(searchParams.get('step'))
  const step = [1, 2, 3, 4, 5].includes(stepParam) ? stepParam : 1

  function isStep1Valid() { return !!branchCode }
  function isStep2Valid() { return !!branchCode && !!engineer && !!workOrderId }
  function isStep3Valid() { return isStep2Valid() }
  // Requires BOTH: at least one item picked overall (unchanged from before —
  // a Work Order whose lines are all unfulfillable/not required can't submit
  // an empty assignment), AND every individual line that HAS stock to pick
  // from has a non-zero pick matching its live tracking type — a line with
  // e.g. required qty but zero serials selected no longer slips through
  // just because some OTHER line on the same Work Order has a pick. A line
  // the store genuinely has zero of (isHwLineComplete/isWireLineComplete
  // exempt it) never blocks submission — a partial assignment, issuing
  // what's actually in stock and leaving the rest pending, is allowed.
  function isStep4Valid() {
    if (hwLines.length === 0 && wireLines.length === 0) return false
    const hwCount = hwLines.reduce((s, l) => s + (liveTrackingType(l.productId) === 'quantity' ? (Number(l.assignedQty) || 0) : l.serials.length + l.macs.length), 0)
    const wireCount = wireLines.reduce((s, l) => s + (Number(l.assignedMeters) || 0), 0)
    return (hwCount > 0 || wireCount > 0)
      && hwLines.every(l => isHwLineComplete(l, store?.id))
      && wireLines.every(l => isWireLineComplete(l, store?.id))
  }

  const stepValid = { 1: isStep1Valid(), 2: isStep2Valid(), 3: isStep3Valid(), 4: isStep4Valid(), 5: true }
  function isReachable(id) {
    if (id === 1) return true
    for (let i = 1; i < id; i++) if (!stepValid[i]) return false
    return true
  }

  function goTo(id) {
    if (!isReachable(id)) return
    setAttemptedAction(null)
    setSearchParams({ step: String(id) })
  }
  function goBack() {
    setAttemptedAction(null)
    if (step === 1) { navigate('/inventory/assign'); return }
    setSearchParams({ step: String(step - 1) })
  }
  function goNext() {
    if (step === 1 && !isStep1Valid()) { setAttemptedAction('step1'); return }
    if (step === 2 && !isStep2Valid()) { setAttemptedAction('step2'); return }
    if (step === 4 && !isStep4Valid()) { setAttemptedAction('step4'); return }
    setAttemptedAction(null)
    setSearchParams({ step: String(Math.min(step + 1, 5)) })
  }

  function handleAssign() {
    if (!isStep4Valid()) { setAttemptedAction('step4'); return }
    setSaveError('')
    try {
      const assignment = saveAssignment({
        engineerId: engineer.id, engineerName: engineer.name,
        branchCode, workOrderId: workOrder.id, workOrderLabel: workOrder.id,
        storeId: store.id, storeName: store.storeName,
        hardwareLines: hwLines.filter(l => l.productId).map(l => ({
          productId: l.productId, productName: l.productName, requiredQty: l.requiredQty,
          assignedQty: l.assignedQty, serials: l.serials, macs: l.macs,
        })),
        wireLines: wireLines.filter(l => l.productId).map(l => ({
          productId: l.productId, productName: l.productName, requiredMeters: l.requiredMeters,
          assignedMeters: l.assignedMeters, drumNumber: l.drumNumber,
        })),
        remarks,
      })
      navigate(`/inventory/assign/${assignment.id}`)
    } catch (err) {
      setSaveError(err.message || 'Could not save this assignment.')
    }
  }

  const filteredWorkOrders = useMemo(() => {
    const q = woSearch.toLowerCase().trim()
    if (!q) return workOrders
    return workOrders.filter(w =>
      w.id.toLowerCase().includes(q) || (w.customerName || '').toLowerCase().includes(q) || (w.plan || '').toLowerCase().includes(q)
    )
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [workOrders, woSearch])

  const issuedHwLines = hwLines.filter(l => l.productId && (liveTrackingType(l.productId) === 'quantity' ? Number(l.assignedQty) > 0 : (l.serials.length + l.macs.length) > 0))
  const issuedWireLines = wireLines.filter(l => l.productId && Number(l.assignedMeters) > 0)
  // Required lines the store has zero stock for — never blocked submission
  // (see isHwLineComplete/isWireLineComplete), but still worth surfacing
  // explicitly at Confirm so a partial assignment is visibly partial, not a
  // silently dropped line.
  const outOfStockHwLines = hwLines.filter(l => isHwLineOutOfStock(l, store?.id))
  const outOfStockWireLines = wireLines.filter(l => isWireLineOutOfStock(l, store?.id))

  return (
    <div className="flex flex-col min-h-screen">
      {/* Header */}
      <div className="p-6 pb-0">
        <div className="flex items-center justify-between gap-4 flex-wrap mb-6">
          <div className="flex items-center gap-3">
            <button
              onClick={() => navigate('/inventory/assign')}
              className="w-9 h-9 flex items-center justify-center rounded-xl border border-surface-border hover:bg-gray-50 text-gray-500 hover:text-gray-700 transition-colors shrink-0"
            >
              <ArrowLeft size={16} />
            </button>
            <div>
              <h1 className="text-xl font-bold text-gray-900">Assign Inventory</h1>
              <p className="text-sm text-gray-500 mt-0.5">
                {engineer ? <>To <span className="font-semibold text-gray-700">{engineer.name}</span>{workOrder ? <> for <span className="font-mono">{workOrder.id}</span></> : null}</> : 'Select a branch to begin'}
              </p>
            </div>
          </div>
          <StepProgress steps={STEPS} current={step} isReachable={isReachable} onSelect={goTo} />
        </div>
      </div>

      {/* Body */}
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-4xl mx-auto p-6 pb-28">
          <div className="bg-white rounded-xl border border-surface-border shadow-card p-6 space-y-5">
            {attemptedAction === 'step1' && !isStep1Valid() && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Select a branch to continue.
              </div>
            )}
            {attemptedAction === 'step2' && !isStep2Valid() && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Select an engineer and a Work Order to continue.
              </div>
            )}
            {attemptedAction === 'step4' && !isStep4Valid() && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> Select at least one item (hardware or wire) to assign, and complete every required line highlighted below.
              </div>
            )}
            {saveError && (
              <div className="flex items-start gap-2 px-3 py-2.5 rounded-lg bg-red-50 border border-red-200 text-xs text-red-600">
                <AlertTriangle size={14} className="shrink-0 mt-0.5" /> {saveError}
              </div>
            )}

            {/* ── Step 1: Branch ── */}
            {step === 1 && (
              <div className="space-y-4">
                <FormField label="Branch" required hint="Determines which engineers, Work Orders and store inventory are available next">
                  <div className="grid grid-cols-3 sm:grid-cols-4 gap-2">
                    {branches.map(b => (
                      <button key={b} type="button" onClick={() => { setBranchCode(b); setEngineer(null); setWorkOrderId(null) }}
                        className={`px-3 py-2.5 text-sm font-medium rounded-lg border transition-colors ${
                          branchCode === b ? 'border-brand-blue bg-brand-blue/5 text-brand-blue' : 'border-surface-border text-gray-600 hover:bg-gray-50'
                        }`}>
                        {b}
                      </button>
                    ))}
                  </div>
                </FormField>
                {branchCode && (
                  <p className="text-xs text-gray-500">Issuing store: <span className="font-medium text-gray-700">{store?.storeName ?? 'No active store for this branch'}</span></p>
                )}
              </div>
            )}

            {/* ── Step 2: Engineer + Work Order ── */}
            {step === 2 && (
              <div className="space-y-5">
                <FormField label="Engineer" required>
                  {engineers.length === 0 ? (
                    <p className="text-xs text-gray-400">No engineers have Work Orders assigned in this branch yet.</p>
                  ) : (
                    <div className="grid grid-cols-2 sm:grid-cols-3 gap-2">
                      {engineers.map(e => (
                        <button key={e.id} type="button" onClick={() => { setEngineer(e); setWorkOrderId(null) }}
                          className={`flex items-center gap-2.5 px-3 py-2.5 rounded-lg border transition-colors text-left ${
                            engineer?.id === e.id ? 'border-brand-blue bg-brand-blue/5' : 'border-surface-border hover:bg-gray-50'
                          }`}>
                          <span className={`w-7 h-7 rounded-full flex items-center justify-center text-white text-[11px] font-bold shrink-0 ${e.color}`}>{e.initials}</span>
                          <span className={`text-sm font-medium ${engineer?.id === e.id ? 'text-brand-blue' : 'text-gray-700'}`}>{e.name}</span>
                        </button>
                      ))}
                    </div>
                  )}
                </FormField>

                {engineer && (
                  <FormField label="Work Order" required hint="Only Work Orders with a completed Assign Team step, not yet issued hardware">
                    <div className="relative mb-2">
                      <Search size={13} className="absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                      <input value={woSearch} onChange={e => setWoSearch(e.target.value)} placeholder="Search Work Order ID, customer, plan…"
                        className="w-full pl-8 pr-3 py-2 text-sm border border-surface-border rounded-lg bg-white focus:outline-none focus:ring-2 focus:ring-brand-blue/30 focus:border-brand-blue" />
                    </div>
                    <div className="border border-surface-border rounded-lg overflow-hidden">
                      <div className="overflow-x-auto max-h-72 overflow-y-auto">
                        <table className="w-full text-xs">
                          <thead className="sticky top-0 bg-gray-50">
                            <tr className="text-gray-500 uppercase tracking-wide">
                              <th className="text-left px-3 py-2 font-semibold">Work Order ID</th>
                              <th className="text-left px-3 py-2 font-semibold">Customer</th>
                              <th className="text-left px-3 py-2 font-semibold">Plan / Type</th>
                              <th className="text-left px-3 py-2 font-semibold">Status</th>
                              <th className="text-left px-3 py-2 font-semibold">Created</th>
                            </tr>
                          </thead>
                          <tbody className="divide-y divide-surface-border">
                            {filteredWorkOrders.length === 0 ? (
                              <tr><td colSpan={5} className="px-3 py-6 text-center text-gray-400">No assignable Work Orders found</td></tr>
                            ) : filteredWorkOrders.map(w => (
                              <tr key={w.id} onClick={() => setWorkOrderId(w.id)}
                                className={`cursor-pointer transition-colors ${workOrderId === w.id ? 'bg-brand-blue/5' : 'hover:bg-gray-50'}`}>
                                <td className="px-3 py-2 font-mono font-semibold text-brand-blue flex items-center gap-1.5">
                                  {workOrderId === w.id && <Check size={12} className="shrink-0" />} {w.id}
                                </td>
                                <td className="px-3 py-2 text-gray-700">{w.customerName}</td>
                                <td className="px-3 py-2 text-gray-500">{w.plan}</td>
                                <td className="px-3 py-2"><Badge variant="indigo" size="sm">{w.status}</Badge></td>
                                <td className="px-3 py-2 text-gray-500 whitespace-nowrap">{w.createdAt}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  </FormField>
                )}
              </div>
            )}

            {/* ── Step 3: Requirement ── */}
            {step === 3 && workOrder && (
              <div className="space-y-4">
                <div className="rounded-xl border border-surface-border bg-surface p-4">
                  <p className="text-xs font-bold text-gray-800 uppercase tracking-wider mb-3">Hardware / Wire Required — {workOrder.id}</p>
                  {requirement.hardware.length === 0 && requirement.wire.length === 0 ? (
                    <p className="text-sm text-gray-400">No hardware or wire requirement recorded for this Work Order.</p>
                  ) : (
                    <div className="flex flex-wrap gap-2">
                      {requirement.hardware.map((h, i) => (
                        <span key={`h-${i}`} className={`px-3 py-1.5 rounded-full text-xs font-medium ${h.productId ? 'bg-blue-50 text-brand-blue' : 'bg-amber-50 text-amber-700'}`}>
                          {h.name} × {h.requiredQty}
                        </span>
                      ))}
                      {requirement.wire.map((w, i) => (
                        <span key={`w-${i}`} className={`px-3 py-1.5 rounded-full text-xs font-medium ${w.productId ? 'bg-cyan-50 text-cyan-700' : 'bg-amber-50 text-amber-700'}`}>
                          {w.name} × {w.requiredMeters}m
                        </span>
                      ))}
                    </div>
                  )}
                  <p className="text-[11px] text-gray-400 mt-3">This is what's required for the Work Order — the next step lets you pick the actual inventory to issue against it.</p>
                </div>
              </div>
            )}

            {/* ── Step 4: Select Items ── */}
            {step === 4 && (
              <div className="space-y-3">
                {hwLines.length === 0 && wireLines.length === 0 ? (
                  <p className="text-sm text-gray-400 text-center py-6">No requirement lines to fulfill for this Work Order.</p>
                ) : (
                  <>
                    {hwLines.map((l, idx) => (
                      <HardwareLineCard key={`hw-${idx}`} line={l} storeId={store.id}
                        otherLines={hwLines.filter((_, i) => i !== idx)}
                        onChange={patch => updateHwLine(idx, patch)}
                        outOfStock={isHwLineOutOfStock(l, store.id)}
                        showError={attemptedAction === 'step4' && !isHwLineComplete(l, store.id)} />
                    ))}
                    {wireLines.map((l, idx) => (
                      <WireLineCard key={`wire-${idx}`} line={l} storeId={store.id}
                        otherLines={wireLines.filter((_, i) => i !== idx)}
                        onChange={patch => updateWireLine(idx, patch)}
                        outOfStock={isWireLineOutOfStock(l, store.id)}
                        showError={attemptedAction === 'step4' && !isWireLineComplete(l, store.id)} />
                    ))}
                  </>
                )}
              </div>
            )}

            {/* ── Step 5: Confirm ── */}
            {step === 5 && workOrder && (
              <div className="space-y-5">
                <div className="rounded-xl border border-surface-border p-4 space-y-2.5">
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Engineer</span>
                    <span className="font-semibold text-gray-800">{engineer.name}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Work Order</span>
                    <span className="font-mono font-semibold text-gray-800">{workOrder.id}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Customer</span>
                    <span className="font-medium text-gray-800">{workOrder.customerName}</span>
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-500">Branch / Store</span>
                    <span className="font-medium text-gray-800">{branchCode} · {store?.storeName}</span>
                  </div>
                </div>

                <div className="rounded-xl border border-surface-border overflow-hidden">
                  <div className="px-4 py-3 border-b border-surface-border bg-gray-50/60">
                    <p className="text-xs font-bold text-gray-700 uppercase tracking-wide">Issuing</p>
                  </div>
                  <div className="divide-y divide-surface-border">
                    {issuedHwLines.length === 0 && issuedWireLines.length === 0 ? (
                      <p className="px-4 py-6 text-sm text-gray-400 text-center">Nothing selected yet — go back to Select Items.</p>
                    ) : (
                      <>
                        {issuedHwLines.map((l, i) => (
                          <div key={`hw-${i}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
                            <div>
                              <span className="font-medium text-gray-800">{l.productName}</span>
                              {(l.serials.length || l.macs.length) ? (
                                <p className="text-[11px] text-gray-400 font-mono mt-0.5">{[...l.serials, ...l.macs].join(', ')}</p>
                              ) : null}
                            </div>
                            <span className="font-semibold text-gray-700">
                              {liveTrackingType(l.productId) === 'quantity' ? l.assignedQty : l.serials.length + l.macs.length}
                            </span>
                          </div>
                        ))}
                        {issuedWireLines.map((l, i) => (
                          <div key={`wire-${i}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
                            <div>
                              <span className="font-medium text-gray-800">{l.productName}</span>
                              <p className="text-[11px] text-gray-400 font-mono mt-0.5">Drum {l.drumNumber}</p>
                            </div>
                            <span className="font-semibold text-gray-700">{l.assignedMeters} m</span>
                          </div>
                        ))}
                      </>
                    )}
                  </div>
                </div>

                {(outOfStockHwLines.length > 0 || outOfStockWireLines.length > 0) && (
                  <div className="rounded-xl border border-amber-200 bg-amber-50/40 overflow-hidden">
                    <div className="px-4 py-3 border-b border-amber-200">
                      <p className="text-xs font-bold text-amber-800 uppercase tracking-wide flex items-center gap-1.5">
                        <AlertTriangle size={13} /> Not Fulfilled — Out of Stock
                      </p>
                    </div>
                    <div className="divide-y divide-amber-200/60">
                      {outOfStockHwLines.map((l, i) => (
                        <div key={`hw-oos-${i}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <span className="font-medium text-gray-800">{l.productName}</span>
                          <span className="text-amber-700 text-xs">Required {l.requiredQty} · 0 available</span>
                        </div>
                      ))}
                      {outOfStockWireLines.map((l, i) => (
                        <div key={`wire-oos-${i}`} className="flex items-center justify-between px-4 py-2.5 text-sm">
                          <span className="font-medium text-gray-800">{l.productName}</span>
                          <span className="text-amber-700 text-xs">Required {l.requiredMeters}m · 0 available</span>
                        </div>
                      ))}
                    </div>
                    <p className="px-4 py-2.5 text-[11px] text-amber-700 border-t border-amber-200/60">
                      This will be a partial assignment — these lines are left pending and can be issued once stock is received.
                    </p>
                  </div>
                )}

                <FormField label="Remarks" hint="Optional notes about this assignment">
                  <Textarea rows={3} value={remarks} onChange={e => setRemarks(e.target.value)} placeholder="Any notes…" />
                </FormField>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* ── Bottom Bar ───────────────────────────────────────── */}
      <div className="fixed bottom-0 left-0 right-0 bg-white border-t border-surface-border px-6 py-3 flex items-center justify-between z-10">
        <Button variant="secondary" size="sm" icon={<ChevronLeft size={14} />} onClick={goBack}>Back</Button>
        {step < 5 ? (
          <Button size="sm" iconRight={<ChevronRight size={14} />} onClick={goNext}>Next</Button>
        ) : (
          <Button size="sm" icon={<CheckCircle2 size={14} />} onClick={handleAssign}>Assign Inventory</Button>
        )}
      </div>
    </div>
  )
}
